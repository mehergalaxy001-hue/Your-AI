import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { aiProviders } from "../config/aiProviders.js";

/**
 * Generated media is saved on the server's disk and served from /api/media/:file.
 * Files expire after MEDIA_RETENTION_HOURS; expired URLs return 404 which the UI
 * shows as "This result has expired".
 */
const DIR = aiProviders.media.dir;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "video/mp4": "mp4" };
export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]));

/**
 * Save media. When `owner` (a hashed Firebase uid) is given, the file lives in that
 * user's own folder: data/media/u/<owner>/<file>, so users' data is never mixed.
 */
export async function saveMedia(data: Buffer, mime: string, owner?: string): Promise<{ file: string; url: string; mime: string; size: number }> {
  const ext = EXT[mime];
  if (!ext) throw new Error(`Unsupported media type ${mime}`);
  const dir = owner ? path.join(DIR, "u", owner) : DIR;
  await fs.mkdir(dir, { recursive: true });
  const file = `${crypto.randomUUID()}.${ext}`;
  await fs.writeFile(path.join(dir, file), data);
  void cleanup(dir);
  return { file, url: owner ? `/api/media/u/${owner}/${file}` : `/api/media/${file}`, mime, size: data.length };
}

/** Resolve a stored file name safely (no path traversal). */
export function mediaPath(file: string, owner?: string): string | null {
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp|mp4)$/.test(file)) return null;
  if (owner !== undefined && !/^[0-9a-f]{24}$/.test(owner)) return null;
  return owner ? path.join(DIR, "u", owner, file) : path.join(DIR, file);
}

const lastCleanup = new Map<string, number>();
async function cleanup(DIR: string) {
  if (Date.now() - (lastCleanup.get(DIR) ?? 0) < 10 * 60_000) return;
  lastCleanup.set(DIR, Date.now());
  try {
    const files = (await fs.readdir(DIR, { withFileTypes: true })).filter((d) => d.isFile()).map((d) => d.name);
    const stats = await Promise.all(files.map(async (f) => ({ f, s: await fs.stat(path.join(DIR, f)) })));
    const cutoff = Date.now() - aiProviders.media.retentionHours * 3_600_000;
    const sorted = stats.sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
    for (const [i, { f, s }] of sorted.entries()) {
      if (s.mtimeMs < cutoff || i >= aiProviders.media.maxFiles) await fs.rm(path.join(DIR, f), { force: true });
    }
  } catch {
    /* directory may not exist yet */
  }
}

/** Detect real image type from magic bytes (never trust client-provided MIME). */
export function sniffImage(buf: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}
