# Auto-open topic editor after creating a topic

## Goal
When you click "New Topic", type a title and press Create, the note page for that topic opens immediately with the cursor placed in it — no need to find and click the new card in the list.

## Current behavior (confirmed)
- `handleSaveTopic` in `src/pages/Index.tsx` creates the topic, appends its card to the list and shows a toast. The editor only opens when you later click the card (which sets `activeTopic`).

## Changes
1. `src/pages/Index.tsx` — in `handleSaveTopic` (create branch only, not rename), after the insert succeeds, call `setActiveTopic(data.id)` so the topic editor opens right away.
2. Cursor placement on open:
   - If the topic has a Title block, focus it; otherwise focus the first content block's editor. Implementation: add an `autoFocus` signal (e.g. a `focusOnMount` prop or a one-time flag) through `TopicEditor` → `ContentBlock` → `TiptapEditor`, using Tiptap's `autofocus: 'end'` editor option for the target block only. This avoids stealing focus when simply browsing existing topics — autofocus only triggers for a freshly created topic.
3. Rename flow unchanged (renaming must not open the editor).

## Verification
- Create a topic at subject level and inside a chapter: editor opens with cursor ready, typing works immediately.
- Open an existing topic from its card: no unexpected focus jump.
- Rename a topic: dialog saves, editor does not open.
