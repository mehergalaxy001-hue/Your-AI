import { config, type ProviderId } from "./config.js";

/**
 * Centralized model catalogue. The UI only ever sees the tier ids/labels;
 * each tier maps to a concrete provider model, overridable via env:
 *   MODEL_FAST, MODEL_BALANCED, MODEL_ADVANCED
 */
export interface ModelTier {
  id: "fast" | "balanced" | "advanced";
  label: string;
  description: string;
}

export const TIERS: ModelTier[] = [
  { id: "fast", label: "Fast", description: "Quick answers for everyday tasks" },
  { id: "balanced", label: "Balanced", description: "Great quality at good speed" },
  { id: "advanced", label: "Advanced", description: "Deeper reasoning for complex work" },
];

const DEFAULTS: Record<ProviderId, Record<ModelTier["id"], string>> = {
  gemini: { fast: "gemini-flash-lite-latest", balanced: "gemini-3.5-flash", advanced: "gemini-pro-latest" },
  openai: { fast: "gpt-5-nano", balanced: "gpt-5-mini", advanced: "gpt-5" },
};

export const DEFAULT_TIER: ModelTier["id"] = "balanced";

export function resolveModel(tier: string): string | null {
  const t = TIERS.find((x) => x.id === tier);
  if (!t || !config.provider) return null;
  const override = process.env[`MODEL_${t.id.toUpperCase()}`]?.trim();
  return override || DEFAULTS[config.provider][t.id];
}
