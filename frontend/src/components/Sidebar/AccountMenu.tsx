import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { SettingsIcon } from "../UI/Icons";

/** Account menu in the sidebar footer: Firebase profile, Settings, Sign out. */
export function AccountMenu({ user, onSettings, onSignOut }: { user: User; onSettings: () => void; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const name = user.displayName || user.email?.split("@")[0] || "Account";
  const initial = (user.displayName || user.email || "?").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const avatar = user.photoURL && imgOk ? (
    <img className="avatar-img" src={user.photoURL} alt="" referrerPolicy="no-referrer" onError={() => setImgOk(false)} />
  ) : (
    <span className="avatar-img fallback" aria-hidden>{initial}</span>
  );

  return (
    <div className="account" ref={ref}>
      {open && (
        <div className="account-menu" role="menu">
          <div className="account-head">
            {avatar}
            <div className="account-id">
              <strong>{name}</strong>
              {user.email && <span className="muted small">{user.email}</span>}
            </div>
          </div>
          <button role="menuitem" className="menu-item" onClick={() => { setOpen(false); onSettings(); }}>
            <SettingsIcon width={16} height={16} /> Settings
          </button>
          <button role="menuitem" className="menu-item" onClick={() => { setOpen(false); onSignOut(); }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            Sign out
          </button>
        </div>
      )}
      <button className="account-trigger" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        {avatar}
        <span className="account-name">{name}</span>
      </button>
    </div>
  );
}
