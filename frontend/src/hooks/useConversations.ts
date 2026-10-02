import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Conversation, ConversationMeta, Message } from "../types";
import { loadConversations, saveConversations } from "../services/storage";
import { titleFrom, uid } from "../utils/format";

/**
 * Conversation store backed by localStorage. Writes are debounced so
 * streaming tokens don't hammer storage; pending writes flush on unload.
 */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const latest = useRef(conversations);
  latest.current = conversations;
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveConversations(conversations), 300);
  }, [conversations]);

  useEffect(() => {
    const flush = () => saveConversations(latest.current);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, []);

  const update = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const create = useCallback((first: Message): string => {
    const now = Date.now();
    const title = titleFrom(first.content || first.attachments?.[0]?.name || "");
    const conv: Conversation = { id: uid(), title, createdAt: now, updatedAt: now, messages: [first] };
    setConversations((cs) => [conv, ...cs]);
    setActiveId(conv.id);
    return conv.id;
  }, []);

  const append = useCallback(
    (id: string, ...msgs: Message[]) => update(id, (c) => ({ ...c, messages: [...c.messages, ...msgs], updatedAt: Date.now() })),
    [update],
  );

  const patchMessage = useCallback(
    (convId: string, msgId: string, fn: (m: Message) => Message) =>
      update(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)) })),
    [update],
  );

  /** Replace message `msgId` and drop everything after it. */
  const replaceFrom = useCallback(
    (convId: string, msgId: string, replacement: Message) =>
      update(convId, (c) => {
        const idx = c.messages.findIndex((m) => m.id === msgId);
        if (idx < 0) return c;
        return { ...c, messages: [...c.messages.slice(0, idx), replacement], updatedAt: Date.now() };
      }),
    [update],
  );

  const rename = useCallback(
    (id: string, title: string) => update(id, (c) => ({ ...c, title: title.trim().slice(0, 200) || c.title })),
    [update],
  );

  const clearMessages = useCallback((id: string) => update(id, (c) => ({ ...c, messages: [], updatedAt: Date.now() })), [update]);

  const remove = useCallback((id: string) => {
    setConversations((cs) => cs.filter((c) => c.id !== id));
    setActiveId((a) => (a === id ? null : a));
  }, []);

  const removeAll = useCallback(() => {
    setConversations([]);
    setActiveId(null);
    saveConversations([]);
  }, []);

  /** Merge imported conversations; imported items replace ones with the same id. */
  const importMany = useCallback((list: Conversation[]) => {
    setConversations((cs) => {
      const ids = new Set(list.map((c) => c.id));
      return [...list, ...cs.filter((c) => !ids.has(c.id))].sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, []);

  // Sidebar only needs id/title/updatedAt: keep this stable while tokens stream in.
  const metaKey = conversations.map((c) => `${c.id}\u0001${c.title}\u0001${c.updatedAt}`).join("\u0002");
  const metas: ConversationMeta[] = useMemo(
    () => latest.current.map(({ id, title, updatedAt }) => ({ id, title, updatedAt })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metaKey],
  );

  const search = useCallback((q: string): Set<string> => {
    const needle = q.toLowerCase();
    return new Set(
      latest.current
        .filter((c) => c.title.toLowerCase().includes(needle) || c.messages.some((m) => m.content.toLowerCase().includes(needle)))
        .map((c) => c.id),
    );
  }, []);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  return {
    conversations, metas, active, activeId, setActiveId, latest,
    create, append, patchMessage, replaceFrom, rename, clearMessages, remove, removeAll, importMany, search, update,
  };
}

export type ConversationStore = ReturnType<typeof useConversations>;
