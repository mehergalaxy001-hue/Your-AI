import { MediaError, fromStatus } from "../errors.js";
import { sniffImage } from "../store.js";
import type { ImageProvider } from "./types.js";

const RATIOS = { square: "1:1", portrait: "3:4", landscape: "4:3" } as const;

/**
 * Google Gemini native image generation via the Gemini API (generateContent with IMAGE modality).
 * Note: image models generally require a paid (billing-enabled) Gemini API tier.
 * Supports aspect ratio via imageConfig.aspectRatio. Quality is not exposed.
 */
export function createGeminiImageProvider(apiKey: string, model: string): ImageProvider {
  return {
    id: "gemini",
    capabilities: { aspectRatios: ["square", "portrait", "landscape"], qualities: [] },
    async generate(prompt, options, signal) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: RATIOS[options.aspectRatio ?? "square"] } },
        }),
        signal,
      });
      if (!res.ok) throw fromStatus(res.status, "Image");
      const body = (await res.json()) as {
        candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
        promptFeedback?: { blockReason?: string };
      };
      if (body.promptFeedback?.blockReason)
        throw new MediaError("invalid_prompt", "This prompt was blocked by the provider's safety filters. Try a different prompt.", 400);
      const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) throw new MediaError("generation_failed", "Image generation failed. Please try again.");
      const data = Buffer.from(part.inlineData.data, "base64");
      const mime = sniffImage(data);
      if (!mime) throw new MediaError("generation_failed", "Image generation failed. Please try again.");
      return { data, mime };
    },
  };
}
