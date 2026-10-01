import { useMemo, useState } from "react";
import type { Chat, ThemePref } from "../types";
import { ComposeIcon, EditIcon, Logo, MonitorIcon, MoonIcon, SearchIcon, SidebarIcon, SunIcon, TrashIcon } from "./Icons";

interface Props {
  chats: Chat[];
  activeId: string | null;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  theme: ThemePref;
  onTheme: (t: ThemePref) => void;
}

function groupLabel(ts: number): string {
  const day = 86_400_000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  if (ts >= startOfToday) return "Today";
  if (ts >= startOfToday - day) return "Yesterday";
  if (ts >= startOfToday - 7 * day) return "Previous 7 days";
  if (ts >= startOfToday - 30 * day) return "Previous 30 days";
  return "Older";
}

export function Sidebar(p: Props) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...p.chats]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((c) => !q || c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)));
    const out: { label: string; items: Chat[] }[] = [];
    for (const c of list) {
      const label = groupLabel(c.updatedAt);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(c);
      else out.push({ label, items: [c] });
    }
    return out;
  }, [p.chats, query]);

  const commitRename = (id: string) => {
    if (draft.trim()) p.onRename(id, draft);
    setEditing(null);
  };

  return (
    <>
      <div className={`scrim ${p.open ? "show" : ""}`} onClick={p.onClose} />
      <aside className={`sidebar ${p.open ? "open" : ""}`} aria-label="Chat history">
        <div className="sidebar-top">
          <div className="brand">
            <Logo />
            <span>Your-AI</span>
          </div>
          <button className="icon-btn" onClick={p.onClose} aria-label="Close sidebar" title="Close sidebar">
            <SidebarIcon />
          </button>
        </div>

        <button className="new-chat" onClick={p.onNew}>
          <ComposeIcon /> New chat
        </button>

        <label className="search">
          <SearchIcon width={16} height={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats" aria-label="Search chats" />
        </label>

        <nav className="history">
          {p.chats.length === 0 && <p className="muted small pad">Your conversations will appear here.</p>}
          {p.chats.length > 0 && groups.length === 0 && <p className="muted small pad">No chats match “{query}”.</p>}
          {groups.map((g) => (
            <div key={g.label} className="group">
              <div className="group-label">{g.label}</div>
              {g.items.map((c) =>
                editing === c.id ? (
                  <input
                    key={c.id}
                    className="rename-input"
                    autoFocus
                    value={draft}
                    maxLength={100}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitRename(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(c.id);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    aria-label="Rename chat"
                  />
                ) : (
                  <div key={c.id} className={`chat-item ${c.id === p.activeId ? "active" : ""}`}>
                    <button className="chat-title" onClick={() => p.onSelect(c.id)} title={c.title}>
                      {c.title}
                    </button>
                    <div className="chat-actions">
                      <button
                        className="icon-btn sm"
                        aria-label={`Rename ${c.title}`}
                        title="Rename"
                        onClick={() => {
                          setEditing(c.id);
                          setDraft(c.title);
                        }}
                      >
                        <EditIcon width={15} height={15} />
                      </button>
                      <button
                        className="icon-btn sm danger"
                        aria-label={`Delete ${c.title}`}
                        title="Delete"
                        onClick={() => {
                          if (window.confirm(`Delete “${c.title}”? This cannot be undone.`)) p.onDelete(c.id);
                        }}
                      >
                        <TrashIcon width={15} height={15} />
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="segmented" role="radiogroup" aria-label="Theme">
            {([
              ["light", SunIcon, "Light"],
              ["dark", MoonIcon, "Dark"],
              ["system", MonitorIcon, "System"],
            ] as const).map(([v, Icon, label]) => (
              <button key={v} role="radio" aria-checked={p.theme === v} className={p.theme === v ? "on" : ""} onClick={() => p.onTheme(v)} title={label}>
                <Icon width={15} height={15} /> <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
