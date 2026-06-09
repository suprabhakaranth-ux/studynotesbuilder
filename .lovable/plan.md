# Fix: Ollama "unreachable" — mixed content block

## Root cause

Your app is served from `https://id-preview--…lovable.app` (and `https://studynotesbuilder.lovable.app`). The current code calls `http://localhost:11434` directly. Every modern browser **silently blocks** HTTP requests from an HTTPS page (mixed active content). The fetch never reaches Ollama — that's why:

- Ollama logs show nothing
- `ping()` returns `false`
- The toast just says "unreachable" with no useful network entry

It is **not** a CORS issue, not a model name issue, and the code is correctly hitting Ollama (not Gemini). It's the HTTPS→HTTP downgrade that's blocked.

## The fix: local HTTPS proxy in front of Ollama

You run a tiny HTTPS reverse proxy on your machine that terminates TLS and forwards to `http://127.0.0.1:11434`. The browser then talks `https://localhost:11435 → proxy → Ollama`, no mixed content.

We'll use **Caddy** (simplest — one line of config, auto-generates a locally-trusted cert via its internal CA).

### Step 1 — One-time setup on your Mac/PC (you run this, not me)

```bash
brew install caddy            # or: choco install caddy / apt install caddy
```

Create `Caddyfile` somewhere convenient:

```caddy
{
  local_certs
}

localhost:11435 {
  reverse_proxy 127.0.0.1:11434 {
    header_up Host {upstream_hostport}
  }
  header {
    Access-Control-Allow-Origin "*"
    Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Access-Control-Allow-Headers "Content-Type"
  }
  @options method OPTIONS
  respond @options 204
}
```

Run it once:

```bash
sudo caddy run --config ./Caddyfile
```

First run, Caddy installs its root CA into your system trust store (you'll be prompted). After that, `https://localhost:11435` is trusted by Chrome/Safari/Firefox with no warnings.

Verify:

```bash
curl https://localhost:11435/api/tags
```

Ollama itself still only needs `OLLAMA_ORIGINS="*" ollama serve` (or just `ollama serve` since the proxy is same-origin to Ollama).

### Step 2 — App changes (I'll do these in build mode)

**`src/lib/ai/ollamaService.ts`**
- Change `DEFAULT_BASE_URL` from `http://localhost:11434` → `https://localhost:11435`.
- In `ping()` and `streamChat()`, on failure, capture and rethrow the underlying error with detail:
  - `TypeError: Failed to fetch` → message: "Browser blocked the connection. Likely mixed content (HTTP from an HTTPS page) or the HTTPS proxy isn't running. Expected `https://localhost:11435`."
  - Also `console.error("[ollama] fetch failed", { baseUrl, error })` so the real error shows in DevTools.
- Add a one-time **mixed-content guard**: if `window.location.protocol === "https:"` and the configured `baseUrl` starts with `http://`, immediately throw a clear error instead of attempting the fetch (browsers don't even surface the block consistently).

**`src/components/assistant/OllamaStatusBadge.tsx`**
- When status is `down`, tooltip explains: "Browser cannot reach Ollama. Start the local HTTPS proxy (`https://localhost:11435 → 127.0.0.1:11434`) — see the Settings popover for the one-line Caddy command."
- Add a small "Test connection" button in the badge popover that runs `ping()` and prints the exact error to a toast (not just "unreachable").

**`src/components/assistant/OllamaSettingsPopover.tsx`**
- Update default placeholder to `https://localhost:11435`.
- Inline help text: short Caddyfile snippet + `caddy run` command, plus a note that the URL must be `https://` when the app is opened over HTTPS.
- Add a "Test now" button that calls `ping()` and surfaces the real error message.

**`.lovable/plan.md`**
- Update the "Important caveat" section to document the HTTPS-proxy requirement and link the Caddyfile.

### Step 3 — Verify

1. Start Caddy → `curl https://localhost:11435/api/tags` returns JSON.
2. Open `/assistant` → status badge turns green within ~1s.
3. Send a message → streamed response appears.
4. Stop Caddy → badge turns red, "Test connection" shows the exact `TypeError: Failed to fetch` in a toast and `console.error` logs the full payload.
5. Temporarily set baseUrl back to `http://localhost:11434` in settings → guard throws "Mixed content blocked" immediately, no silent failure.

## What we are NOT changing

- AI service is already pure Ollama (`ollamaService` in `useAssistantChat`) — no Gemini/Lovable AI fallback is in the path. Confirmed in `src/hooks/useAssistantChat.ts`.
- Model name handling is fine — it's read from `localStorage` (`ollama.model`, default `llama3.1:8b`) and sent as `model` in the request body. No change needed unless you've pulled a different tag.
- No backend / edge function changes. No database changes.

## Why not the alternatives

- **Chrome insecure-origin flag** — works but only in one launched Chrome instance with a custom profile; easy to forget; doesn't help Safari/Firefox.
- **Run the app over HTTP locally** — the Lovable preview is always HTTPS, so this isn't an option without leaving the preview.
- **Cloudflare tunnel / ngrok to Ollama** — works, but exposes your local model to the internet and adds latency.

