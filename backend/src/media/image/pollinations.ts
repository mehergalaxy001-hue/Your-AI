import { MediaError, fromStatus } from "../errors.js";
import { sniffImage } from "../store.js";
import type { ImageProvider } from "./types.js";

const SIZES = {
  square: [1024, 1024],
  portrait: [768, 1024],
  landscape: [1024, 768],
} as const;

/**
 * Pollinations.ai image generation (https://pollinations.ai).
 * - With IMAGE_API_KEY: uses the authenticated gen.pollinations.ai API and IMAGE_MODEL.
 * - Without a key: uses the public anonymous endpoint (rate-limited, may add a watermark,
 *   model chosen by the service). Free access may change; configure a key for reliability.
 * Width/height are honoured, so aspect ratio is supported. There is no quality parameter.
 */
export function createPollinationsProvider(apiKey: string, model: string): ImageProvider {
  return {
    id: "pollinations",
    capabilities: {
      aspectRatios: ["square", "portrait", "landscape"],
      qualities: [],
      note: apiKey ? undefined : "Using Pollinations' free anonymous tier (rate-limited; images may include a small watermark).",
    },
    async generate(prompt, options, signal) {
      const [w, h] = SIZES[options.aspectRatio ?? "square"];
      const params = new URLSearchParams({ width: String(w), height: String(h), nologo: "true", seed: String(Math.floor(Math.random() * 1e9)) });
      const encoded = encodeURIComponent(prompt);
      let url: string;
      const headers: Record<string, string> = {};
      if (apiKey) {
        params.set("model", model);
        url = `https://gen.pollinations.ai/image/${encoded}?${params}`;
        headers.Authorization = `Bearer ${apiKey}`;
      } else {
        url = `https://image.pollinations.ai/prompt/${encoded}?${params}`;
      }
      const res = await fetch(url, { headers, signal });
      if (!res.ok) throw fromStatus(res.status, "Image");
      const data = Buffer.from(await res.arrayBuffer());
      const mime = sniffImage(data);
      if (!mime) throw new MediaError("generation_failed", "Image generation failed. Please try again.");
      return { data, mime };
    },
  };
}
