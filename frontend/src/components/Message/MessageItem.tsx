import { lazy, memo, Suspense, useState } from "react";
import type { Message, ModelOption } from "../../types";
import { useCopy } from "../../hooks/useCopy";
import { formatBytes } from "../../utils/format";
import { AlertIcon, CheckIcon, CopyIcon, EditIcon, FileIcon, Logo, MoreIcon, RefreshIcon, ThumbDownIcon, ThumbUpIcon } from "../UI/Icons";

// Code-split the markdown/highlighting bundle, but start fetching it immediately.
const loadMarkdown = () => import("./Markdown");
const Markdown = lazy(loadMarkdown);
void loadMarkdown();

interface Props {
  message: Message;
  streaming: boolean;
  /** Only the latest assistant message can be regenerated. */
  canRegenerate: boolean;
  busy: boolean;
  models: ModelOption[];
  /** This user message is currently being edited in the composer. */
  editing: boolean;
  onEdit: (msgId: string) => void;
  onRegenerate: (msgId: string) => void;
  onFeedback: (msgId: string, value: "up" | "down" | undefined) => void;
}

const time = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function MessageItemImpl({ message, streaming, canRegenerate, busy, models, editing, onEdit, onRegenerate, onFeedback }: Props) {
  const [copied, copy] = useCopy();
  const [actionsOpen, setActionsOpen] = useState(false);

  if (message.role === "user") {
    return (
      <article className={`msg user ${editing ? "editing" : ""} ${actionsOpen ? "actions-open" : ""}`} aria-label="Your message">
        {!!message.attachments?.length && (
          <div className="msg-attachments">
            {message.attachments.map((a) =>
              a.kind === "image" && a.data ? (
                <img key={a.id} src={a.data} alt={a.name} className="msg-image" loading="lazy" />
              ) : (
                <div key={a.id} className="file-chip">
                  <FileIcon width={16} height={16} />
                  <span className="file-name">{a.name}</span>
                  <span className="muted">{a.kind === "pdf" ? "PDF" : a.kind === "text" ? "Text" : "Image"} · {a.data ? formatBytes(a.size) : "not stored"}</span>
                </div>
              ),
            )}
          </div>
        )}
        {message.content && <div className="bubble">{message.content}</div>}
        <div className="user-actions">
          {editing && <span className="tag">Editing</span>}
          <time className="msg-time" dateTime={new Date(message.timestamp).toISOString()}>{time(message.timestamp)}</time>
          <div className="user-actions-buttons">
            {message.content && (
              <button className="icon-btn sm" onClick={() => copy(message.content)} aria-label={copied ? "Message copied" : "Copy message"} title={copied ? "Copied" : "Copy"}>
                {copied ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />}
              </button>
            )}
            <button className="icon-btn sm" onClick={() => { setActionsOpen(false); onEdit(message.id); }} disabled={busy} aria-label="Edit message" title="Edit">
              <EditIcon width={16} height={16} />
            </button>
          </div>
          <button
            className="icon-btn sm user-actions-toggle"
            onClick={() => setActionsOpen((o) => !o)}
            aria-expanded={actionsOpen}
            aria-label="Message actions"
          >
            <MoreIcon width={16} height={16} />
          </button>
        </div>
      </article>
    );
  }

  const empty = !message.content && !message.error;
  const modelLabel = models.find((m) => m.id === message.model)?.label ?? message.model;

  return (
    <article className="msg assistant" aria-label="Galaxy AI response" aria-busy={streaming}>
      <div className="avatar"><Logo size={28} /></div>
      <div className="msg-body">
        {empty && streaming ? (
          <div className="thinking" role="status" aria-label="Galaxy AI is thinking"><span /><span /><span /></div>
        ) : message.content ? (
          <Suspense fallback={<div className="markdown plain">{message.content}</div>}>
            <Markdown text={message.content} />
          </Suspense>
        ) : null}
        {streaming && message.content && <span className="caret" aria-hidden />}
        {message.error && (
          <div className="error-box" role="alert">
            <AlertIcon width={16} height={16} />
            <div>
              <strong>{errorTitle(message.error.code)}</strong>
              <span>{message.error.message}</span>
            </div>
          </div>
        )}
        {!streaming && (
          <div className="msg-actions">
            {message.content && (
              <button className="icon-btn sm" onClick={() => copy(message.content)} aria-label={copied ? "Response copied" : "Copy response"} title="Copy">
                {copied ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />}
              </button>
            )}
            {message.content && (
              <>
                <button
                  className={`icon-btn sm ${message.feedback === "up" ? "on" : ""}`}
                  aria-pressed={message.feedback === "up"}
                  aria-label="Good response"
                  title="Good response"
                  onClick={() => onFeedback(message.id, message.feedback === "up" ? undefined : "up")}
                >
                  <ThumbUpIcon width={16} height={16} />
                </button>
                <button
                  className={`icon-btn sm ${message.feedback === "down" ? "on" : ""}`}
                  aria-pressed={message.feedback === "down"}
                  aria-label="Bad response"
                  title="Bad response"
                  onClick={() => onFeedback(message.id, message.feedback === "down" ? undefined : "down")}
                >
                  <ThumbDownIcon width={16} height={16} />
                </button>
              </>
            )}
            {canRegenerate && (
              <button className="icon-btn sm" onClick={() => onRegenerate(message.id)} disabled={busy} aria-label="Regenerate response" title="Regenerate">
                <RefreshIcon width={16} height={16} />
              </button>
            )}
            {message.stopped && <span className="tag">Stopped</span>}
            {modelLabel && <span className="muted small">{modelLabel}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

function errorTitle(code: string): string {
  switch (code) {
    case "missing_api_key": return "AI not configured";
    case "invalid_api_key": return "Invalid API key";
    case "rate_limited": return "Rate limit reached";
    case "network_error": case "server_unreachable": return "Network problem";
    case "timeout": return "Request timed out";
    case "empty_response": return "Empty response";
    case "provider_unavailable": case "http_502": case "http_503": return "AI service unavailable";
    default: return "Something went wrong";
  }
}

export const MessageItem = memo(MessageItemImpl);
