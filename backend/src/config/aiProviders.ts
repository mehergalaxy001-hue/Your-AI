import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

/**
 * Central configuration for media-generation providers.
 * Change providers/models here or through environment variables:
 *
 *   IMAGE_PROVIDER = pollinations | gemini     (default: pollinations)
 *   IMAGE_API_KEY  = provider key (optional for pollinations; gemini falls back to GEMINI_API_KEY)
 *   IMAGE_MODEL    = override provider model
 *   VIDEO_PROVIDER = veo                        (default: veo)
 *   VIDEO_API_KEY  = provider key (veo falls back to GEMINI_API_KEY)
 *   VIDEO_MODEL    = override provider model
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const env = (k: string) => process.env[k]?.trim() ?? "";
const secret = (k: string) => {
  const v = env(k);
  return v === "" || /^(your-|replace-me)/i.test(v) ? "" : v;
};

export type ImageProviderId = "pollinations" | "gemini";
export type VideoProviderId = "veo";

const imageProvider = (env("IMAGE_PROVIDER").toLowerCase() || "pollinations") as ImageProviderId;
const videoProvider = (env("VIDEO_PROVIDER").toLowerCase() || "veo") as VideoProviderId;

export const IMAGE_DEFAULT_MODELS: Record<ImageProviderId, string> = {
  pollinations: "flux", // gen.pollinations.ai model (used when IMAGE_API_KEY is set)
  gemini: "gemini-2.5-flash-image",
};

export const VIDEO_DEFAULT_MODELS: Record<VideoProviderId, string> = {
  veo: "veo-3.1-fast-generate-preview",
};

export const aiProviders = {
  image: {
    provider: imageProvider,
    apiKey: secret("IMAGE_API_KEY") || (imageProvider === "gemini" ? config.keys.gemini : ""),
    model: env("IMAGE_MODEL") || IMAGE_DEFAULT_MODELS[imageProvider] || "",
  },
  video: {
    provider: videoProvider,
    apiKey: secret("VIDEO_API_KEY") || (videoProvider === "veo" ? config.keys.gemini : ""),
    model: env("VIDEO_MODEL") || VIDEO_DEFAULT_MODELS[videoProvider] || "",
  },
  media: {
    dir: env("MEDIA_DIR") || path.resolve(here, "../../data/media"),
    retentionHours: Number(env("MEDIA_RETENTION_HOURS") || 72),
    maxFiles: 300,
  },
  limits: {
    maxPromptChars: 2000,
    maxUploadBytes: 8 * 1024 * 1024,
    perMinute: Number(env("MEDIA_RATE_LIMIT_PER_MINUTE") || 10),
  },
};
