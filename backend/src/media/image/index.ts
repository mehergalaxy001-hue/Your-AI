import { aiProviders } from "../../config/aiProviders.js";
import { createGeminiImageProvider } from "./gemini.js";
import { createPollinationsProvider } from "./pollinations.js";
import type { ImageProvider } from "./types.js";

let instance: ImageProvider | null | undefined;

/** Returns the configured image provider, or null if it is not usable. */
export function getImageProvider(): ImageProvider | null {
  if (instance !== undefined) return instance;
  const { provider, apiKey, model } = aiProviders.image;
  if (provider === "pollinations") instance = createPollinationsProvider(apiKey, model);
  else if (provider === "gemini" && apiKey) instance = createGeminiImageProvider(apiKey, model);
  else instance = null;
  return instance;
}
