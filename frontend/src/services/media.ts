import type { MediaConfig } from "../types/media";
import { authFetch } from "../lib/authFetch";

/** Error with a safe, user-facing message coming from the Galaxy AI server. */
export class MediaApiError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "MediaApiError";
  }
}

/** Shared JSON request helper for media endpoints. */
export async function mediaRequest<T>(url: string, init?: RequestInit, fallback = "Something went wrong. Please try again."): Promise<T> {
  let res: Response;
  try {
    res = await authFetch(url, init);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new MediaApiError(navigator.onLine ? "Can't reach the Galaxy AI server. Please try again." : "You appear to be offline.", "network_error");
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: { code?: string; message?: string } }) | null;
  if (!res.ok || !body) {
    const code = body?.error?.code ?? `http_${res.status}`;
    throw new MediaApiError(body?.error?.message ?? (res.status === 429 ? "Too many requests. Please wait a moment." : fallback), code);
  }
  return body;
}

export const fetchMediaConfig = () => mediaRequest<MediaConfig>("/api/media-config");
