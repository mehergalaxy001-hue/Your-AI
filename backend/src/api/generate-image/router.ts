import { Router } from "express";
import { z } from "zod";
import { aiProviders } from "../../config/aiProviders.js";
import { getImageProvider } from "../../media/image/index.js";
import { MediaError, networkError } from "../../media/errors.js";
import { saveMedia } from "../../media/store.js";
import { rateLimit } from "../../rateLimit.js";
import { requireAuth, userKey } from "../../auth.js";

export const imageRouter = Router();

const schema = z.object({
  prompt: z.string().trim().min(3, "Please describe the image (at least 3 characters).").max(aiProviders.limits.maxPromptChars, "Prompt is too long."),
  aspectRatio: z.enum(["square", "portrait", "landscape"]).optional(),
  quality: z.enum(["standard", "high"]).optional(),
});

/** POST /api/generate-image { prompt, aspectRatio?, quality? } → { id, url, mime, size } */
imageRouter.post("/generate-image", requireAuth, rateLimit(aiProviders.limits.perMinute), async (req, res) => {
  const provider = getImageProvider();
  if (!provider) {
    res.status(503).json({ error: { code: "missing_api_key", message: "Image generation is not configured on the server." } });
    return;
  }
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_prompt", message: parsed.error.issues[0]?.message ?? "Invalid request." } });
    return;
  }
  const { prompt, aspectRatio, quality } = parsed.data;
  const caps = provider.capabilities;
  // Only forward options the provider truly supports.
  const options = {
    aspectRatio: aspectRatio && caps.aspectRatios.includes(aspectRatio) ? aspectRatio : undefined,
    quality: quality && caps.qualities.includes(quality) ? quality : undefined,
  };

  const abort = new AbortController();
  res.on("close", () => !res.writableEnded && abort.abort());
  const timeout = setTimeout(() => abort.abort(new DOMException("timeout", "TimeoutError")), 120_000);
  try {
    const img = await provider.generate(prompt, options, abort.signal);
    const saved = await saveMedia(img.data, img.mime, req.uid ? userKey(req.uid) : undefined);
    res.json({ id: saved.file.split(".")[0], url: saved.url, mime: saved.mime, size: saved.size });
  } catch (e) {
    if (res.writableEnded || res.destroyed) return;
    const err = e instanceof MediaError ? e : networkError(abort.signal.aborted ? Object.assign(new Error(), { name: "TimeoutError" }) : e, "Image");
    console.error(`[image] ${provider.id} ${err.code}:`, e instanceof Error ? e.message : e);
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
  } finally {
    clearTimeout(timeout);
  }
});
