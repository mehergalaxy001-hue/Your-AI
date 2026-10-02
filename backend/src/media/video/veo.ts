import { MediaError, fromStatus } from "../errors.js";
import type { ProviderJobState, VideoProvider } from "./types.js";

// Override only for self-hosted proxies/testing; defaults to the official Gemini API.
const BASE = process.env.VEO_BASE_URL?.trim() || "https://generativelanguage.googleapis.com/v1beta";
const ORIGIN = new URL(BASE).origin;
const RATIOS = { landscape: "16:9", portrait: "9:16" } as const;

/**
 * Google Veo via the Gemini API (asynchronous long-running operations).
 *  - POST models/{model}:predictLongRunning  → operation name
 *  - GET  {operation}                        → done / response / error
 *  - download generatedSamples[0].video.uri  (requires the API key; done server-side)
 * Supports text-to-video and image-to-video. No progress percentage and no cancel endpoint
 * are offered, so the UI shows an indeterminate state and no Cancel button.
 * Veo requires a billing-enabled Gemini API project.
 */
export function createVeoProvider(apiKey: string, model: string): VideoProvider {
  const headers = { "Content-Type": "application/json", "x-goog-api-key": apiKey };

  return {
    id: "veo",
    capabilities: { aspectRatios: ["landscape", "portrait"], imageToVideo: true, cancel: false, progress: false },

    async start(prompt, options) {
      const instance: Record<string, unknown> = { prompt };
      if (options.image) instance.image = { bytesBase64Encoded: options.image.data.toString("base64"), mimeType: options.image.mime };
      const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:predictLongRunning`, {
        method: "POST",
        headers,
        body: JSON.stringify({ instances: [instance], parameters: { aspectRatio: RATIOS[options.aspectRatio ?? "landscape"] } }),
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 429)
        throw new MediaError("quota_exceeded", "Video generation quota reached. Veo requires a Gemini API key with billing enabled (free-tier keys have no Veo quota).", 429);
      if (!res.ok) throw fromStatus(res.status, "Video");
      const body = (await res.json()) as { name?: string };
      if (!body.name || !/^models\/[\w.-]+\/operations\/[\w-]+$/.test(body.name))
        throw new MediaError("generation_failed", "Video generation could not be started. Please try again.");
      return body.name;
    },

    async poll(name): Promise<ProviderJobState> {
      const res = await fetch(`${BASE}/${name}`, { headers, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw fromStatus(res.status, "Video");
      const op = (await res.json()) as {
        done?: boolean;
        error?: { code?: number; message?: string };
        response?: { generateVideoResponse?: { generatedSamples?: { video?: { uri?: string } }[]; raiMediaFilteredReasons?: string[] } };
      };
      if (!op.done) return { state: "running" };
      if (op.error) return { state: "failed", code: "generation_failed", message: "Video generation failed. Please try again." };
      const gen = op.response?.generateVideoResponse;
      const uri = gen?.generatedSamples?.[0]?.video?.uri;
      if (!uri) {
        if (gen?.raiMediaFilteredReasons?.length)
          return { state: "failed", code: "invalid_prompt", message: "The video was blocked by the provider's safety filters. Try a different prompt." };
        return { state: "failed", code: "generation_failed", message: "Video generation finished without a result. Please try again." };
      }
      if (new URL(uri).origin !== ORIGIN)
        return { state: "failed", code: "generation_failed", message: "Video generation returned an unexpected result." };
      const file = await fetch(uri, { headers: { "x-goog-api-key": apiKey }, redirect: "follow", signal: AbortSignal.timeout(120_000) });
      if (!file.ok) throw fromStatus(file.status, "Video");
      return { state: "succeeded", video: { data: Buffer.from(await file.arrayBuffer()), mime: "video/mp4" } };
    },
  };
}
