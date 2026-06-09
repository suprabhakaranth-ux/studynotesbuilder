import type { AIService, StreamChatParams } from "./types";

const LS_BASE_URL = "ollama.baseUrl";
const LS_MODEL = "ollama.model";
const DEFAULT_BASE_URL = "https://localhost:11435";
const DEFAULT_MODEL = "llama3.1:8b";
const LEGACY_HTTP_DEFAULT = "http://localhost:11434";

export const getOllamaConfig = () => {
  let baseUrl =
    (typeof window !== "undefined" && localStorage.getItem(LS_BASE_URL)) || DEFAULT_BASE_URL;
  // Auto-migrate the old HTTP default so existing users aren't stuck on mixed-content.
  if (baseUrl === LEGACY_HTTP_DEFAULT) {
    baseUrl = DEFAULT_BASE_URL;
    if (typeof window !== "undefined") localStorage.setItem(LS_BASE_URL, baseUrl);
  }
  const model =
    (typeof window !== "undefined" && localStorage.getItem(LS_MODEL)) || DEFAULT_MODEL;
  return { baseUrl: baseUrl.replace(/\/$/, ""), model };
};

export const setOllamaConfig = (cfg: { baseUrl?: string; model?: string }) => {
  if (cfg.baseUrl !== undefined) localStorage.setItem(LS_BASE_URL, cfg.baseUrl);
  if (cfg.model !== undefined) localStorage.setItem(LS_MODEL, cfg.model);
};

const mixedContentGuard = (baseUrl: string) => {
  if (typeof window === "undefined") return;
  if (window.location.protocol === "https:" && baseUrl.startsWith("http://")) {
    throw new Error(
      `Mixed content blocked: this page is HTTPS but Ollama is configured at ${baseUrl}. ` +
        `Run the local HTTPS proxy and set the base URL to https://localhost:11435 in Ollama settings.`,
    );
  }
};

const describeFetchError = (err: unknown, baseUrl: string): Error => {
  const raw = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error("[ollama] fetch failed", { baseUrl, error: err });
  if (err instanceof DOMException && err.name === "AbortError") {
    return err;
  }
  if (raw.includes("Failed to fetch") || raw.includes("NetworkError") || raw.includes("Load failed")) {
    return new Error(
      `Browser could not reach Ollama at ${baseUrl}. Common causes: ` +
        `(1) the local HTTPS proxy (Caddy on https://localhost:11435) isn't running, ` +
        `(2) Caddy's local root cert isn't trusted yet — open ${baseUrl}/api/tags once in this browser and accept the cert, ` +
        `(3) mixed-content block (HTTPS page calling HTTP). Original error: ${raw}`,
    );
  }
  return new Error(`Ollama error: ${raw}`);
};

export const ollamaService: AIService = {
  name: "ollama",

  async ping() {
    try {
      const { baseUrl } = getOllamaConfig();
      mixedContentGuard(baseUrl);
      const res = await fetch(`${baseUrl}/api/tags`, { method: "GET" });
      return res.ok;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[ollama] ping failed", err);
      return false;
    }
  },

  async pingDetailed() {
    const { baseUrl } = getOllamaConfig();
    try {
      mixedContentGuard(baseUrl);
      const res = await fetch(`${baseUrl}/api/tags`, { method: "GET" });
      if (!res.ok) {
        return { ok: false as const, error: `HTTP ${res.status} from ${baseUrl}/api/tags` };
      }
      return { ok: true as const, baseUrl };
    } catch (err) {
      return { ok: false as const, error: describeFetchError(err, baseUrl).message };
    }
  },

  async streamChat({ messages, systemPrompt, signal, onToken }: StreamChatParams) {
    const { baseUrl, model } = getOllamaConfig();
    mixedContentGuard(baseUrl);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          model,
          stream: true,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        }),
      });
    } catch (err) {
      throw describeFetchError(err, baseUrl);
    }

    if (!res.ok || !res.body) {
      throw new Error(
        `Ollama request failed (${res.status}) at ${baseUrl}. Make sure the HTTPS proxy is running and the model "${model}" is pulled (\`ollama pull ${model}\`).`,
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
