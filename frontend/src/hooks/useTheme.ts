import { useEffect, useState } from "react";
import type { ThemePref } from "../types";

const KEY = "yourai.theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(() => {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  });

  useEffect(() => {
    localStorage.setItem(KEY, pref);
    const apply = () => {
      document.documentElement.dataset.theme = pref === "system" ? (media().matches ? "dark" : "light") : pref;
    };
    apply();
    if (pref !== "system") return;
    const mq = media();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pref]);

  return { pref, setPref };
}
