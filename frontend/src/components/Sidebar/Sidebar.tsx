import { memo, useMemo, useState } from "react";
import type { ConversationMeta } from "../../types";
import { groupLabel } from "../../utils/format";
import { ComposeIcon, EditIcon, Logo, SearchIcon, SidebarIcon, TrashIcon, XIcon } from "../UI/Icons";

interface Props {
  metas: ConversationMeta[];
  activeId: string | null;
  open: boolean;
  search: (q: string) => Set<string>;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string, title: string) => void;
  onDeleteAll: () => void;
}

function SidebarImpl(p: Props) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const groups = useMemo(() => {
    const q = query.trim();
    const matches = q ? p.search(q) : null;
    const out: { label: string; items: ConversationMeta[] }[] = [];
    for (const c of [...p.metas].sort((a, b) => b.updatedAt - a.updatedAt)) {
      if (matches && !matches.has(c.id)) continue;
      const label = groupLabel(c.updatedAt);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(c);
      else out.push({ label, items: [c] });
    }
    return out;
  }, [p.metas, p.search, query]);

  const commit = (id: string) => {
    if (draft.trim()) p.onRename(id, draft);
    setEditing(null);
  };

  return (
    <>
      <div className={`scrim ${p.open ? "show" : ""}`} onClick={p.onClose} aria-hidden />
      <aside className={`sidebar ${p.open ? "open" : ""}`} aria-label="Conversations" aria-hidden={!p.open} inert={!p.open}>
        <div className="sidebar-top">
          <div className="brand">
            <Logo />
            <span>Galaxy AI</span>
          </div>
          <button className="icon-btn" onClick={p.onClose} aria-label="Collapse sidebar" title="Collapse sidebar">
            <SidebarIcon />
          </button>
        </div>

        <button className="new-chat" onClick={p.onNew}>
          <ComposeIcon /> New chat
          <kbd className="kbd">Ctrl ⇧ O</kbd>
        </button>

        <div className="search">
          <SearchIcon width={16} height={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
          {query && (
            <button className="icon-btn xs" onClick={() => setQuery("")} aria-label="Clear search"><XIcon width={14} height={14} /></button>
          )}
        </div>

        <nav className="history" aria-label="Recent conversations">
          {p.metas.length === 0 && (
            <div className="sidebar-empty">
              <p>No conversations yet</p>
              <span>Start a chat and it will be saved here on this device.</span>
            </div>
          )}
          {p.metas.length > 0 && groups.length === 0 && <p className="sidebar-empty"><span>No conversations match “{query}”.</span></p>}
          {groups.map((g) => (
            <section key={g.label} className="group" aria-label={g.label}>
              <h3 className="group-label">{g.label}</h3>
              <ul>
                {g.items.map((c) => (
                  <li key={c.id}>
                    {editing === c.id ? (
                      <input
                        className="rename-input"
                        autoFocus
                        value={draft}
                        maxLength={200}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commit(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commit(c.id);
                          if (e.key === "Escape") setEditing(null);
                        }}
                        aria-label="Conversation title"
                      />
                    ) : (
                      <div className={`chat-item ${c.id === p.activeId ? "active" : ""}`}>
                        <button
                          className="chat-title"
                          onClick={() => p.onSelect(c.id)}
                          title={c.title}
                          aria-current={c.id === p.activeId ? "page" : undefined}
                        >
                          {c.title}
                        </button>
                        <div className="chat-actions">
                          <button
                            className="icon-btn sm"
                            aria-label={`Rename “${c.title}”`}
                            title="Rename"
                            onClick={() => {
                              setEditing(c.id);
                              setDraft(c.title);
                            }}
                          >
                            <EditIcon width={15} height={15} />
                          </button>
                          <button className="icon-btn sm danger" aria-label={`Delete “${c.title}”`} title="Delete" onClick={() => p.onDelete(c.id, c.title)}>
                            <TrashIcon width={15} height={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>

        {p.metas.length > 0 && (
          <div className="sidebar-footer">
            <button className="side-link danger" onClick={p.onDeleteAll}>
              <TrashIcon width={16} height={16} /> Delete all conversations
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export const Sidebar = memo(SidebarImpl);
