import type { Attachment, Limits, Message, ServerConfig } from "../types";

export class ApiError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchConfig(): Promise<ServerConfig> {
  let res: Response;
  try {
    res = await fetch("/api/config");
  } catch {
    throw new ApiError("Can't reach the Galaxy AI server. Check that the backend is running.", "server_unreachable");
  }
  if (!res.ok) throw new ApiError(`The Galaxy AI server responded with an error (${res.status}).`, "server_error");
  return res.json() as Promise<ServerConfig>;
}

type WireAttachment = { kind: Attachment["kind"]; name: string; data: string };
export type WireMessage = { role: Message["role"]; content: string; attachments?: WireAttachment[] };
export type { Source } from "../types";

/**
 * Build the context sent to the model: drop failed/empty turns, then keep
 * the most recent messages that fit within the server's limits.
 */
export function buildContext(messages: Message[], limits: Limits): WireMessage[] {
  const usable = messages.filter((m) => !m.error && (m.content.trim() || m.attachments?.some((a) => a.data)));
  const out: WireMessage[] = [];
  let chars = 0;
  for (let i = usable.length - 1; i >= 0 && out.length < limits.maxMessages; i--) {
    const m = usable[i];
    if (chars + m.content.length > limits.maxTotalChars && out.length > 0) break;
    chars += m.content.length;
    // Only resend attachments for the latest user turn to keep requests small.
    const atts = i === usable.length - 1 ? (m.attachments ?? []).filter((a): a is Attachment & { data: string } => !!a.data) : [];
    let content = m.content;
    if (i !== usable.length - 1 && m.attachments?.length) {
      const names = m.attachments.map((a) => a.name).join(", ");
      content = `${content}\n\n[Earlier attachment(s): ${names}]`.trim();
    }
    out.unshift({
      role: m.role,
      content,
      ...(m.role === "user" && atts.length ? { attachments: atts.map(({ kind, name, data }) => ({ kind, name, data })) } : {}),
    });
  }
  // Context must start with a user message.
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

// Heartbeat comments do not count as activity, so a silent provider can never hang the UI.
const IDLE_TIMEOUT_MS = 90_000;

/** POST /api/chat and invoke onDelta for every streamed chunk. Never hangs forever. */
export async function streamChat(opts: {
  model: string;
  messages: WireMessage[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
  webSearch?: boolean;
  onSources?: (sources: { title: string; url: string }[]) => void;
}): Promise<void> {
  const ctrl = new AbortController();
  let timedOut = false;
  let timer = 0;
  const arm = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, IDLE_TIMEOUT_MS);
  };
  const forward = () => ctrl.abort();
  opts.signal.addEventListener("abort", forward);
  arm();

  try {
    let res: Response;
    try {
      res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: opts.model, messages: opts.messages, ...(opts.webSearch ? { webSearch: true } : {}) }),
        signal: ctrl.signal,
      });
    } catch (e) {
      if (timedOut) throw new ApiError("The server took too long to respond. Please try again.", "timeout");
      if ((e as Error).name === "AbortError") throw e;
      throw new ApiError(
        navigator.onLine ? "Can't reach the Galaxy AI server. Check that the backend is running." : "You appear to be offline. Check your internet connection.",
        "network_error",
      );
    }

    if (!res.ok || !res.body) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string; code?: string } } | null;
      const fallback = res.status === 429 ? "Too many requests. Please wait a moment." : res.status >= 500 ? "The AI service is unavailable right now." : `Request failed (${res.status}).`;
      throw new ApiError(body?.error?.message ?? fallback, body?.error?.code ?? `http_${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;
    try {
      while (!done) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const line = raw.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue; // heartbeat comment
          arm();
          let evt: { type?: string; text?: string; code?: string; message?: string; sources?: { title: string; url: string }[] };
          try {
            evt = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (evt.type === "delta" && evt.text) opts.onDelta(evt.text);
          else if (evt.type === "error") throw new ApiError(evt.message ?? "The AI returned an error.", evt.code ?? "error");
          else if (evt.type === "sources" && Array.isArray(evt.sources)) opts.onSources?.(evt.sources);
          else if (evt.type === "done") done = true;
        }
      }
    } catch (e) {
      if (timedOut) throw new ApiError("The response stalled and was stopped. Please try again.", "timeout");
      if (e instanceof ApiError || (e as Error).name === "AbortError") throw e;
      throw new ApiError("The connection was interrupted. Please try again.", "network_error");
    }
    if (!done) throw new ApiError("The connection closed before the response finished.", "incomplete");
  } finally {
    window.clearTimeout(timer);
    opts.signal.removeEventListener("abort", forward);
  }
}
