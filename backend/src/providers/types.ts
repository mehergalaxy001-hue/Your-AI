import type { ChatMessage } from "../validation.js";

export interface StreamParams {
  model: string;
  system: string;
  messages: ChatMessage[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
  /** Ground the answer with live web search (provider must support it). */
  webSearch?: boolean;
  onSources?: (sources: Source[]) => void;
}

export interface Source {
  title: string;
  url: string;
}

export interface ChatProvider {
  readonly id: string;
  /** Capabilities beyond plain text chat. */
  readonly supports: { webSearch: boolean; video: boolean };
  stream(params: StreamParams): Promise<void>;
}

export interface PublicError {
  status: number;
  code: string;
  message: string;
}

/** Text attachments are inlined into the prompt for every provider. */
export function withTextAttachments(m: ChatMessage): string {
  let text = m.content;
  for (const a of m.attachments ?? []) {
    if (a.kind === "text") text += `\n\n[Attached file: ${a.name}]\n\`\`\`\n${a.data}\n\`\`\``;
  }
  return text;
}

/** Map provider/network errors to safe user-facing messages (never stack traces or secrets). */
export function toPublicError(err: unknown, provider: string): PublicError {
  const e = err as { status?: number; code?: string; name?: string; cause?: { code?: string } };
  const status = typeof e?.status === "number" ? e.status : undefined;
  const name = provider === "gemini" ? "Gemini" : "OpenAI";

  const msg = err instanceof Error ? err.message : "";
  if (status === 401 || status === 403 || (status === 400 && /api[ _-]?key/i.test(msg)))
    return { status: 401, code: "invalid_api_key", message: `The ${name} API key was rejected. Check your .env configuration.` };
  if (status === 429)
    return { status: 429, code: "rate_limited", message: `${name} rate limit or quota reached. Please wait a moment and try again.` };
  if (status === 404)
    return { status: 400, code: "model_unavailable", message: "The selected model is not available for this API key. Try another model." };
  if (status === 400 || status === 413 || status === 422)
    return { status: 400, code: "bad_request", message: `${name} rejected the request. It may be too long or contain an unsupported attachment.` };
  if (status && status >= 500)
    return { status: 503, code: "provider_unavailable", message: `${name} is temporarily unavailable. Please try again shortly.` };

  const netCode = e?.code ?? e?.cause?.code;
  if (e?.name === "APIConnectionError" || (netCode && /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN/.test(netCode)) || e?.name === "TypeError")
    return { status: 503, code: "network_error", message: `Could not reach ${name}. Check the server's network connection.` };

  return { status: 500, code: "internal_error", message: "Something went wrong while generating a response." };
}
