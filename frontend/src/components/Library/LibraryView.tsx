import { memo, useMemo, useState } from "react";
import type { Conversation } from "../../types";
import type { Creation } from "../../types/media";
import { formatBytes } from "../../utils/format";
import { MediaPreview } from "../Create/MediaPreview";
import { Modal } from "../UI/Modal";
import { DownloadIcon, FileIcon, MenuIcon, SidebarIcon, TrashIcon } from "../UI/Icons";

type Kind = "image" | "video" | "file";
type Tab = "all" | Kind;

interface Item {
  key: string;
  kind: Kind;
  name: string;
  date: number;
  /** Displayable / downloadable URL (server URL or in-browser data URL). */
  src?: string;
  size?: number;
  creation?: Creation;
  conversationId?: string;
}

interface Props {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  creations: Creation[];
  conversations: Conversation[];
  onOpenChat: (id: string) => void;
  onRemoveCreation: (id: string) => void;
  onToggleSave: (id: string, saved: boolean) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
  { id: "file", label: "Files" },
];

const date = (ts: number) => new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
const kindLabel = (k: Kind) => (k === "image" ? "Image" : k === "video" ? "Video" : "File");

/**
 * Library: creations saved from Images, plus photos/videos/files the user
 * attached in chats. Built from existing local data; nothing is invented.
 */
function LibraryViewImpl(p: Props) {
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<Item | null>(null);

  const all = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const c of p.creations) {
      if (!c.saved) continue;
      out.push({ key: `c-${c.id}`, kind: c.type, name: c.prompt, date: c.createdAt, src: c.resultUrl, creation: c });
    }
    for (const conv of p.conversations) {
      for (const m of conv.messages) {
        if (m.role !== "user") continue;
        for (const a of m.attachments ?? []) {
          out.push({
            key: `a-${conv.id}-${m.id}-${a.id}`,
            kind: a.kind === "image" ? "image" : a.kind === "video" ? "video" : "file",
            name: a.name,
            date: m.timestamp,
            src: a.kind === "image" || a.kind === "video" || a.kind === "pdf" ? a.data : undefined,
            size: a.size,
            conversationId: conv.id,
          });
        }
      }
    }
    return out.sort((a, b) => b.date - a.date);
  }, [p.creations, p.conversations]);

  const items = tab === "all" ? all : all.filter((i) => i.kind === tab);
  const count = (t: Tab) => (t === "all" ? all.length : all.filter((i) => i.kind === t).length);

  const openItem = (i: Item) => {
    if (i.kind === "file" && i.conversationId) p.onOpenChat(i.conversationId);
    else setOpen(i);
  };

  return (
    <main className="main create">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-btn only-mobile" onClick={p.onOpenSidebar} aria-label="Open menu"><MenuIcon /></button>
          {!p.sidebarOpen && (
            <button className="icon-btn only-desktop" onClick={p.onOpenSidebar} aria-label="Expand sidebar" title="Expand sidebar"><SidebarIcon /></button>
          )}
        </div>
        <h1 className="topbar-title">Library</h1>
        <div className="topbar-right" />
      </header>

      <div className="scroller">
        <div className="create-wrap">
          <div className="segmented mode-switch" role="tablist" aria-label="Library filter">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
                {t.label} <span className="tab-count">{count(t.id)}</span>
              </button>
            ))}
          </div>

          {items.length === 0 ? (
            <div className="library-empty">
              <p>Nothing here yet</p>
              <span>
                {tab === "file"
                  ? "Files you attach in chats will appear here."
                  : "Save images or videos from Images, or attach photos and videos in a chat, and they'll appear here."}
              </span>
            </div>
          ) : (
            <ul className="library-grid">
              {items.map((i) => (
                <li key={i.key} className="lib-card">
                  <button className="lib-thumb" onClick={() => openItem(i)} aria-label={`Open ${kindLabel(i.kind).toLowerCase()} ${i.name}`}>
                    {i.kind === "image" && i.src ? (
                      <img src={i.src} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                    ) : i.kind === "video" && i.src ? (
                      <video src={i.creation ? `${i.src}#t=0.1` : i.src} muted preload="metadata" />
                    ) : (
                      <span className="lib-file"><FileIcon width={28} height={28} /></span>
                    )}
                    <span className="thumb-tag">{kindLabel(i.kind)}</span>
                  </button>
                  <div className="lib-meta">
                    <span className="lib-name" title={i.name}>{i.name}</span>
                    <span className="muted small">
                      {date(i.date)}
                      {i.size ? ` · ${formatBytes(i.size)}` : ""}
                      {i.creation ? " · Generated" : " · Uploaded"}
                    </span>
                  </div>
                  <div className="lib-actions">
                    {i.conversationId && (
                      <button className="link-btn small" onClick={() => p.onOpenChat(i.conversationId!)}>Open chat</button>
                    )}
                    {i.src && (
                      <a className="icon-btn sm" href={i.creation ? `${i.src}?download=1` : i.src} download={i.name} aria-label={`Download ${i.name}`} title="Download">
                        <DownloadIcon width={15} height={15} />
                      </a>
                    )}
                    {i.creation && (
                      <button className="icon-btn sm danger" onClick={() => p.onToggleSave(i.creation!.id, false)} aria-label={`Remove ${i.name} from Library`} title="Remove from Library">
                        <TrashIcon width={15} height={15} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {open && (
        <Modal title={kindLabel(open.kind)} onClose={() => setOpen(null)}>
          {open.creation ? (
            <MediaPreview
              creation={open.creation}
              onToggleSave={() => {
                p.onToggleSave(open.creation!.id, false);
                setOpen(null);
              }}
              onDelete={() => {
                p.onRemoveCreation(open.creation!.id);
                setOpen(null);
              }}
            />
          ) : (
            <figure className="media-preview">
              {open.kind === "image" && open.src ? <img src={open.src} alt={open.name} /> : open.src ? <video src={open.src} controls playsInline /> : null}
              <figcaption className="media-prompt">{open.name}</figcaption>
              <div className="media-actions">
                {open.src && (
                  <a className="btn" href={open.src} download={open.name}><DownloadIcon width={16} height={16} /> Download</a>
                )}
                {open.conversationId && (
                  <button className="btn" onClick={() => { setOpen(null); p.onOpenChat(open.conversationId!); }}>Open chat</button>
                )}
              </div>
            </figure>
          )}
        </Modal>
      )}
    </main>
  );
}

export const LibraryView = memo(LibraryViewImpl);
