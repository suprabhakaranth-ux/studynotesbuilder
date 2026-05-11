import type { AIService, StreamChatParams } from "./types";

const LS_BASE_URL = "ollama.baseUrl";
const LS_MODEL = "ollama.model";
const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.1:8b";

export const getOllamaConfig = () => {
  const baseUrl =
    (typeof window !== "undefined" && localStorage.getItem(LS_BASE_URL)) || DEFAULT_BASE_URL;
  const model =
    (typeof window !== "undefined" && localStorage.getItem(LS_MODEL)) || DEFAULT_MODEL;
  return { baseUrl: baseUrl.replace(/\/$/, ""), model };
};

export const setOllamaConfig = (cfg: { baseUrl?: string; model?: string }) => {
  if (cfg.baseUrl !== undefined) localStorage.setItem(LS_BASE_URL, cfg.baseUrl);
  if (cfg.model !== undefined) localStorage.setItem(LS_MODEL, cfg.model);
};

export const ollamaService: AIService = {
  name: "ollama",

  async ping() {
    try {
      const { baseUrl } = getOllamaConfig();
      const res = await fetch(`${baseUrl}/api/tags`, { method: "GET" });
      return res.ok;
    } catch {
      return false;
    }
  },

  async streamChat({ messages, systemPrompt, signal, onToken }: StreamChatParams) {
    const { baseUrl, model } = getOllamaConfig();

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model,
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(
        `Ollama request failed (${res.status}). Make sure Ollama is running at ${baseUrl} and the model "${model}" is pulled.`,
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try {
          const parsed = JSON.parse(line);
          const delta: string | undefined = parsed?.message?.content;
          if (delta) {
            full += delta;
            onToken(delta);
          }
        } catch {
          // ignore malformed line
        }
      }
    }

    return full;
  },
};
