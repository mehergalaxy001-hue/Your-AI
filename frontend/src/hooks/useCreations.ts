import { useCallback, useEffect, useState } from "react";
import type { Creation } from "../types/media";
import { loadJSON, saveJSON } from "../services/storage";

const KEY = "galaxy-ai.creations.v1";
const MAX = 60;

function load(): Creation[] {
  const raw = loadJSON<{ items: unknown }>(KEY).items;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (c): c is Creation =>
        !!c &&
        typeof c.id === "string" &&
        (c.type === "image" || c.type === "video") &&
        typeof c.prompt === "string" &&
        typeof c.createdAt === "number" &&
        typeof c.resultUrl === "string" &&
        c.resultUrl.startsWith("/api/media/"),
    )
    .slice(0, MAX);
}

/** Local creation history (metadata + server URL only; media bytes stay on the server). */
export function useCreations() {
  const [items, setItems] = useState<Creation[]>(load);
  useEffect(() => saveJSON({ items }, KEY), [items]);

  const add = useCallback((c: Creation) => setItems((xs) => [c, ...xs.filter((x) => x.id !== c.id)].slice(0, MAX)), []);
  const remove = useCallback((id: string) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  return { items, add, remove };
}
