import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Attachment } from "../types";
import { ACCEPT, formatBytes, readAttachment, type AttachmentLimits } from "../lib/attachments";
import { FileIcon, PaperclipIcon, SendIcon, StopIcon, XIcon } from "./Icons";

interface Props {
  generating: boolean;
  disabled: boolean;
  maxChars: number;
  maxAttachments: number;
  limits: AttachmentLimits;
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  prefill?: { text: string; nonce: number };
}

export function Composer(p: Props) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!p.prefill) return;
    setText(p.prefill.text);
    ta.current?.focus();
  }, [p.prefill]);

  // Auto-grow textarea
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [text]);

  const over = text.length > p.maxChars;
  const canSend = !p.generating && !p.disabled && !over && (text.trim() !== "" || files.length > 0);

  const submit = () => {
    if (!canSend) return;
    p.onSend(text.trim(), files);
    setText("");
    setFiles([]);
    setNotice(null);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onPick = async (list: FileList | null) => {
    if (!list?.length) return;
    const errors: string[] = [];
    const added: Attachment[] = [];
    for (const f of Array.from(list)) {
      if (files.length + added.length >= p.maxAttachments) {
        errors.push(`You can attach up to ${p.maxAttachments} files.`);
        break;
      }
      try {
        added.push(await readAttachment(f, p.limits));
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    setFiles((fs) => [...fs, ...added]);
    setNotice(errors.length ? errors.join(" ") : null);
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <div className="composer-wrap">
      {notice && (
        <div className="notice" role="alert">
          {notice}
          <button className="icon-btn sm" onClick={() => setNotice(null)} aria-label="Dismiss"><XIcon width={14} height={14} /></button>
        </div>
      )}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onPick(e.dataTransfer.files);
        }}
      >
        {files.length > 0 && (
          <div className="pending">
            {files.map((f) => (
              <div key={f.id} className={`pending-item ${f.kind}`}>
                {f.kind === "image" ? <img src={f.data} alt={f.name} /> : <FileIcon width={18} height={18} />}
                {f.kind === "text" && (
                  <div className="pending-text">
                    <span className="file-name">{f.name}</span>
                    <span className="muted">{formatBytes(f.size)}</span>
                  </div>
                )}
                <button type="button" className="remove" onClick={() => setFiles((fs) => fs.filter((x) => x.id !== f.id))} aria-label={`Remove ${f.name}`}>
                  <XIcon width={12} height={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={ta}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              onPick(e.clipboardData.files);
            }
          }}
          placeholder="Message Your-AI"
          aria-label="Message"
          autoFocus
        />
        <div className="composer-bar">
          <input ref={fileInput} type="file" multiple accept={ACCEPT} hidden onChange={(e) => onPick(e.target.files)} />
          <button type="button" className="icon-btn" onClick={() => fileInput.current?.click()} aria-label="Attach files" title="Attach images or text files" disabled={p.generating}>
            <PaperclipIcon />
          </button>
          <span className={`counter ${over ? "over" : ""}`}>{text.length > p.maxChars * 0.8 ? `${text.length.toLocaleString()} / ${p.maxChars.toLocaleString()}` : ""}</span>
          {p.generating ? (
            <button type="button" className="send stop" onClick={p.onStop} aria-label="Stop generating" title="Stop generating">
              <StopIcon width={14} height={14} />
            </button>
          ) : (
            <button type="submit" className="send" disabled={!canSend} aria-label="Send message" title="Send (Enter)">
              <SendIcon />
            </button>
          )}
        </div>
      </form>
      <p className="disclaimer">Your-AI can make mistakes. Verify important information. Enter to send · Shift+Enter for a new line</p>
    </div>
  );
}
