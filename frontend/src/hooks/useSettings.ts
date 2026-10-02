import { useCallback, useEffect, useState } from "react";
import type { Settings, ThemePref } from "../types";
import { loadJSON, saveJSON } from "../services/storage";

const DEFAULTS: Settings = { theme: "dark", model: "", enterToSend: true };
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function initial(): Settings {
  const s = loadJSON<Settings>();
  return {
    theme: s.theme === "light" || s.theme === "dark" || s.theme === "system" ? s.theme : DEFAULTS.theme,
    model: typeof s.model === "string" ? s.model : DEFAULTS.model,
    enterToSend: typeof s.enterToSend === "boolean" ? s.enterToSend : DEFAULTS.enterToSend,
  };
}

export function resolveTheme(pref: ThemePref): "light" | "dark" {
  return pref === "system" ? (media().matches ? "dark" : "light") : pref;
}

/** User preferences persisted to localStorage. Applies the theme to <html>. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(initial);

  useEffect(() => saveJSON(settings), [settings]);

  useEffect(() => {
    const apply = () => {
      const t = resolveTheme(settings.theme);
      document.documentElement.dataset.theme = t;
      try { localStorage.setItem("galaxy-ai.theme-hint", t); } catch { /* ignore */ }
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#0d0d12" : "#ffffff");
    };
    apply();
    if (settings.theme !== "system") return;
    const mq = media();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  return { settings, set };
}
