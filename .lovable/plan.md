# AI Study Assistant Workspace — Phase 1

A dedicated `/assistant` page that opens from the sidebar's "AI Study Assistant" button. NotebookLM-style full-page workspace with a tabbed shell. Phase 1 ships the shell + the **Ask Across Notes** tool fully working. Quiz Generator and Active Recall appear as disabled "Coming soon" tabs so the architecture is visible but not built.

## Important caveat about Ollama

You picked **Ollama only (local dev)**. Ollama runs on `http://localhost:11434` on your own machine. That means:

- The assistant will work in your browser **only when Ollama is running locally**.
- It will **not work** on the published `studynotesbuilder.lovable.app` site or for any other visitor — their browser cannot reach your localhost.
- CORS must be enabled on your Ollama install: launch with `OLLAMA_ORIGINS="*" ollama serve` (or set the env var permanently).
- The model + base URL will be exposed in client code (it has to be — the browser is the one calling Ollama).

If you later want this to work in production, we swap the Ollama adapter for the existing Lovable AI edge function — the rest of the workspace stays the same.

## Scope (Phase 1)

1. New route `/assistant` with a workspace shell.
2. Sidebar "AI Study Assistant" button now navigates to `/assistant` instead of `/ai-chat`.
3. Three tabs in the shell: **Ask Across Notes**, **Quiz Generator** (disabled), **Active Recall** (disabled).
4. **Ask Across Notes** is fully functional, talking directly to local Ollama.
5. Reuses the existing All / Subject / Chapter / Topic context filter from `useAIChat`.
6. Conversation history persisted in the existing `chat_conversations` / `chat_messages` tables (left rail of conversations, new chat, delete chat).
7. Socratic study-mentor system prompt: concise, structured, concept-focused, revision-oriented, grounded in the user's own notes.
8. Old `/ai-chat` route stays mounted as a fallback for now (not linked); we can remove it once you're happy with the new page.

## Out of scope (Phase 1)

- Quiz Generator and Active Recall logic (tabs visible but disabled with "Coming soon").
- Source/reference chips under answers.
- Any production AI fallback.
- Streaming markdown citations, file uploads, or multi-modal input.

## Architecture

```text
/assistant  (AssistantWorkspace.tsx)
├── Left rail: conversation list (reused chat_conversations)
├── Header: title + context filter chip + new-chat button
├── Tabs: Ask Across Notes | Quiz Generator (soon) | Active Recall (soon)
└── Active tab body
    └── AskAcrossNotes.tsx
        ├── Context picker (All / Subject / Chapter / Topic — same UI as today)
        ├── Message transcript (markdown)
        ├── Composer (textarea + Send)
        └── Calls aiService.streamChat({ messages, context })

src/lib/ai/
├── types.ts            ChatMessage, ContextFilter, AIService interface
├── ollamaService.ts    fetch http://localhost:11434/api/chat, NDJSON stream
├── contextLoader.ts    Pulls subjects/chapters/topics/blocks from Supabase
│                       (mirrors the logic currently in supabase/functions/ai-chat)
└── prompts.ts          Socratic system prompt + context formatter
```

The `AIService` interface keeps Phase 2 trivial: drop in a `lovableAIService.ts` that calls the existing edge function, no UI changes.

## Technical notes

- **Ollama endpoint**: `POST http://localhost:11434/api/chat` with `{ model, messages, stream: true }`. Default model `llama3.1:8b` (configurable in a small Settings popover on the workspace header — stored in `localStorage` as `ollama.model` and `ollama.baseUrl`).
- **Streaming**: NDJSON — read `response.body` line by line, each line is `{ message: { content }, done }`.
- **Context loading runs in the browser**: `contextLoader.ts` queries Supabase directly using the existing client. RLS already restricts to the signed-in user, so no edge function needed.
- **Prompt size**: same caps as today (top 20 topics, 3 blocks each, 500 chars per block, full topic content when filter is `topic`).
- **Conversation persistence**: reuse existing `chat_conversations` and `chat_messages` tables and patterns from `useAIChat`. Build a new `useAssistantChat` hook so the old `useAIChat` can be removed cleanly later.
- **Connection status**: small badge in the header — green "Ollama connected" or red "Ollama unreachable" with a tooltip explaining how to start it.
- **Empty state**: shows the Socratic intro + 4 example prompts ("Quiz me on…", "Explain… simply", "Connect this to…", "Predict an exam question on…").
- **Design**: matches existing app tokens (`bg-card`, `border-border`, gradient headers used elsewhere). Layout is sticky header + scroll-only transcript, consistent with the editor's sticky-layout rule.

## Files

New:
- `src/pages/AssistantWorkspace.tsx`
- `src/components/assistant/AskAcrossNotes.tsx`
- `src/components/assistant/ConversationRail.tsx`
- `src/components/assistant/ContextFilterBar.tsx` (extracted from current `AIChat.tsx`)
- `src/components/assistant/OllamaStatusBadge.tsx`
- `src/components/assistant/OllamaSettingsPopover.tsx`
- `src/hooks/useAssistantChat.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/ollamaService.ts`
- `src/lib/ai/contextLoader.ts`
- `src/lib/ai/prompts.ts`

Edited:
- `src/App.tsx` — add `/assistant` route.
- `src/components/Sidebar.tsx` — point the AI Study Assistant button at `/assistant`.

No database migrations. Existing `chat_conversations` / `chat_messages` tables are reused as-is.

## Verification

1. With Ollama running locally, open `/assistant`, ask a question scoped to a topic, confirm streamed answer references the topic.
2. Switch context filter to Subject, ask another question, confirm the prompt scope changes (check Network tab payload).
3. Stop Ollama → status badge turns red, send button surfaces a clear "Ollama unreachable" toast.
4. Reload page → conversation list restores, clicking an old conversation re-renders its messages.
5. Quiz Generator and Active Recall tabs render with "Coming in Phase 2" placeholder.
