import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent } from "react";
import type { Attachment, Limits } from "../../types";
import { ACCEPT_FILES, ACCEPT_MEDIA, readAttachment } from "../../utils/attachments";
import { formatBytes } from "../../utils/format";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { FileIcon, GlobeIcon, MicIcon, SendIcon, StopIcon, XIcon } from "../UI/Icons";
import { PlusMenu } from "./PlusMenu";

export interface ComposerHandle {
  focus: () => void;
  setText: (text: string) => void;
}

interface Props {
  generating: boolean;
  disabled: boolean;
  disabledReason?: string;
  enterToSend: boolean;
  limits: Limits;
  onSend: (text: string, attachments: Attachment[], opts: { webSearch?: boolean }) => void;
  /** Open the image-creation workspace, optionally prefilled with the current draft. */
  onCreateImage: (prompt: string) => void;
  onStop: () => void;
  /** True while an earlier user message is being edited. */
  editing: boolean;
  onCancelEdit: () => void;
}

const MAX_HEIGHT = 240;

const ComposerImpl = forwardRef<ComposerHandle, Props>(function Composer(p, ref) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const [webSearch, setWebSearch] = useState(false);
  const voiceBase = useRef("");

  const speech = useSpeechRecognition((transcript) => {
    const base = voiceBase.current;
    setText(base + (base && transcript ? " " : "") + transcript);
  });

  useImperativeHandle(ref, () => ({
    focus: () => ta.current?.focus(),
    setText: (t: string) => {
      setText(t);
      requestAnimationFrame(() => {
        const el = ta.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(t.length, t.length);
      });
    },
  }));

  // Auto-grow up to MAX_HEIGHT
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + "px";
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [text]);

  useEffect(() => {
    if (speech.error) setNotice(speech.error);
  }, [speech.error]);

  const over = text.length > p.limits.maxMessageChars;
  const hasContent = text.trim() !== "" || (!p.editing && files.length > 0);
  const canSend = !p.generating && !p.disabled && !over && !reading && hasContent;

  const submit = () => {
    if (!canSend) return;
    if (speech.listening) speech.stop();
    p.onSend(text.trim(), p.editing ? [] : files, { webSearch });
    setWebSearch(false); // applies to the next request only
    setText("");
    if (!p.editing) setFiles([]);
    setNotice(null);
  };

  const cancelEdit = () => {
    setText("");
    p.onCancelEdit();
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && p.editing) {
      e.preventDefault();
      cancelEdit();
      return;
    }
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    const modifier = e.metaKey || e.ctrlKey;
    if ((p.enterToSend && !e.shiftKey) || (!p.enterToSend && modifier)) {
      e.preventDefault();
      submit();
    }
  };

  const addFiles = async (list: FileList | File[] | null) => {
    if (!list || !list.length) return;
    setReading(true);
    const errors: string[] = [];
    const added: Attachment[] = [];
    for (const f of Array.from(list)) {
      if (files.length + added.length >= p.limits.maxAttachments) {
        errors.push(`You can attach up to ${p.limits.maxAttachments} files per message.`);
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
    setReading(false);
    if (fileInput.current) fileInput.current.value = "";
    if (mediaInput.current) mediaInput.current.value = "";
  };

  const toggleVoice = () => {
    if (speech.listening) return speech.stop();
    speech.clearError();
    voiceBase.current = text.trim();
    speech.start();
  };

  const counterShown = text.length > p.limits.maxMessageChars * 0.75;

  return (
    <div className="composer-wrap">
      {notice && (
        <div className="notice" role="alert">
          <span>{notice}</span>
          <button className="icon-btn xs" onClick={() => { setNotice(null); speech.clearError(); }} aria-label="Dismiss message">
            <XIcon width={14} height={14} />
          </button>
        </div>
      )}
      <form
        className={`composer ${speech.listening ? "listening" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void addFiles(e.dataTransfer.files);
        }}
      >
        {p.editing && (
          <div className="editing-bar">
            <span>Editing message</span>
            <button type="button" className="link-btn" onClick={cancelEdit}>Cancel</button>
          </div>
        )}
        {webSearch && (
          <div className="mode-chips">
            <span className="mode-chip">
              <GlobeIcon width={14} height={14} /> Web search
              <button type="button" onClick={() => setWebSearch(false)} aria-label="Turn off web search"><XIcon width={12} height={12} /></button>
            </span>
          </div>
        )}
        {!p.editing && files.length > 0 && (
          <ul className="pending" aria-label="Attachments to send">
            {files.map((f) => (
              <li key={f.id} className={`pending-item ${f.kind}`}>
                {f.kind === "image" ? <img src={f.data} alt={f.name} /> : f.kind === "video" ? <video src={f.data} muted playsInline preload="metadata" aria-label={f.name} /> : <FileIcon width={18} height={18} />}
                {f.kind !== "image" && f.kind !== "video" && (
                  <div className="pending-text">
                    <span className="file-name">{f.name}</span>
                    <span className="muted">{f.kind === "pdf" ? "PDF" : "Text"} · {formatBytes(f.size)}</span>
                  </div>
                )}
                <button type="button" className="remove" onClick={() => setFiles((fs) => fs.filter((x) => x.id !== f.id))} aria-label={`Remove ${f.name}`}>
                  <XIcon width={12} height={12} />
                </button>
              </li>
            ))}
          </ul>
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
              void addFiles(e.clipboardData.files);
            }
          }}
          placeholder={speech.listening ? "Listening… speak now" : p.disabled && p.disabledReason ? p.disabledReason : "Message Galaxy AI"}
          aria-label="Message Galaxy AI"
          aria-describedby="composer-hint"
          enterKeyHint={p.enterToSend ? "send" : "enter"}
        />
        <div className="composer-bar">
          <input ref={mediaInput} type="file" multiple accept={ACCEPT_MEDIA} hidden onChange={(e) => void addFiles(e.target.files)} />
          <input ref={fileInput} type="file" multiple accept={ACCEPT_FILES} hidden onChange={(e) => void addFiles(e.target.files)} />
          <PlusMenu
            disabled={p.generating || reading || p.editing}
            webSearch={webSearch}
            onPhotos={() => mediaInput.current?.click()}
            onFiles={() => fileInput.current?.click()}
            onWebSearch={() => {
              setWebSearch((w) => !w);
              ta.current?.focus();
            }}
            onCreateImage={() => p.onCreateImage(text.trim())}
          />
          <button
            type="button"
            className={`icon-btn ${speech.listening ? "recording" : ""} ${speech.supported ? "" : "unavailable"}`}
            onClick={toggleVoice}
            aria-pressed={speech.listening}
            aria-label={speech.supported ? (speech.listening ? "Stop voice input" : "Start voice input") : "Voice input unavailable in this browser"}
            title={speech.supported ? (speech.listening ? "Stop listening" : "Voice input") : "Voice input isn't supported in this browser"}
          >
            <MicIcon />
          </button>
          {reading && <span className="muted small">Reading file…</span>}
          <span className={`counter ${over ? "over" : ""}`} aria-live="polite">
            {counterShown ? `${text.length.toLocaleString()} / ${p.limits.maxMessageChars.toLocaleString()}` : ""}
          </span>
          {p.generating ? (
            <button type="button" className="send stop" onClick={p.onStop} aria-label="Stop generating" title="Stop generating">
              <StopIcon width={14} height={14} />
            </button>
          ) : (
            <button type="submit" className="send" disabled={!canSend} aria-label={p.editing ? "Save and resend" : "Send message"} title={p.editing ? "Save & resend" : "Send"}>
              <SendIcon />
            </button>
          )}
        </div>
      </form>
      <p className="disclaimer" id="composer-hint">
        Galaxy AI can make mistakes. Please check again.
      </p>
    </div>
  );
});

export const Composer = memo(ComposerImpl);
