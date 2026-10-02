export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function titleFrom(text: string): string {
  const t = text.replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim();
  if (!t) return "New chat";
  return t.length > 50 ? t.slice(0, 49).trimEnd() + "…" : t;
}

export const formatBytes = (n: number): string =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export function groupLabel(ts: number): string {
  const day = 86_400_000;
  const start = new Date().setHours(0, 0, 0, 0);
  if (ts >= start) return "Today";
  if (ts >= start - day) return "Yesterday";
  if (ts >= start - 7 * day) return "Previous 7 days";
  if (ts >= start - 30 * day) return "Previous 30 days";
  return "Older";
}
