import type { Attachment } from "../types";
import { uid } from "./storage";

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const TEXT_EXTENSIONS = [
  "txt", "md", "markdown", "json", "csv", "tsv", "log", "xml", "yaml", "yml", "toml", "ini", "env",
  "js", "jsx", "ts", "tsx", "py", "rb", "go", "rs", "java", "kt", "c", "h", "cpp", "hpp", "cs",
  "php", "swift", "sh", "bash", "sql", "html", "css", "scss", "vue", "svelte",
];

export const ACCEPT = [...IMAGE_TYPES, ...TEXT_EXTENSIONS.map((e) => "." + e)].join(",");

export interface AttachmentLimits {
  maxImageBytes: number;
  maxTextFileChars: number;
}

const readAs = (file: File, mode: "dataURL" | "text") =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    if (mode === "dataURL") r.readAsDataURL(file);
    else r.readAsText(file);
  });

/** Read a user-selected file. Throws an Error with a user-facing message if unsupported. */
export async function readAttachment(file: File, limits: AttachmentLimits): Promise<Attachment> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const base = { id: uid(), name: file.name, mime: file.type || "text/plain", size: file.size };

  if (IMAGE_TYPES.includes(file.type)) {
    if (file.size > limits.maxImageBytes)
      throw new Error(`${file.name} is larger than ${Math.round(limits.maxImageBytes / 1024 / 1024)} MB.`);
    return { ...base, kind: "image", data: await readAs(file, "dataURL") };
  }

  if (TEXT_EXTENSIONS.includes(ext) || file.type.startsWith("text/")) {
    const text = await readAs(file, "text");
    if (text.includes("\u0000")) throw new Error(`${file.name} looks like a binary file.`);
    if (text.length > limits.maxTextFileChars)
      throw new Error(`${file.name} is too long (max ${limits.maxTextFileChars.toLocaleString()} characters).`);
    return { ...base, kind: "text", data: text };
  }

  throw new Error(`${file.name}: unsupported file type. Attach images (PNG, JPEG, WebP, GIF) or text/code files.`);
}

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
