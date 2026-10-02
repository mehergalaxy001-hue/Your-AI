import { useEffect, useState } from "react";

/** Minimal History-API router (no extra dependency). */
export function navigate(to: string, replace = false): void {
  if (to === window.location.pathname + window.location.hash) return;
  if (replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const on = () => setPath(window.location.pathname);
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return path;
}

export const PROTECTED = ["/app", "/chat"];
export const isProtected = (p: string) => PROTECTED.some((r) => p === r || p.startsWith(r + "/"));
