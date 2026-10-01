import type { Chat } from "../types";

const KEY = "yourai.chats.v1";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function loadChats(): Chat[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages)) : [];
  } catch {
    return [];
  }
}

/**
 * Persist chats. If the browser quota is exceeded, retry without stored
 * attachment payloads (images are large) so the conversation text is never lost.
 */
export function saveChats(chats: Chat[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(chats));
  } catch {
    try {
      const slim = chats.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.attachments ? { ...m, attachments: m.attachments.map(({ data: _d, ...a }) => a) } : m,
        ),
      }));
      localStorage.setItem(KEY, JSON.stringify(slim));
    } catch (e) {
      console.warn("Unable to save chats to localStorage", e);
    }
  }
}

export function titleFrom(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "New chat";
  return t.length > 48 ? t.slice(0, 47) + "…" : t;
}
