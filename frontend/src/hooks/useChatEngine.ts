import { useCallback, useRef, useState } from "react";
import type { Attachment, Limits, Message } from "../types";
import { ApiError, buildContext, streamChat } from "../services/api";
import { uid } from "../utils/format";
import type { ConversationStore } from "./useConversations";

export interface Generating {
  convId: string;
  msgId: string;
}

/**
 * Orchestrates sending, streaming, stopping and regenerating replies.
 * A synchronous ref guard prevents duplicate submissions.
 */
export function useChatEngine(store: ConversationStore, model: string, limits: Limits, onConfigError: (code: string) => void) {
  const [generating, setGenerating] = useState<Generating | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busy = useRef(false);
  // Refs keep the returned callbacks stable across renders (cheap memoized children).
  const S = useRef({ store, model, limits, onConfigError });
  S.current = { store, model, limits, onConfigError };

  const run = useCallback(
    async (convId: string, history: Message[], bot: Message) => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setGenerating({ convId, msgId: bot.id });

      // Batch tokens per animation frame to keep rendering cheap.
      let pending = "";
      let raf = 0;
      const flush = () => {
        raf = 0;
        if (!pending) return;
        const chunk = pending;
        pending = "";
        S.current.store.patchMessage(convId, bot.id, (m) => ({ ...m, content: m.content + chunk }));
      };

      try {
        await streamChat({
          model: S.current.model,
          messages: buildContext(history, S.current.limits),
          signal: ctrl.signal,
          onDelta: (d) => {
            pending += d;
            if (!raf) raf = requestAnimationFrame(flush);
          },
        });
        cancelAnimationFrame(raf);
        flush();
      } catch (e) {
        cancelAnimationFrame(raf);
        flush();
        if ((e as Error).name === "AbortError") {
          S.current.store.patchMessage(convId, bot.id, (m) => ({ ...m, stopped: true }));
        } else {
          const err = e instanceof ApiError ? { code: e.code, message: e.message } : { code: "unknown", message: "Something went wrong. Please try again." };
          S.current.store.patchMessage(convId, bot.id, (m) => ({ ...m, error: err }));
          S.current.onConfigError(err.code);
        }
      } finally {
        S.current.store.update(convId, (c) => ({ ...c, updatedAt: Date.now() }));
        abortRef.current = null;
        busy.current = false;
        setGenerating(null);
      }
    },
    [],
  );

  const send = useCallback(
    (text: string, attachments: Attachment[]) => {
      if (busy.current || !S.current.model) return;
      busy.current = true;
      const user: Message = { id: uid(), role: "user", content: text, timestamp: Date.now(), ...(attachments.length ? { attachments } : {}) };
      const bot: Message = { id: uid(), role: "assistant", content: "", timestamp: Date.now(), model: S.current.model };

      let convId = S.current.store.activeId;
      const prior = convId ? S.current.store.latest.current.find((c) => c.id === convId)?.messages ?? [] : [];
      if (!convId || !S.current.store.latest.current.some((c) => c.id === convId)) {
        convId = S.current.store.create(user);
        S.current.store.append(convId, bot);
      } else {
        S.current.store.append(convId, user, bot);
      }
      void run(convId, [...prior, user], bot);
    },
    [run],
  );

  /** Regenerate the assistant message `msgId` using the conversation up to it. */
  const regenerate = useCallback(
    (convId: string, msgId: string) => {
      if (busy.current || !S.current.model) return;
      const conv = S.current.store.latest.current.find((c) => c.id === convId);
      const idx = conv?.messages.findIndex((m) => m.id === msgId) ?? -1;
      if (!conv || idx < 1) return;
      const history = conv.messages.slice(0, idx);
      if (history.at(-1)?.role !== "user") return;
      busy.current = true;
      const bot: Message = { id: uid(), role: "assistant", content: "", timestamp: Date.now(), model: S.current.model };
      S.current.store.replaceFrom(convId, msgId, bot);
      void run(convId, history, bot);
    },
    [run],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { generating, send, regenerate, stop };
}
