import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Conversation, ModelOption } from "../../types";
import { MessageItem } from "../Message/MessageItem";
import { ArrowDownIcon } from "../UI/Icons";
import { Welcome } from "./Welcome";

interface Props {
  conversation: Conversation | null;
  streamingId: string | null;
  busy: boolean;
  models: ModelOption[];
  onPick: (prompt: string) => void;
  onRegenerate: (msgId: string) => void;
  onFeedback: (msgId: string, value: "up" | "down" | undefined) => void;
}

/** Scrollable thread with "stick to bottom" auto-scroll while streaming. */
export function ChatView({ conversation, streamingId, busy, models, onPick, onRegenerate, onFeedback }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const messages = conversation?.messages ?? [];
  const lastId = messages.at(-1)?.id;

  const toBottom = useCallback((smooth: boolean) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Switching conversations jumps to the bottom.
  useLayoutEffect(() => {
    stick.current = true;
    toBottom(false);
  }, [conversation?.id, toBottom]);

  // New message appended: smooth scroll.
  useEffect(() => {
    stick.current = true;
    toBottom(true);
  }, [lastId, toBottom]);

  // Streaming content growth: follow if the user hasn't scrolled away.
  useLayoutEffect(() => {
    if (stick.current) toBottom(false);
  }, [messages, toBottom]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
    stick.current = near;
    setShowJump(!near);
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div className="scroller" ref={scroller} onScroll={onScroll}>
      {messages.length === 0 ? (
        <Welcome onPick={onPick} />
      ) : (
        <div className="thread" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation">
          {messages.map((m) => (
            <MessageItem
              key={m.id}
              message={m}
              streaming={streamingId === m.id}
              canRegenerate={m.id === lastAssistant}
              busy={busy}
              models={models}
              onRegenerate={onRegenerate}
              onFeedback={onFeedback}
            />
          ))}
        </div>
      )}
      {showJump && messages.length > 0 && (
        <button className="jump" onClick={() => toBottom(true)} aria-label="Scroll to latest message">
          <ArrowDownIcon width={16} height={16} />
        </button>
      )}
    </div>
  );
}
