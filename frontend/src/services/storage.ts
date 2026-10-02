import type { Conversation } from "../types";
import { normalizeConversation } from "../utils/validate";

const KEY = "galaxy-ai.conversations.v1";

/**
 * Local data is namespaced per Firebase user (uid) so different accounts on the
 * same browser never see each other's data. Data saved before sign-in existed
 * is adopted by the first account that signs in (moved, not deleted).
 */
let scope = "";
const LEGACY_KEYS = ["galaxy-ai.conversations.v1", "galaxy-ai.settings.v1", "galaxy-ai.creations.v1"];
export function setStorageScope(uid: string): void {
  scope = uid;
  try {
    if (localStorage.getItem("galaxy-ai.legacy-owner") == null && LEGACY_KEYS.some((k) => localStorage.getItem(k) != null)) {
      for (const k of LEGACY_KEYS) {
        const v = localStorage.getItem(k);
        if (v != null && localStorage.getItem(`${k}:${uid}`) == null) localStorage.setItem(`${k}:${uid}`, v);
        localStorage.removeItem(k);
      }
      localStorage.setItem("galaxy-ai.legacy-owner", uid);
    }
  } catch {
    /* storage unavailable */
  }
}
const scoped = (key: string) => (scope ? `${key}:${scope}` : key);

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(scoped(KEY));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeConversation).filter((c): c is Conversation => !!c);
  } catch (e) {
    console.warn("Stored conversations were unreadable and have been ignored.", e);
    return [];
  }
}

/**
 * Persist conversations. If the quota is exceeded, retry without large
 * attachment payloads so conversation text is never lost.
 * Returns false if nothing could be saved.
 */
export function saveConversations(list: Conversation[]): boolean {
  try {
    localStorage.setItem(scoped(KEY), JSON.stringify(list));
    return true;
  } catch {
    try {
      const slim = list.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.attachments ? { ...m, attachments: m.attachments.map((a) => (a.kind === "text" ? a : { ...a, data: undefined })) } : m,
        ),
      }));
      localStorage.setItem(scoped(KEY), JSON.stringify(slim));
      return true;
    } catch (e) {
      console.warn("Unable to save conversations to localStorage", e);
      return false;
    }
  }
}

const SETTINGS_KEY = "galaxy-ai.settings.v1";

export function loadJSON<T>(key: string = SETTINGS_KEY): Partial<T> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(scoped(key)) ?? "{}");
    return typeof v === "object" && v !== null ? (v as Partial<T>) : {};
  } catch {
    return {};
  }
}

export function saveJSON(value: unknown, key: string = SETTINGS_KEY): void {
  try {
    localStorage.setItem(scoped(key), JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
