import { useCallback, useEffect, useRef, useState } from "react";
import type { Chat, Message } from "../types";
import { loadChats, saveChats, titleFrom, uid } from "../lib/storage";

/** Chat list state, persisted to localStorage (debounced so streaming doesn't thrash storage). */
export function useChats() {
  const [chats, setChats] = useState<Chat[]>(loadChats);
  const [activeId, setActiveId] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(chats);
  latest.current = chats;

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveChats(chats), 250);
  }, [chats]);

  useEffect(() => {
    const flush = () => saveChats(latest.current);
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  const createChat = useCallback((firstMessage: Message): string => {
    const now = Date.now();
    const chat: Chat = { id: uid(), title: titleFrom(firstMessage.content || firstMessage.attachments?.[0]?.name || ""), createdAt: now, updatedAt: now, messages: [firstMessage] };
    setChats((cs) => [chat, ...cs]);
    setActiveId(chat.id);
    return chat.id;
  }, []);

  const updateChat = useCallback((id: string, fn: (c: Chat) => Chat) => {
    setChats((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const appendMessages = useCallback(
    (id: string, ...msgs: Message[]) =>
      updateChat(id, (c) => ({ ...c, messages: [...c.messages, ...msgs], updatedAt: Date.now() })),
    [updateChat],
  );

  const patchMessage = useCallback(
    (chatId: string, msgId: string, fn: (m: Message) => Message) =>
      updateChat(chatId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)) })),
    [updateChat],
  );

  const renameChat = useCallback(
    (id: string, title: string) => updateChat(id, (c) => ({ ...c, title: title.trim() || c.title, updatedAt: Date.now() })),
    [updateChat],
  );

  const deleteChat = useCallback((id: string) => {
    setChats((cs) => cs.filter((c) => c.id !== id));
    setActiveId((a) => (a === id ? null : a));
  }, []);

  const active = chats.find((c) => c.id === activeId) ?? null;

  return { chats, active, activeId, setActiveId, createChat, appendMessages, patchMessage, renameChat, deleteChat, latest };
}
