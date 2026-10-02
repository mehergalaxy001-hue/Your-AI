import type { AspectRatio, ImageResult } from "../types/media";
import { mediaRequest } from "./media";

export interface ImageOptions {
  aspectRatio?: AspectRatio;
  quality?: "standard" | "high";
  signal?: AbortSignal;
}

/** Generate an image via POST /api/generate-image. The provider and its key live on the server. */
export function generateImage(prompt: string, options: ImageOptions = {}): Promise<ImageResult> {
  return mediaRequest<ImageResult>(
    "/api/generate-image",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspectRatio: options.aspectRatio, quality: options.quality }),
      signal: options.signal,
    },
    "Image generation failed. Please try again.",
  );
}
