import type { AspectRatio } from "../errors.js";

export interface VideoOptions {
  aspectRatio?: Exclude<AspectRatio, "square">;
  /** Optional start frame for image-to-video. */
  image?: { data: Buffer; mime: string };
}

export type ProviderJobState =
  | { state: "running"; progress?: number }
  | { state: "succeeded"; video: { data: Buffer; mime: string } }
  | { state: "failed"; code: string; message: string };

export interface VideoCapabilities {
  aspectRatios: Exclude<AspectRatio, "square">[];
  imageToVideo: boolean;
  cancel: boolean;
  /** True only if the provider reports real progress percentages. */
  progress: boolean;
  note?: string;
}

export interface VideoProvider {
  id: string;
  capabilities: VideoCapabilities;
  /** Submit a job; returns the provider's job/operation id. */
  start(prompt: string, options: VideoOptions): Promise<string>;
  /** Poll a job. On success, returns the downloaded video bytes. */
  poll(providerJobId: string): Promise<ProviderJobState>;
}
