export type Role = "user" | "assistant";
export type AttachmentKind = "image" | "text";

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: AttachmentKind;
  /** data: URL for images, file contents for text files. May be dropped if storage is full. */
  data?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  attachments?: Attachment[];
  model?: string;
  /** User-facing error shown instead of / after content. */
  error?: string;
  stopped?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface ServerConfig {
  configured: boolean;
  models: string[];
  defaultModel: string;
  limits: {
    maxMessages: number;
    maxMessageChars: number;
    maxAttachments: number;
    maxImageBytes: number;
    maxTextFileChars: number;
  };
}

export type ThemePref = "light" | "dark" | "system";
