import { memo, useEffect, useRef, useState } from "react";
import type { ModelOption } from "../../types";
import { CheckIcon, ChevronDownIcon, ComposeIcon, EraserIcon, MenuIcon, MoreIcon, SettingsIcon, SidebarIcon } from "../UI/Icons";

interface Props {
  title: string;
  sidebarOpen: boolean;
  models: ModelOption[];
  model: string;
  modelDisabled: boolean;
  canClear: boolean;
  onOpenSidebar: () => void;
  onNew: () => void;
  onModel: (id: string) => void;
  onClear: () => void;
  onSettings: () => void;
}

function ModelSelector({ models, model, disabled, onModel }: { models: ModelOption[]; model: string; disabled: boolean; onModel: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = models.find((m) => m.id === model);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="model-select" ref={ref}>
      <button
        className="model-trigger"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || models.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Model: ${current?.label ?? "loading"}`}
      >
        <span><span className="model-prefix">Galaxy </span><b>{current?.label ?? "…"}</b></span>
        <ChevronDownIcon width={16} height={16} />
      </button>
      {open && (
        <ul className="menu" role="listbox" aria-label="Choose a model">
          {models.map((m) => (
            <li key={m.id}>
              <button
                role="option"
                aria-selected={m.id === model}
                className="menu-item model-option"
                onClick={() => {
                  onModel(m.id);
                  setOpen(false);
                }}
              >
                <span>
                  <strong>{m.label}</strong>
                  <small>{m.description}</small>
                </span>
                {m.id === model && <CheckIcon width={16} height={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChatHeaderImpl(p: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => !moreRef.current?.contains(e.target as Node) && setMoreOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moreOpen]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn only-mobile" onClick={p.onOpenSidebar} aria-label="Open menu">
          <MenuIcon />
        </button>
        {!p.sidebarOpen && (
          <>
            <button className="icon-btn only-desktop" onClick={p.onOpenSidebar} aria-label="Expand sidebar" title="Expand sidebar">
              <SidebarIcon />
            </button>
            <button className="icon-btn only-desktop" onClick={p.onNew} aria-label="New chat" title="New chat">
              <ComposeIcon />
            </button>
          </>
        )}
        <ModelSelector models={p.models} model={p.model} disabled={p.modelDisabled} onModel={p.onModel} />
      </div>

      <h1 className="topbar-title" title={p.title}>{p.title}</h1>

      <div className="topbar-right">
        <button className="icon-btn only-desktop" onClick={p.onClear} disabled={!p.canClear} aria-label="Clear conversation" title="Clear conversation">
          <EraserIcon />
        </button>
        <button className="icon-btn only-desktop" onClick={p.onSettings} aria-label="Settings" title="Settings">
          <SettingsIcon />
        </button>
        <div className="only-mobile more" ref={moreRef}>
          <button className="icon-btn" onClick={() => setMoreOpen((o) => !o)} aria-label="More options" aria-haspopup="menu" aria-expanded={moreOpen}>
            <MoreIcon />
          </button>
          {moreOpen && (
            <div className="menu right" role="menu">
              <button role="menuitem" className="menu-item" onClick={() => { setMoreOpen(false); p.onNew(); }}><ComposeIcon width={16} height={16} /> New chat</button>
              <button role="menuitem" className="menu-item" disabled={!p.canClear} onClick={() => { setMoreOpen(false); p.onClear(); }}><EraserIcon width={16} height={16} /> Clear conversation</button>
              <button role="menuitem" className="menu-item" onClick={() => { setMoreOpen(false); p.onSettings(); }}><SettingsIcon width={16} height={16} /> Settings</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export const ChatHeader = memo(ChatHeaderImpl);
