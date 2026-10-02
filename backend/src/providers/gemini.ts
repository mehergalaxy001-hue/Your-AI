import { GoogleGenAI, type Content, type Part } from "@google/genai";
import type { ChatProvider, StreamParams } from "./types.js";
import { withTextAttachments } from "./types.js";

const splitDataUrl = (url: string) => {
  const m = /^data:([^;]+);base64,(.*)$/.exec(url);
  return m ? { mimeType: m[1], data: m[2] } : null;
};

export function createGeminiProvider(apiKey: string): ChatProvider {
  const ai = new GoogleGenAI({ apiKey });

  return {
    id: "gemini",
    async stream({ model, system, messages, signal, onDelta }: StreamParams) {
      const contents: Content[] = messages.map((m) => {
        if (m.role === "assistant") return { role: "model", parts: [{ text: m.content }] };
        const parts: Part[] = [];
        const text = withTextAttachments(m);
        if (text) parts.push({ text });
        for (const a of m.attachments ?? []) {
          if (a.kind === "image" || a.kind === "pdf") {
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
        config: { systemInstruction: system, abortSignal: signal },
      });
      for await (const chunk of stream) {
        if (signal.aborted) break;
        const t = chunk.text;
        if (t) onDelta(t);
      }
    },
  };
}
