# Seamless topic creation: popup → note page with no intermediate flash

## Problem
When Create is clicked in the New Topic popup, the popup closes immediately — before the topic is saved to the database. The screen then shows the topic list (with the new card briefly appearing), and only after the save finishes does the note page open. That intermediate list view is the visible "create and open" flicker.

## Fix
Keep the popup on screen until the note page is ready, then swap directly from popup to note page in one step — no list view in between.

### Changes

1. **`src/components/TopicDialog.tsx`**
   - `onSave` becomes awaitable: `handleSave` awaits it and only then closes the dialog.
   - Add a `saving` busy state: while saving, the Create/Save button shows a spinner and is disabled, and Cancel is disabled too.
   - If the save fails, the dialog stays open with the typed title intact (an error toast already appears) — currently it closes and the title is lost.

2. **`src/pages/Index.tsx`**
   - `handleSaveTopic` already does all state updates (`setTopics`, `setEditingTopic`, `setAutoFocusTopicId`) before returning; just let it return/throw so the dialog can await completion. On success the editor mounts before the popup closes, so the swap is seamless.
   - On the rename path, behavior is unchanged (save is fast; the popup now simply closes right after the update finishes).

3. **`src/components/TopicEditor.tsx`** (polish for the fresh-topic case)
   - When the editor opens for a brand-new topic (`autoFocus` is true), skip the initial "loading" gate for autosave purposes immediately: start with `loading = false` since a new topic has no saved blocks — the cursor appears in the first block the instant the page mounts, with no delayed focus.
   - Existing topics keep the current load-then-enable-autosave behavior untouched.

### Not changing
- The existing Paste Special / toolbar behavior, topic ordering, or the note page layout.
- Public read-only views (no dialogs there).

## Verification
- Build passes.
- Playwright: sign in as the workspace owner, create a topic, confirm the popup stays visible with a busy button and the note page opens with the cursor ready, with no flash of the topic list in between; confirm rename still works.
