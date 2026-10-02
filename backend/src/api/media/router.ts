import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { aiProviders } from "../../config/aiProviders.js";
import { getImageProvider } from "../../media/image/index.js";
import { MIME_BY_EXT, mediaPath } from "../../media/store.js";
import { getVideoProvider } from "../../media/video/index.js";

export const mediaRouter = Router();

/** Public capabilities of the configured media providers (no secrets). */
mediaRouter.get("/media-config", (_req, res) => {
  const image = getImageProvider();
  const video = getVideoProvider();
  res.json({
    image: image ? { available: true, provider: image.id, ...image.capabilities } : { available: false },
    video: video ? { available: true, provider: video.id, ...video.capabilities } : { available: false },
    limits: { maxPromptChars: aiProviders.limits.maxPromptChars, maxUploadBytes: aiProviders.limits.maxUploadBytes },
  });
});

/** GET /api/media/:file — serve stored generated media; ?download=1 forces a download. */
mediaRouter.get("/media/:file", (req, res) => {
  const p = mediaPath(req.params.file);
  if (!p || !fs.existsSync(p)) {
    res.status(404).json({ error: { code: "expired", message: "This result has expired or is no longer available." } });
    return;
  }
  const ext = path.extname(p).slice(1);
  res.setHeader("Content-Type", MIME_BY_EXT[ext] ?? "application/octet-stream");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, max-age=86400");
  if (req.query.download) res.setHeader("Content-Disposition", `attachment; filename="galaxy-ai-${req.params.file}"`);
  res.sendFile(p);
});
