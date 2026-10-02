export type CreationType = "image" | "video";
export type AspectRatio = "square" | "portrait" | "landscape";

/** A saved creation. Only metadata + a server URL is stored (never binary data). */
export interface Creation {
  id: string;
  type: CreationType;
  prompt: string;
  createdAt: number;
  resultUrl: string;
  mime?: string;
}

export interface MediaConfig {
  image: { available: false } | { available: true; provider: string; aspectRatios: AspectRatio[]; qualities: ("standard" | "high")[]; note?: string };
  video:
    | { available: false }
    | { available: true; provider: string; aspectRatios: Exclude<AspectRatio, "square">[]; imageToVideo: boolean; cancel: boolean; progress: boolean; note?: string };
  limits: { maxPromptChars: number; maxUploadBytes: number };
}

export interface ImageResult {
  id: string;
  url: string;
  mime: string;
  size: number;
}

export interface VideoJob {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  /** Real provider progress (0-100) or null when the provider doesn't report it. */
  progress: number | null;
  createdAt: number;
  result?: { url: string; mime: string; size: number };
  error?: { code: string; message: string };
}
