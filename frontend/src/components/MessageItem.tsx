import type { Message } from "../types";
import { formatBytes } from "../lib/attachments";
import { Markdown, useCopy } from "./Markdown";
import { AlertIcon, CheckIcon, CopyIcon, FileIcon, Logo } from "./Icons";

export function MessageItem({ message, streaming }: { message: Message; streaming: boolean }) {
  const [copied, copy] = useCopy();

  if (message.role === "user") {
    return (
      <div className="msg user">
        {!!message.attachments?.length && (
          <div className="msg-attachments">
            {message.attachments.map((a) =>
              a.kind === "image" && a.data ? (
                <img key={a.id} src={a.data} alt={a.name} className="msg-image" />
              ) : (
                <div key={a.id} className="file-chip">
                  <FileIcon width={16} height={16} />
                  <span className="file-name">{a.name}</span>
                  <span className="muted">{a.data ? formatBytes(a.size) : "not stored"}</span>
                </div>
              ),
            )}
          </div>
        )}
        {message.content && <div className="bubble">{message.content}</div>}
      </div>
    );
  }

  const empty = !message.content && !message.error;
  return (
    <div className="msg assistant">
      <div className="avatar"><Logo size={26} /></div>
      <div className="msg-body">
        {empty && streaming ? (
          <div className="thinking" aria-label="Generating"><span /><span /><span /></div>
        ) : (
          message.content && <Markdown text={message.content} />
        )}
        {streaming && message.content && <span className="caret" aria-hidden />}
        {message.error && (
          <div className="error-box" role="alert">
            <AlertIcon width={16} height={16} />
            <span>{message.error}</span>
          </div>
        )}
        {!streaming && (message.content || message.stopped) && (
          <div className="msg-meta">
            {message.content && (
              <button className="icon-btn sm" onClick={() => copy(message.content)} aria-label="Copy response" title="Copy">
                {copied ? <CheckIcon width={15} height={15} /> : <CopyIcon width={15} height={15} />}
              </button>
            )}
            {message.stopped && <span className="muted small">Stopped</span>}
            {message.model && <span className="muted small">{message.model}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
