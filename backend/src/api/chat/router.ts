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

  let produced = 0;
  try {
    await provider.stream({
      model,
      system: config.systemPrompt,
      messages: parsed.data.messages,
      signal: abort.signal,
      onDelta: (text) => {
        produced += text.length;
        send({ type: "delta", text });
      },
    });
    if (abort.signal.aborted) return;
    if (produced === 0) send({ type: "error", code: "empty_response", message: "The model returned an empty response. Try rephrasing or regenerating." });
    else send({ type: "done" });
  } catch (err) {
    if (abort.signal.aborted) return;
    const e = toPublicError(err, provider.id);
    console.error(`[chat] ${provider.id}/${model} ${e.code}:`, err instanceof Error ? err.message : err);
    send({ type: "error", code: e.code, message: e.message });
  } finally {
    clearInterval(heartbeat);
    if (!res.writableEnded) res.end();
  }
});
