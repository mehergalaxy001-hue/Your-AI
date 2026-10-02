import type { ModelOption, Settings, ThemePref } from "../../types";
import { Modal } from "../UI/Modal";
import { MonitorIcon, MoonIcon, SunIcon } from "../UI/Icons";

interface Props {
  settings: Settings;
  models: ModelOption[];
  provider: string | null;
  onSet: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onClose: () => void;
}

const THEMES: { id: ThemePref; label: string; icon: typeof SunIcon }[] = [
  { id: "light", label: "Light", icon: SunIcon },
  { id: "dark", label: "Dark", icon: MoonIcon },
  { id: "system", label: "System", icon: MonitorIcon },
];

export default function SettingsModal(p: Props) {
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


    </Modal>
  );
}
