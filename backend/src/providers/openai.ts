import OpenAI from "openai";
import type { ChatCompletionContentPart, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ChatProvider, StreamParams } from "./types.js";
import { withTextAttachments } from "./types.js";

export function createOpenAIProvider(apiKey: string, baseURL?: string): ChatProvider {
  const client = new OpenAI({ apiKey, baseURL });

  return {
    id: "openai",
    supports: { webSearch: false, video: false },
    async stream({ model, system, messages, signal, onDelta }: StreamParams) {
      const out: ChatCompletionMessageParam[] = [{ role: "system", content: system }];
      for (const m of messages) {
        if (m.role === "assistant") {
          out.push({ role: "assistant", content: m.content });
          continue;
        }
        const text = withTextAttachments(m);
        const binary = (m.attachments ?? []).filter((a) => a.kind !== "text");
        if (binary.length === 0) {
          out.push({ role: "user", content: text });
          continue;
        }
        const parts: ChatCompletionContentPart[] = [{ type: "text", text: text || "(see attachments)" }];
        for (const a of binary) {
          if (a.kind === "image") parts.push({ type: "image_url", image_url: { url: a.data } });
          else if (a.kind === "pdf") parts.push({ type: "file", file: { filename: a.name, file_data: a.data } });
        }
        out.push({ role: "user", content: parts });
      }

      const stream = await client.chat.completions.create({ model, messages: out, stream: true }, { signal });
      for await (const chunk of stream) {
        const d = chunk.choices[0]?.delta?.content;
        if (d) onDelta(d);
      }
    },
  };
}
