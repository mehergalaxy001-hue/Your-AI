import { GoogleGenAI, type Content, type Part } from "@google/genai";
import type { ChatProvider, Source, StreamParams } from "./types.js";
import { withTextAttachments } from "./types.js";

const splitDataUrl = (url: string) => {
  const m = /^data:([^;]+);base64,(.*)$/.exec(url);
  return m ? { mimeType: m[1], data: m[2] } : null;
};

export function createGeminiProvider(apiKey: string): ChatProvider {
  const ai = new GoogleGenAI({ apiKey });

  return {
    id: "gemini",
    supports: { webSearch: true, video: true },
    async stream({ model, system, messages, signal, onDelta, webSearch, onSources }: StreamParams) {
      const contents: Content[] = messages.map((m) => {
        if (m.role === "assistant") return { role: "model", parts: [{ text: m.content }] };
        const parts: Part[] = [];
        const text = withTextAttachments(m);
        if (text) parts.push({ text });
        for (const a of m.attachments ?? []) {
          if (a.kind === "image" || a.kind === "pdf" || a.kind === "video") {
            const inline = splitDataUrl(a.data);
            if (inline) parts.push({ inlineData: inline });
          }
        }
        if (parts.length === 0) parts.push({ text: "(empty message)" });
        return { role: "user", parts };
      });

      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: { systemInstruction: system, abortSignal: signal, ...(webSearch ? { tools: [{ googleSearch: {} }] } : {}) },
      });
      // Google Search grounding returns the web pages it used; collect them as citations.
      const sources = new Map<string, Source>();
      for await (const chunk of stream) {
        if (signal.aborted) break;
        const t = chunk.text;
        if (t) onDelta(t);
        for (const g of chunk.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) {
          const url = g.web?.uri;
          if (url && /^https?:\/\//.test(url) && !sources.has(url)) sources.set(url, { url, title: (g.web?.title || new URL(url).hostname).slice(0, 200) });
        }
      }
      if (sources.size && onSources) onSources([...sources.values()].slice(0, 10));
    },
  };
}
