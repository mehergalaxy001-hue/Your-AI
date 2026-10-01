import type { Attachment, Message, ServerConfig } from "../types";

export class ApiError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

export async function fetchConfig(): Promise<ServerConfig> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new ApiError("Could not reach the Your-AI server.", "server_unreachable");
  return res.json();
}

type WireAttachment = { kind: Attachment["kind"]; name: string; data: string };
type WireMessage = { role: Message["role"]; content: string; attachments?: WireAttachment[] };

/** Convert stored messages into the payload the backend accepts. */
export function toWire(messages: Message[], maxMessages: number): WireMessage[] {
  return messages
    .filter((m) => !m.error && (m.content.trim() || m.attachments?.length))
    .slice(-maxMessages)
    .map((m) => {
      const atts = (m.attachments ?? []).filter((a): a is Attachment & { data: string } => !!a.data);
      return {
        role: m.role,
        content: m.content,
        ...(m.role === "user" && atts.length ? { attachments: atts.map(({ kind, name, data }) => ({ kind, name, data })) } : {}),
      };
    });
}

/** POST /api/chat and invoke onDelta for every streamed text chunk. */
export async function streamChat(opts: {
  model: string;
  messages: WireMessage[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
}): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: opts.model, messages: opts.messages }),
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("Could not reach the Your-AI server. Is the backend running?", "server_unreachable");
  }

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error?.message ?? `Request failed (${res.status}).`, body?.error?.code ?? "http_error");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;
  while (!done) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = raw.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const evt = JSON.parse(line.slice(5).trim());
      if (evt.type === "delta") opts.onDelta(evt.text);
      else if (evt.type === "error") throw new ApiError(evt.message, evt.code);
      else if (evt.type === "done") done = true;
    }
  }
  if (!done) throw new ApiError("The connection closed before the response finished.", "incomplete");
}
