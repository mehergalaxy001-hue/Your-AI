import fs from "node:fs";
import path from "node:path";
import express, { type ErrorRequestHandler } from "express";
import { config } from "./config.js";
import { chatRouter } from "./api/chat/router.js";

const app = express();
app.set("trust proxy", "loopback");
app.disable("x-powered-by");
// Large enough for a few base64 images; validation enforces per-item limits.
app.use(express.json({ limit: "40mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", chatRouter);
app.use("/api", (_req, res) => res.status(404).json({ error: { code: "not_found", message: "Not found" } }));

// In production, serve the built frontend from the same origin.
if (fs.existsSync(path.join(config.staticDir, "index.html"))) {
  app.use(express.static(config.staticDir));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(config.staticDir, "index.html")));
}

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err?.status === "number" ? err.status : 500;
  if (status >= 500) console.error("[server]", err);
  const message =
    err?.type === "entity.too.large" ? "Request is too large. Try smaller attachments." :
    status < 500 ? "Invalid request body." : "Internal server error.";
  if (!res.headersSent) res.status(status).json({ error: { code: "request_error", message } });
};
app.use(onError);

app.listen(config.port, () => {
  console.log(`Galaxy AI API listening on http://localhost:${config.port}`);
  if (config.provider) console.log(`AI provider: ${config.provider}`);
  else console.warn("No GEMINI_API_KEY / OPENAI_API_KEY set — chat requests will return a setup error.");
});
