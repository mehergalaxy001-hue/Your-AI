/** Errors thrown by media providers carry a safe, user-facing message only. */
export class MediaError extends Error {
  constructor(public code: string, message: string, public status = 502) {
    super(message);
    this.name = "MediaError";
  }
}

/** Map an HTTP status from a provider to a MediaError (never includes provider payloads). */
export function fromStatus(status: number, kind: "Image" | "Video"): MediaError {
  if (status === 401 || status === 403) return new MediaError("invalid_api_key", `The ${kind.toLowerCase()} provider rejected the API key. Check your server configuration.`, 401);
  if (status === 402) return new MediaError("quota_exceeded", `${kind} generation quota or credits are exhausted for this account.`, 402);
  if (status === 429) return new MediaError("rate_limited", `${kind} generation quota or rate limit reached. Please wait and try again, or check your plan.`, 429);
  if (status === 400 || status === 422) return new MediaError("invalid_prompt", `The provider rejected this request. Try rephrasing your prompt.`, 400);
  if (status === 404) return new MediaError("model_unavailable", `The configured ${kind.toLowerCase()} model is not available.`, 503);
  return new MediaError("provider_unavailable", `${kind} generation service is unavailable right now. Please try again.`, 503);
}

export function networkError(e: unknown, kind: "Image" | "Video"): MediaError {
  if (e instanceof MediaError) return e;
  if ((e as Error)?.name === "TimeoutError" || (e as Error)?.name === "AbortError")
    return new MediaError("timeout", `${kind} generation timed out. Please try again.`, 504);
  return new MediaError("network_error", `Could not reach the ${kind.toLowerCase()} generation service.`, 503);
}

export type AspectRatio = "square" | "portrait" | "landscape";
