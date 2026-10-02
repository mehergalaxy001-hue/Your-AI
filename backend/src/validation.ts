import { z } from "zod";
import { config } from "./config.js";

const L = config.limits;
const b64Len = (bytes: number) => Math.ceil((bytes * 4) / 3) + 64;

const attachmentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("image"),
    name: z.string().min(1).max(255),
    data: z
      .string()
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Unsupported image format")
      .max(b64Len(L.maxImageBytes), "Image is too large"),
  }),
  z.object({
    kind: z.literal("pdf"),
    name: z.string().min(1).max(255),
    data: z
      .string()
      .regex(/^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/, "Invalid PDF data")
      .max(b64Len(L.maxPdfBytes), "PDF is too large"),
  }),
  z.object({
    kind: z.literal("video"),
    name: z.string().min(1).max(255),
    data: z
      .string()
      .regex(/^data:video\/(mp4|webm|quicktime);base64,[A-Za-z0-9+/=]+$/, "Unsupported video format")
      .max(b64Len(L.maxVideoBytes), "Video is too large"),
  }),
  z.object({
    kind: z.literal("text"),
    name: z.string().min(1).max(255),
    data: z.string().max(L.maxTextFileChars, "Text file is too large"),
  }),
]);

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(L.maxMessageChars, `Messages are limited to ${L.maxMessageChars.toLocaleString()} characters`),
  attachments: z.array(attachmentSchema).max(L.maxAttachments, `At most ${L.maxAttachments} attachments per message`).optional(),
});

export const chatRequestSchema = z
  .object({
    model: z.string().min(1).max(40),
    webSearch: z.boolean().optional(),
    messages: z.array(messageSchema).min(1, "No messages provided").max(L.maxMessages, "Conversation is too long"),
  })
  .refine((r) => r.messages.at(-1)?.role === "user", "The last message must be from the user")
  .refine((r) => r.messages.reduce((n, m) => n + m.content.length, 0) <= L.maxTotalChars, "The conversation is too long. Start a new chat.")
  .refine((r) => r.messages.every((m) => m.content.trim() !== "" || (m.attachments?.length ?? 0) > 0), "Messages cannot be empty");

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatMessage = ChatRequest["messages"][number];
