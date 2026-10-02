import type { Attachment, AttachmentKind, Conversation, Message } from "../types";
import { titleFrom, uid } from "./format";

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const str = (x: unknown, max = 1_000_000): string | undefined => (typeof x === "string" ? x.slice(0, max) : undefined);
const num = (x: unknown): number | undefined => (typeof x === "number" && Number.isFinite(x) ? x : undefined);
const KINDS: AttachmentKind[] = ["image", "video", "text", "pdf"];

function normalizeAttachment(x: unknown): Attachment | null {
  if (!isObj(x)) return null;
  const kind = KINDS.includes(x.kind as AttachmentKind) ? (x.kind as AttachmentKind) : null;
  const name = str(x.name, 255);
  if (!kind || !name) return null;
  const data = str(x.data, 20_000_000);
  // Only allow safe data URLs for binary kinds.
  const safeData =
    data && (kind === "text" || (kind === "image" && /^data:image\/(png|jpeg|webp|gif);base64,/.test(data)) || (kind === "pdf" && data.startsWith("data:application/pdf;base64,")) || (kind === "video" && /^data:video\/(mp4|webm|quicktime);base64,/.test(data)))
      ? data
      : undefined;
  return { id: str(x.id, 100) ?? uid(), name, mime: str(x.mime, 100) ?? str(x.type, 100) ?? "", size: num(x.size) ?? 0, kind, ...(safeData ? { data: safeData } : {}) };
}

function normalizeMessage(x: unknown): Message | null {
  if (!isObj(x)) return null;
  if (x.role !== "user" && x.role !== "assistant") return null;
  const content = str(x.content) ?? "";
  const m: Message = {
    id: str(x.id, 100) ?? uid(),
    role: x.role,
    content,
    timestamp: num(x.timestamp) ?? num(x.createdAt) ?? Date.now(),
  };
  if (Array.isArray(x.attachments)) {
    const atts = x.attachments.map(normalizeAttachment).filter((a): a is Attachment => !!a);
    if (atts.length) m.attachments = atts;
  }
  if (typeof x.model === "string") m.model = x.model.slice(0, 60);
  if (typeof x.error === "string") m.error = { code: "error", message: x.error.slice(0, 500) };
  else if (isObj(x.error) && typeof x.error.message === "string")
    m.error = { code: str(x.error.code, 60) ?? "error", message: x.error.message.slice(0, 500) };
  if (x.stopped === true) m.stopped = true;
  if (x.feedback === "up" || x.feedback === "down") m.feedback = x.feedback;
  if (x.webSearch === true) m.webSearch = true;
  if (Array.isArray(x.sources)) {
    const sources = x.sources
      .filter((s): s is { title: string; url: string } => isObj(s) && typeof s.url === "string" && /^https?:\/\//.test(s.url) && typeof s.title === "string")
      .slice(0, 10)
      .map((s) => ({ title: s.title.slice(0, 200), url: s.url.slice(0, 2000) }));
    if (sources.length) m.sources = sources;
  }
  return m;
}

/** Validate & coerce untrusted data (localStorage or imports) into a Conversation. */
export function normalizeConversation(x: unknown): Conversation | null {
  if (!isObj(x) || !Array.isArray(x.messages)) return null;
  const messages = x.messages.map(normalizeMessage).filter((m): m is Message => !!m);
  const createdAt = num(x.createdAt) ?? messages[0]?.timestamp ?? Date.now();
  const firstUser = messages.find((m) => m.role === "user")?.content ?? "";
  return {
    id: str(x.id, 100) || uid(),
    title: str(x.title, 200)?.trim() || titleFrom(firstUser),
    createdAt,
    updatedAt: num(x.updatedAt) ?? createdAt,
    messages,
  };
}

export const EXPORT_FORMAT = "galaxy-ai.conversations";

export function buildExport(conversations: Conversation[]): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(), conversations }, null, 2);
}

/** Parse an export file. Accepts our wrapper format or a bare array. Throws with a user-facing message. */
export function parseImport(text: string): { conversations: Conversation[]; skipped: number } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const list = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.conversations) ? data.conversations : null;
  if (!list) throw new Error("No conversations found. Choose a file exported from Galaxy AI.");
  const conversations = list.map(normalizeConversation).filter((c): c is Conversation => !!c);
  if (list.length > 0 && conversations.length === 0) throw new Error("None of the conversations in that file were valid.");
  return { conversations, skipped: list.length - conversations.length };
}
