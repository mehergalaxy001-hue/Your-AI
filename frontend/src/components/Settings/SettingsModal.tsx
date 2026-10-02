import { useRef, useState } from "react";
import type { Conversation, ModelOption, Settings, ThemePref } from "../../types";
import { buildExport, parseImport } from "../../utils/validate";
import { Modal } from "../UI/Modal";
import { DownloadIcon, Logo, MonitorIcon, MoonIcon, SunIcon, TrashIcon, UploadIcon } from "../UI/Icons";

interface Props {
  settings: Settings;
  models: ModelOption[];
  provider: string | null;
  conversations: Conversation[];
  onSet: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onImport: (list: Conversation[]) => void;
  onClearAll: () => void;
  onClose: () => void;
}

const THEMES: { id: ThemePref; label: string; icon: typeof SunIcon }[] = [
  { id: "light", label: "Light", icon: SunIcon },
  { id: "dark", label: "Dark", icon: MoonIcon },
  { id: "system", label: "System", icon: MonitorIcon },
];

export default function SettingsModal(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const doExport = () => {
    const blob = new Blob([buildExport(p.conversations)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `galaxy-ai-conversations-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ kind: "ok", text: `Exported ${p.conversations.length} conversation(s).` });
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setStatus({ kind: "error", text: "That file is too large to import (max 50 MB)." });
      return;
    }
    try {
      const { conversations, skipped } = parseImport(await file.text());
      p.onImport(conversations);
      setStatus({ kind: "ok", text: `Imported ${conversations.length} conversation(s)${skipped ? `, skipped ${skipped} invalid` : ""}.` });
    } catch (e) {
      setStatus({ kind: "error", text: (e as Error).message });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Modal title="Settings" onClose={p.onClose}>
      <section className="setting">
        <div className="setting-label">
          <h3>Theme</h3>
          <p>Choose how Galaxy AI looks.</p>
        </div>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {THEMES.map(({ id, label, icon: Icon }) => (
            <button key={id} role="radio" aria-checked={p.settings.theme === id} className={p.settings.theme === id ? "on" : ""} onClick={() => p.onSet("theme", id)}>
              <Icon width={15} height={15} /> {label}
            </button>
          ))}
        </div>
      </section>

      <section className="setting">
        <div className="setting-label">
          <h3><label htmlFor="settings-model">Default model</label></h3>
          <p>Used for new messages.</p>
        </div>
        <select id="settings-model" className="select" value={p.settings.model} onChange={(e) => p.onSet("model", e.target.value)} disabled={!p.models.length}>
          {p.models.map((m) => (
            <option key={m.id} value={m.id}>{m.label} — {m.description}</option>
          ))}
        </select>
      </section>

      <section className="setting">
        <div className="setting-label">
          <h3 id="ets-label">Enter to send</h3>
          <p>{p.settings.enterToSend ? "Enter sends · Shift+Enter adds a new line." : "Enter adds a new line · Ctrl/⌘+Enter sends."}</p>
        </div>
        <button
          role="switch"
          aria-checked={p.settings.enterToSend}
          aria-labelledby="ets-label"
          className={`switch ${p.settings.enterToSend ? "on" : ""}`}
          onClick={() => p.onSet("enterToSend", !p.settings.enterToSend)}
        >
          <span />
        </button>
      </section>

      <section className="setting">
        <div className="setting-label">
          <h3>Data</h3>
          <p>Conversations are stored only in this browser.</p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={doExport} disabled={!p.conversations.length}><DownloadIcon width={16} height={16} /> Export</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><UploadIcon width={16} height={16} /> Import</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void doImport(e.target.files?.[0])} />
          <button className="btn danger" onClick={p.onClearAll} disabled={!p.conversations.length}><TrashIcon width={16} height={16} /> Clear all</button>
        </div>
      </section>
      {status && <p className={`status ${status.kind}`} role="status">{status.text}</p>}

      <section className="about">
        <Logo size={36} />
        <div>
          <h3>Galaxy AI</h3>
          <p>
            A fast, private-by-default AI chat app. Messages are sent through the Galaxy AI server to{" "}
            {p.provider === "gemini" ? "Google Gemini" : p.provider === "openai" ? "OpenAI" : "your configured AI provider"}; API keys never reach the browser.
          </p>
        </div>
      </section>
    </Modal>
  );
}
