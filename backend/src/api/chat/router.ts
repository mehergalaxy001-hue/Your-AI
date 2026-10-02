import { Router } from "express";
import { config } from "../../config.js";
import { DEFAULT_TIER, TIERS, resolveModel } from "../../models.js";
import { getProvider } from "../../providers/index.js";
import { toPublicError } from "../../providers/types.js";
import { rateLimit } from "../../rateLimit.js";
import { chatRequestSchema } from "../../validation.js";

export const chatRouter = Router();

/** Public (non-secret) configuration consumed by the UI. */
chatRouter.get("/config", (_req, res) => {
  res.json({
    configured: Boolean(getProvider()),
    provider: config.provider,
    models: TIERS,
    defaultModel: DEFAULT_TIER,
    limits: config.limits,
  });
});

/**
 * POST /api/chat  { model, messages: [{role, content, attachments?}] }
 * Streams Server-Sent Events: {type:"delta",text} | {type:"error",code,message} | {type:"done"}
 */
chatRouter.post("/chat", rateLimit(config.rateLimitPerMinute), async (req, res) => {
  const provider = getProvider();
  if (!provider) {
    res.status(503).json({
      error: {
        code: "missing_api_key",
        message: "No AI provider is configured. Set GEMINI_API_KEY (or OPENAI_API_KEY) in the .env file and restart the server.",
      },
    });
    return;
  }

  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.issues[0]?.message ?? "Invalid request" } });
    return;
  }
  const hasVideo = parsed.data.messages.some((m) => m.attachments?.some((a) => a.kind === "video"));
  if (parsed.data.webSearch && !provider.supports.webSearch) {
    res.status(400).json({ error: { code: "unsupported", message: "Web search is only available with the Gemini provider." } });
    return;
  }
  if (hasVideo && !provider.supports.video) {
    res.status(400).json({ error: { code: "unsupported", message: "Video attachments are only supported with the Gemini provider." } });
    return;
  }
  const model = resolveModel(parsed.data.model);
  if (!model) {
    res.status(400).json({ error: { code: "invalid_model", message: "Unknown model selection." } });
    return;
  }

  const abort = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) abort.abort(); // client pressed Stop / disconnected
  });

  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  // Keep proxies from timing out while the model is thinking.
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
  // Hard cap on time-to-first-token so a stalled provider can't hold the request forever.
  let timedOut = false;
  const firstTokenTimer = setTimeout(() => {
    timedOut = true;
    abort.abort();
  }, 75_000);

  let produced = 0;
  try {
    await provider.stream({
      model,
      system: config.systemPrompt,
      messages: parsed.data.messages,
      signal: abort.signal,
      webSearch: parsed.data.webSearch,
      onSources: (sources) => send({ type: "sources", sources }),
      onDelta: (text) => {
        clearTimeout(firstTokenTimer);
        produced += text.length;
        send({ type: "delta", text });
      },
    });
    if (timedOut) {
      send({ type: "error", code: "timeout", message: "The AI took too long to respond. Please try again or switch models." });
      return;
    }
    if (abort.signal.aborted) return;
    if (produced === 0) send({ type: "error", code: "empty_response", message: "The model returned an empty response. Try rephrasing or regenerating." });
    else send({ type: "done" });
  } catch (err) {
    if (timedOut) {
      send({ type: "error", code: "timeout", message: "The AI took too long to respond. Please try again or switch models." });
      return;
    }
    if (abort.signal.aborted) return;
    const e = toPublicError(err, provider.id);
    if (parsed.data.webSearch && e.code === "rate_limited")
      e.message = "Web search quota reached for this API key. Google Search grounding may require a billing-enabled Gemini plan. Try again later or turn off Web search.";
    console.error(`[chat] ${provider.id}/${model} ${e.code}:`, err instanceof Error ? err.message : err);
    send({ type: "error", code: e.code, message: e.message });
  } finally {
    clearInterval(heartbeat);
    clearTimeout(firstTokenTimer);
    if (!res.writableEnded) res.end();
  }
});
