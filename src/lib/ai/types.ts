export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type ContextFilter =
  | { type: "all" }
  | { type: "subject"; subjectId: string }
  | { type: "chapter"; subjectId: string; chapterId: string }
  | { type: "topic"; subjectId: string; chapterId?: string; topicId: string };

export interface StreamChatParams {
  messages: ChatMessage[];
  systemPrompt: string;
  signal?: AbortSignal;
  onToken: (delta: string) => void;
}

export type PingResult = { ok: boolean; baseUrl?: string; error?: string };

export interface AIService {
  name: string;
  /** Returns the full assistant text once streaming completes. */
  streamChat: (params: StreamChatParams) => Promise<string>;
  /** Quick liveness check. */
  ping: () => Promise<boolean>;
  /** Liveness check with the underlying error message when it fails. */
  pingDetailed: () => Promise<PingResult>;
}
