import { memo } from "react";
import type { Creation } from "../../types/media";
import { TrashIcon } from "../UI/Icons";

interface Props {
  items: Creation[];
  activeId: string | null;
  onOpen: (c: Creation) => void;
  onRemove: (id: string) => void;
}

/** Recent creations (stored locally as metadata + server URL). */
function CreationHistoryImpl({ items, activeId, onOpen, onRemove }: Props) {
  if (!items.length) return null;
  return (
    <section className="history-strip" aria-label="Recent creations">
      <h3 className="gen-label">Recent</h3>
      <ul>
        {items.map((c) => (
          <li key={c.id} className={c.id === activeId ? "active" : ""}>
            <button className="thumb" onClick={() => onOpen(c)} title={c.prompt} aria-label={`Open ${c.type}: ${c.prompt}`}>
              {c.type === "image" ? (
                <img src={c.resultUrl} alt="" loading="lazy" onError={(e) => ((e.currentTarget.style.visibility = "hidden"))} />
              ) : (
                <video src={`${c.resultUrl}#t=0.1`} muted preload="metadata" />
              )}
              <span className="thumb-tag">{c.type === "image" ? "Image" : "Video"}</span>
            </button>
            <button className="icon-btn xs thumb-remove" onClick={() => onRemove(c.id)} aria-label="Remove from history">
              <TrashIcon width={12} height={12} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const CreationHistory = memo(CreationHistoryImpl);
