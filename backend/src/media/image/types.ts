import type { AspectRatio } from "../errors.js";

export interface ImageOptions {
  aspectRatio?: AspectRatio;
  quality?: "standard" | "high";
}

export interface ImageResult {
  data: Buffer;
  mime: string;
}

/** What the selected provider genuinely supports (the UI only shows these controls). */
export interface ImageCapabilities {
  aspectRatios: AspectRatio[];
  qualities: ("standard" | "high")[];
  note?: string;
}

export interface ImageProvider {
  id: string;
  capabilities: ImageCapabilities;
  generate(prompt: string, options: ImageOptions, signal: AbortSignal): Promise<ImageResult>;
}
