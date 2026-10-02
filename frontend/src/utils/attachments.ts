import type { Attachment, Limits } from "../types";
import { uid } from "./format";

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const TEXT_EXTENSIONS = [
  "txt", "md", "markdown", "json", "csv", "tsv", "log", "xml", "yaml", "yml", "toml", "ini",
  "js", "jsx", "ts", "tsx", "py", "rb", "go", "rs", "java", "kt", "c", "h", "cpp", "hpp", "cs",
  "php", "swift", "sh", "bash", "sql", "html", "css", "scss", "vue", "svelte",
];

export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const VIDEO_EXT: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };

/** "Photos and videos" picker. */
export const ACCEPT_MEDIA = [...IMAGE_TYPES, ...VIDEO_TYPES, ".png", ".jpg", ".jpeg", ".webp", ".mp4", ".webm", ".mov"].join(",");
/** "Files" picker (documents + text/code). */
export const ACCEPT_FILES = ["application/pdf", ".pdf", ".docx", ".doc", ...TEXT_EXTENSIONS.map((e) => "." + e)].join(",");

const read = (file: File, mode: "dataURL" | "text") =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    if (mode === "dataURL") r.readAsDataURL(file);
    else r.readAsText(file);
  });

const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;

/** Read a user-selected file. Throws an Error with a user-facing message if unsupported. */
export async function readAttachment(file: File, limits: Limits): Promise<Attachment> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const base = { id: uid(), name: file.name, size: file.size };

  if (IMAGE_TYPES.includes(file.type)) {
    if (file.size > limits.maxImageBytes) throw new Error(`${file.name} is larger than ${mb(limits.maxImageBytes)}.`);
    return { ...base, mime: file.type, kind: "image", data: await read(file, "dataURL") };
  }
  if (VIDEO_TYPES.includes(file.type) || VIDEO_EXT[ext]) {
    if (file.size > limits.maxVideoBytes) throw new Error(`${file.name} is larger than ${mb(limits.maxVideoBytes)}.`);
    const mime = VIDEO_TYPES.includes(file.type) ? file.type : VIDEO_EXT[ext];
    const data = (await read(file, "dataURL")).replace(/^data:[^;]*;base64,/, `data:${mime};base64,`);
    return { ...base, mime, kind: "video", data };
  }
  if (ext === "doc" || ext === "docx")
    throw new Error(`${file.name}: Word documents can't be read by the AI yet. Save it as PDF or TXT and attach that instead.`);
  if (file.type === "application/pdf" || ext === "pdf") {
    if (file.size > limits.maxPdfBytes) throw new Error(`${file.name} is larger than ${mb(limits.maxPdfBytes)}.`);
    const data = await read(file, "dataURL");
    // Some browsers report an empty type; normalize the data URL prefix.
    const normalized = data.replace(/^data:[^;]*;base64,/, "data:application/pdf;base64,");
    return { ...base, mime: "application/pdf", kind: "pdf", data: normalized };
  }
  if (TEXT_EXTENSIONS.includes(ext) || file.type.startsWith("text/")) {
    const text = await read(file, "text");
    if (text.includes("\u0000")) throw new Error(`${file.name} looks like a binary file and can't be read as text.`);
    if (text.length > limits.maxTextFileChars)
      throw new Error(`${file.name} is too long (max ${limits.maxTextFileChars.toLocaleString()} characters).`);
    return { ...base, mime: file.type || "text/plain", kind: "text", data: text };
  }
  throw new Error(`${file.name}: unsupported file type. Attach images (PNG, JPEG, WEBP), videos (MP4, WEBM, MOV), PDFs, or text/CSV/JSON files.`);
}
