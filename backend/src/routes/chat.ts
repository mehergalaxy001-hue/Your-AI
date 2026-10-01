import { Router } from "express";
import { config } from "../config.js";
import { chatRequestSchema } from "../validation.js";
import { friendlyError, streamCompletion } from "../services/openai.js";

export const chatRouter = Router();

/** Public, non-secret configuration for the UI. */
chatRouter.get("/config", (_req, res) => {
  res.json({
    configured: Boolean(config.apiKey),
    models: config.models,
    defaultModel: config.defaultModel,
    limits: config.limits,
  });
});

/**
 * POST /api/chat — streams the assistant reply as Server-Sent Events.
 * Events: {type:"delta",text} | {type:"error",code,message} | {type:"done"}
 */
chatRouter.post("/chat", async (req, res) => {
  if (!config.apiKey) {
    res.status(503).json({
      error: {
        code: "missing_api_key",
        message: "OPENAI_API_KEY is not set. Add it to the .env file in the project root and restart the server.",
      },
    });
    return;
  }

  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.issues[0]?.message ?? "Invalid request" } });
    return;
  }
  if (!config.models.includes(parsed.data.model)) {
    res.status(400).json({ error: { code: "invalid_model", message: "That model is not enabled on this server." } });
    return;
  }

  const abort = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) abort.abort(); // client pressed Stop or disconnected
  });

  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    await streamCompletion(parsed.data, abort.signal, (text) => send({ type: "delta", text }));
    send({ type: "done" });
  } catch (err) {
    if (abort.signal.aborted) return;
    const e = friendlyError(err);
    console.error(`[chat] ${e.code}:`, err instanceof Error ? err.message : err);
    send({ type: "error", code: e.code, message: e.message });
  } finally {
    if (!res.writableEnded) res.end();
  }
});
