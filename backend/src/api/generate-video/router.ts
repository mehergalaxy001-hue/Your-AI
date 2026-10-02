import { Router } from "express";
import { z } from "zod";
import { aiProviders } from "../../config/aiProviders.js";
import { MediaError } from "../../media/errors.js";
import { sniffImage } from "../../media/store.js";
import { getJob, getVideoProvider, startJob } from "../../media/video/index.js";
import { rateLimit } from "../../rateLimit.js";
import { requireAuth, userKey } from "../../auth.js";

export const videoRouter = Router();

const schema = z.object({
  prompt: z.string().trim().min(3, "Please describe the video (at least 3 characters).").max(aiProviders.limits.maxPromptChars, "Prompt is too long."),
  aspectRatio: z.enum(["landscape", "portrait"]).optional(),
  image: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Unsupported image format. Use PNG, JPG or WEBP.")
    .max(Math.ceil((aiProviders.limits.maxUploadBytes * 4) / 3) + 64, "Image is too large (max 8 MB).")
    .optional(),
});

/** POST /api/generate-video { prompt, aspectRatio?, image? } → job */
videoRouter.post("/generate-video", requireAuth, rateLimit(aiProviders.limits.perMinute), async (req, res) => {
  const provider = getVideoProvider();
  if (!provider) {
    res.status(503).json({ error: { code: "missing_api_key", message: "Video generation is not configured on the server." } });
    return;
  }
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_prompt", message: parsed.error.issues[0]?.message ?? "Invalid request." } });
    return;
  }
  const { prompt, aspectRatio, image } = parsed.data;
  let img: { data: Buffer; mime: string } | undefined;
  if (image) {
    if (!provider.capabilities.imageToVideo) {
      res.status(400).json({ error: { code: "unsupported", message: "This video provider does not support image input." } });
      return;
    }
    const data = Buffer.from(image.split(",")[1], "base64");
    const mime = sniffImage(data);
    if (!mime) {
      res.status(400).json({ error: { code: "unsupported_format", message: "That file is not a valid PNG, JPG or WEBP image." } });
      return;
    }
    if (data.length > aiProviders.limits.maxUploadBytes) {
      res.status(413).json({ error: { code: "file_too_large", message: "Image is too large (max 8 MB)." } });
      return;
    }
    img = { data, mime };
  }
  try {
    const job = await startJob(prompt, { aspectRatio, image: img }, req.uid ? userKey(req.uid) : undefined);
    res.status(202).json(job);
  } catch (e) {
    const err = e instanceof MediaError ? e : new MediaError("generation_failed", "Video generation failed. Please try again.");
    console.error(`[video] start ${err.code}:`, e instanceof Error ? e.message : e);
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
});

/** GET /api/generate-video/:jobId → job status (polls the provider server-side). */
videoRouter.get("/generate-video/:jobId", requireAuth, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/.test(String(req.params.jobId))) {
    res.status(400).json({ error: { code: "invalid_job", message: "Invalid job id." } });
    return;
  }
  const job = await getJob(String(req.params.jobId), req.uid ? userKey(req.uid) : undefined);
  if (!job) {
    res.status(404).json({ error: { code: "job_not_found", message: "This video job no longer exists (it may have expired or the server restarted)." } });
    return;
  }
  res.json(job);
});
