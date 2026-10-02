import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));

// Load repo-root .env, then optional backend/.env. Real env vars always win.
dotenv.config({ path: path.resolve(here, "../../.env"), quiet: true });
dotenv.config({ path: path.resolve(here, "../.env"), quiet: true });

/** Treat blanks and documented placeholders as "not configured". */
function secret(name: string): string {
  const v = (process.env[name] ?? "").trim();
  return v === "" || /^(your-|sk-your-|replace-me)/i.test(v) ? "" : v;
}

export type ProviderId = "gemini" | "openai";

const keys = { gemini: secret("GEMINI_API_KEY"), openai: secret("OPENAI_API_KEY") };

function pickProvider(): ProviderId | null {
  const wanted = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (wanted === "gemini" || wanted === "openai") return keys[wanted] ? wanted : null;
  if (keys.gemini) return "gemini";
  if (keys.openai) return "openai";
  return null;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  provider: pickProvider(),
  keys,
  openaiBaseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
  systemPrompt:
    process.env.SYSTEM_PROMPT?.trim() ||
    "You are Galaxy AI, a helpful, accurate and friendly assistant. Format answers with Markdown when it improves readability, and always use fenced code blocks with a language tag for code. If you are unsure, say so.",
  staticDir: process.env.STATIC_DIR?.trim() || path.resolve(here, "../../frontend/dist"),
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 30),
  limits: {
    maxMessages: 80,
    maxMessageChars: 32_000,
    maxTotalChars: 240_000,
    maxAttachments: 5,
    maxImageBytes: 5 * 1024 * 1024,
    maxPdfBytes: 10 * 1024 * 1024,
    maxVideoBytes: 15 * 1024 * 1024,
    maxTextFileChars: 120_000,
  },
};
