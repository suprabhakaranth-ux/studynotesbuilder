# Auto-populate Summary outline from notes

## What you'll see
A new button in the formatting toolbar (Summary & Mnemonics area): **"Generate Outline from Notes"** (wand/list icon). One click walks through every content block in the Full Content tab, extracts every heading it finds, and rebuilds the Summary tab's heading tree — top-level headings become parent nodes, sub-headings nest under them, exactly like the manual example in MPC-003 Unit 2.

Existing notes on already-present heading nodes are preserved (matched by title). New headings are inserted; headings that no longer exist in the notes are kept in a separate "Removed / unmatched" section so nothing is lost silently, and you can delete them manually.

## How it works

1. **Source of truth = the HTML inside each content block**, in block order.
2. For each block, parse the HTML and collect heading-like elements in document order:
   - `<h1>` → level 1
   - `<h2>` → level 2
   - `<h3>` and deeper → level 3
   - Paragraphs styled as bold-only single lines (`<p><strong>...</strong></p>` with no other text) are treated as **level 2** — this matches how pasted study material from Word/Gemini usually arrives (no real `<hX>` tag, just bold).
   - Optional: lines that were previously tagged via "Mark Heading" (already in `block.headings`) are folded in as level 2 if not otherwise detected.
3. Build a tree: a level-2 heading nests under the most recent level-1; a level-3 nests under the most recent level-2 (or level-1 if none). Duplicates within the same parent are de-duplicated by normalized title.
4. **Merge with existing `headingNodes`**: for every new heading, if a node with the same normalized title already exists at the same position in the tree, keep its `notes` and children. Otherwise create a fresh node with empty `notes`.
5. Update state via `setHeadingNodes(...)`, which triggers the existing debounced autosave — nothing else changes.

## UI details

- Button lives next to "Collapse All" in the Summary tab header, not in the global FormattingToolbar (keeps it discoverable in the right context and avoids cluttering the main toolbar).
- Hidden in `readOnly` mode.
- Shows a confirm dialog if `headingNodes.length > 0`: *"Regenerate outline from notes? Existing notes on matching headings will be preserved; unmatched headings will be moved to the bottom."* with **Regenerate** / **Cancel**.
- Toast on completion: *"Outline updated — N headings, M sub-headings."*

## Files to change

- `src/components/TopicEditor.tsx` — add `generateOutlineFromBlocks()` helper, wire the button in the Summary tab header, add confirm `AlertDialog`.
- `src/lib/outline/extractHeadings.ts` *(new)* — pure function: takes `blocks: {content: string, headings?: string[]}[]` → returns `HeadingNode[]`. Unit-testable in isolation. Uses `DOMParser` to walk each block's HTML.

No schema changes, no changes to save/load logic, no changes to export.

## Challenges & trade-offs (answering your second question)

1. **Not every "heading" in pasted notes is a real `<h1>/<h2>`.** Content pasted from Gemini/Word/PDFs often arrives as bold paragraphs, not semantic headings. Mitigation: the bold-paragraph heuristic above. It's ~90% accurate but will occasionally treat an emphasized sentence as a heading. **You will need to review and delete false positives once**, then it's stable.
2. **Level inference is imperfect** when the source only uses bold (no `h1` vs `h2` distinction). We flatten everything bold-only to level 2 under the previous real `h1`; if there is no `h1` in the block, everything becomes top-level. This is what the manual MPC-003 example does, so it should match your usual pattern.
3. **Re-running the button on edited notes** can shuffle nodes — that's why we match by normalized title (lowercase, trimmed, punctuation-stripped) rather than by position, and preserve `notes` on match. Renaming a heading in the notes will orphan the old node (moved to "unmatched") — expected behavior.
4. **Headings inside tables or code blocks** are ignored to avoid noise.
5. **Order across blocks**: we walk blocks top-to-bottom in `block_order`, so the outline order matches the notes order — same convention the export uses.

## Out of scope

- No AI/LLM summarization of the headings themselves. This is deterministic HTML parsing only. If you later want AI to *write summary text under each heading*, that's a separate feature using the existing AI gateway.
- No changes to the manual "Mark Heading" flow — it still works alongside auto-generate.
