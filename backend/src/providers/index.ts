import { config } from "../config.js";
import type { ChatProvider } from "./types.js";
import { createGeminiProvider } from "./gemini.js";
import { createOpenAIProvider } from "./openai.js";

let instance: ChatProvider | null | undefined;

/** Returns the configured provider, or null when no API key is set. */
export function getProvider(): ChatProvider | null {
  if (instance !== undefined) return instance;
  if (config.provider === "gemini") instance = createGeminiProvider(config.keys.gemini);
  else if (config.provider === "openai") instance = createOpenAIProvider(config.keys.openai, config.openaiBaseURL);
  else instance = null;
  return instance;
}
