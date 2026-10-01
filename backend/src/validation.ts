import { z } from "zod";
import { config } from "./config.js";

const L = config.limits;
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

const attachmentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("image"),
    name: z.string().min(1).max(255),
    data: z
      .string()
      .regex(IMAGE_DATA_URL, "Unsupported image format")
      // base64 is ~4/3 of the binary size
      .refine((d) => d.length <= Math.ceil((L.maxImageBytes * 4) / 3) + 64, "Image is too large"),
  }),
  z.object({
    kind: z.literal("text"),
    name: z.string().min(1).max(255),
    data: z.string().max(L.maxTextFileChars, "Text file is too large"),
  }),
]);

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(L.maxMessageChars, `Messages are limited to ${L.maxMessageChars} characters`),
  attachments: z.array(attachmentSchema).max(L.maxAttachments).optional(),
});

export const chatRequestSchema = z
  .object({
    model: z.string().min(1).max(100),
    messages: z.array(messageSchema).min(1).max(L.maxMessages),
  })
  .refine((r) => r.messages.at(-1)?.role === "user", "The last message must be from the user")
  .refine(
    (r) => r.messages.reduce((n, m) => n + m.content.length, 0) <= L.maxTotalChars,
    "The conversation is too long. Start a new chat.",
  )
  .refine(
    (r) => r.messages.every((m) => m.content.trim() !== "" || (m.attachments?.length ?? 0) > 0),
    "Messages cannot be empty",
  );

export type ChatRequest = z.infer<typeof chatRequestSchema>;
