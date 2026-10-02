export type Role = "user" | "assistant";
export type AttachmentKind = "image" | "video" | "text" | "pdf";

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: AttachmentKind;
  /** data: URL for images/PDFs, file contents for text. May be dropped if storage is full. */
  data?: string;
}

export interface MessageError {
  code: string;
  message: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  /** Model tier id used for an assistant reply. */
  model?: string;
  error?: MessageError;
  stopped?: boolean;
  feedback?: "up" | "down";
  /** User message was sent with web search enabled. */
  webSearch?: boolean;
  /** Web pages the answer was grounded on (from the search provider). */
  sources?: Source[];
}

export interface Source {
  title: string;
  url: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface ConversationMeta {
  id: string;
  title: string;
  updatedAt: number;
}

export interface ModelOption {
  id: string;
  label: string;
  description: string;
}

export interface Limits {
  maxMessages: number;
  maxMessageChars: number;
  maxTotalChars: number;
  maxAttachments: number;
  maxImageBytes: number;
  maxPdfBytes: number;
  maxVideoBytes: number;
  maxTextFileChars: number;
}

export interface ServerConfig {
  configured: boolean;
  provider: string | null;
  models: ModelOption[];
  defaultModel: string;
  limits: Limits;
}

export type ThemePref = "light" | "dark" | "system";

export interface Settings {
  theme: ThemePref;
  model: string;
  enterToSend: boolean;
}
