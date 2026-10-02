import type { AspectRatio, VideoJob } from "../types/media";
import { MediaApiError, mediaRequest } from "./media";

export interface VideoOptions {
  aspectRatio?: Exclude<AspectRatio, "square">;
  /** data: URL of a PNG/JPEG/WEBP start image (image-to-video). */
  image?: string;
}

/** Submit a video generation job (POST /api/generate-video). */
export function startVideoGeneration(prompt: string, options: VideoOptions = {}): Promise<VideoJob> {
  return mediaRequest<VideoJob>(
    "/api/generate-video",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspectRatio: options.aspectRatio, image: options.image }),
    },
    "Video generation failed. Please try again.",
  );
}

/** Check job status (GET /api/generate-video/:jobId). The server polls the provider. */
export function getVideoGenerationStatus(jobId: string, signal?: AbortSignal): Promise<VideoJob> {
  return mediaRequest<VideoJob>(`/api/generate-video/${encodeURIComponent(jobId)}`, { signal });
}

/** Return the finished video's URL, or throw if the job hasn't produced one. */
export async function getGeneratedVideo(jobId: string): Promise<{ url: string; mime: string }> {
  const job = await getVideoGenerationStatus(jobId);
  if (job.status !== "succeeded" || !job.result) throw new MediaApiError("The video is not ready yet.", "not_ready");
  return job.result;
}
