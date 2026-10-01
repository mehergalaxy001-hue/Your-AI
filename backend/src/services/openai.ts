import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources/chat/completions";
import { config } from "../config.js";
import type { ChatRequest } from "../validation.js";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  return client;
}

/** Convert the validated request into OpenAI chat messages. */
export function toOpenAIMessages(messages: ChatRequest["messages"]): ChatCompletionMessageParam[] {
  const out: ChatCompletionMessageParam[] = [{ role: "system", content: config.systemPrompt }];

  for (const m of messages) {
    if (m.role === "assistant") {
      out.push({ role: "assistant", content: m.content });
      continue;
    }
    const attachments = m.attachments ?? [];
    let text = m.content;
    for (const a of attachments.filter((a) => a.kind === "text")) {
      text += `\n\n[Attached file: ${a.name}]\n\`\`\`\n${a.data}\n\`\`\``;
    }
    const images = attachments.filter((a) => a.kind === "image");
    if (images.length === 0) {
      out.push({ role: "user", content: text });
    } else {
      const parts: ChatCompletionContentPart[] = [{ type: "text", text: text || "(see attached image)" }];
      for (const img of images) parts.push({ type: "image_url", image_url: { url: img.data } });
      out.push({ role: "user", content: parts });
    }
  }
  return out;
}

export async function streamCompletion(
  req: ChatRequest,
  signal: AbortSignal,
  onDelta: (text: string) => void,
): Promise<void> {
  const stream = await getClient().chat.completions.create(
    { model: req.model, messages: toOpenAIMessages(req.messages), stream: true },
    { signal },
  );
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) onDelta(delta);
  }
}

/** Map any thrown error to a safe, user-facing message (no stack traces / secrets). */
export function friendlyError(err: unknown): { status: number; code: string; message: string } {
  if (err instanceof OpenAI.APIError) {
    const status = err.status ?? 502;
    if (status === 401)
      return { status, code: "invalid_api_key", message: "The OpenAI API key was rejected. Check OPENAI_API_KEY in your .env file." };
    if (status === 429)
      return { status, code: "rate_limited", message: "OpenAI rate limit or quota exceeded. Please wait a moment or check your billing." };
    if (status === 404)
      return { status: 400, code: "model_unavailable", message: "The selected model is not available for this API key." };
    if (status === 400)
      return { status, code: "bad_request", message: "OpenAI rejected the request (it may be too long or contain unsupported content)." };
    return { status: 502, code: "upstream_error", message: "OpenAI returned an error. Please try again." };
  }
  if (err instanceof OpenAI.APIConnectionError)
    return { status: 502, code: "connection_error", message: "Could not reach the OpenAI API. Check your network connection." };
  return { status: 500, code: "internal_error", message: "Something went wrong while generating a response." };
}
