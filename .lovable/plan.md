# Editor hardening + Subject widgets

## Part 1 — Tiptap editor: verify and harden the agreed requirements

The Tiptap editor is already in place (`src/components/editor/TiptapEditor.tsx`, with math, paste cleaning, tables, indentation). This part closes the gaps against the five requirements.

### Math robustness
- Tokenizer already walks text nodes inside nested tags (`<b>`, `<span>`, list items) and skips already-tokenized/KaTeX subtrees, so no duplication.
- Add: guard against a `$` used as currency (e.g. "$5 and $10") by requiring the captured body to contain no line break and at least one non-space character — currently an empty body is skipped but a plain-prose pair can still match. Treat a candidate as math only when it contains a LaTeX-ish signal (backslash command, `^`, `_`, `{`, `}`, digit/letter combo without spaces at both ends).
- Add a round-trip check: `serializeMathPlaceholders(normalizeHtmlForTiptap(x))` must equal `x` for a fixture set (inline in bold, display in a list, mixed prose, legacy `data-latex` nodes).

### HTML compatibility
- Extend the editor schema so stored formatting survives: allow inline `style` (color, background, font-size, font-family, text-align) to pass through `TextStyle`; keep `<u>`, `<sup>`/`<sub>`, and nested `<ul>`/`<ol>` intact.
- Add Subscript/Superscript extensions (currently missing — stored `<sub>`/`<sup>` would be dropped).
- Keep the existing `IndentParagraph` and table extensions so margin-based indentation and pasted tables round-trip.

### Paste pipeline (three modes)
- Default paste (Ctrl+V) = "keep source formatting": current `cleanPastedHtml` path.
- Ctrl+Shift+V = "clean formatting": strip inline styles, classes, and font tags; keep structure (headings, lists, tables, bold/italic).
- Paste-as-plain-text option: text only, line breaks preserved.
- Surface all three in the existing Paste Special menu so the toolbar and keyboard behave the same.
- Word/Docs nested-span collapse: after cleaning, merge adjacent spans with identical style and unwrap spans whose style is empty or duplicates the parent.

### No data mutation on load
- `onUpdate` is the only save trigger and initial `setContent` does not emit; the external-value sync also uses `emitUpdate: false`. Add the same guarantee to Summary and Mnemonic tabs by confirming their save handlers only fire from a real `onChange`, not from a mount effect.

## Part 2 — Subject widgets (move between years, mark studied, delete)

Bring `SubjectCard` up to parity with `ChapterCard`.

- Database: add a `studied` boolean column (default false) to `subjects`.
- `SubjectCard`: add hover action buttons — Rename (exists), Move to year, Delete (exists) — plus a "Mark studied" checkbox in the card footer, with the same green treatment as chapters.
- New `MoveSubjectDialog` (modelled on `MoveChapterDialog`): pick 1st Year or 2nd Year and save.
- `Index.tsx`: add `handleToggleSubjectStudied` and `handleMoveSubjectYear`, both with optimistic UI updates and toast feedback, mirroring the chapter handlers.
- Sidebar: subjects already group by year, so a moved subject jumps to the correct group automatically; show a small studied indicator next to studied subjects.

## Technical notes

- One migration: `ALTER TABLE public.subjects ADD COLUMN studied boolean NOT NULL DEFAULT false;` (no new table, so no new grants needed).
- New files: `src/components/MoveSubjectDialog.tsx`; edits to `SubjectCard.tsx`, `Index.tsx`, `Sidebar.tsx`, `TiptapEditor.tsx`, `mathTokenizer.ts`, `wordPasteCleaner.ts`, `pasteSpecial.ts`.
- Public/read-only mode: all new subject widgets respect the existing `readOnly` prop and stay hidden in the public library.
