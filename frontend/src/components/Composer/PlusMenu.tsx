import { useEffect, useRef, useState } from "react";
import { CheckIcon, FileIcon, GlobeIcon, PhotoIcon, PlusIcon, SparkleIcon } from "../UI/Icons";

interface Props {
  disabled: boolean;
  webSearch: boolean;
  onPhotos: () => void;
  onFiles: () => void;
  onWebSearch: () => void;
  onCreateImage: () => void;
}

/** "+" action menu beside the composer. Closes on outside click, Escape, or selection. */
export function PlusMenu({ disabled, webSearch, onPhotos, onFiles, onWebSearch, onCreateImage }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLButtonElement>(".plus-item")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  // Arrow-key navigation between items.
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>(".plus-item") ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };

  return (
    <div className="plus" ref={ref}>
      <button
        ref={trigger}
        type="button"
        className={`icon-btn plus-trigger ${open ? "on" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Add photos, files and more"
        title="Add photos, files and more"
        disabled={disabled}
      >
        <PlusIcon />
      </button>
      {open && (
        <div className="plus-menu" role="menu" aria-label="Add to message" onKeyDown={onMenuKey}>
          <button type="button" role="menuitem" className="plus-item" onClick={pick(onPhotos)}>
            <PhotoIcon /> Photos and videos
          </button>
          <button type="button" role="menuitem" className="plus-item" onClick={pick(onFiles)}>
            <FileIcon /> Files
          </button>
          <button type="button" role="menuitemcheckbox" aria-checked={webSearch} className="plus-item" onClick={pick(onWebSearch)}>
            <GlobeIcon /> Web search {webSearch && <CheckIcon className="plus-check" width={16} height={16} />}
          </button>
          <button type="button" role="menuitem" className="plus-item" onClick={pick(onCreateImage)}>
            <SparkleIcon /> Create image
          </button>
        </div>
      )}
    </div>
  );
}
