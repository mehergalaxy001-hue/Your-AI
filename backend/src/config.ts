import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));

// Load the repo-root .env first, then an optional backend/.env. Existing
// process env vars always win (dotenv never overrides them).
dotenv.config({ path: path.resolve(here, "../../.env"), quiet: true });
dotenv.config({ path: path.resolve(here, "../.env"), quiet: true });

function clean(value: string | undefined): string {
  const v = (value ?? "").trim();
  // Treat the placeholder from .env.example as "not configured".
  return v === "" || v.startsWith("sk-your-") ? "" : v;
}

const models = (process.env.OPENAI_MODELS ?? "gpt-5-mini,gpt-5,gpt-4.1-mini")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const defaultModel =
  process.env.OPENAI_DEFAULT_MODEL?.trim() && models.includes(process.env.OPENAI_DEFAULT_MODEL.trim())
    ? process.env.OPENAI_DEFAULT_MODEL.trim()
    : models[0];

export const config = {
  port: Number(process.env.PORT ?? 3001),
  apiKey: clean(process.env.OPENAI_API_KEY),
  baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
  models,
  defaultModel,
  systemPrompt:
    process.env.SYSTEM_PROMPT?.trim() ||
    "You are Your-AI, a helpful, precise assistant. Format answers with Markdown when useful and use fenced code blocks with a language tag for code.",
  staticDir: process.env.STATIC_DIR?.trim() || path.resolve(here, "../../frontend/dist"),
  limits: {
    maxMessages: 60,
    maxMessageChars: 32_000,
    maxTotalChars: 200_000,
    maxAttachments: 4,
    maxImageBytes: 4 * 1024 * 1024,
    maxTextFileChars: 100_000,
  },
};
