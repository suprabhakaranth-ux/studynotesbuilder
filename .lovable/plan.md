## Problem

The Tiptap editor has no table support installed. When you paste HTML that contains a `<table>` (or a CSS-grid "table" of `<div>`s, like Gemini's chat output), Tiptap's schema doesn't recognize tables, so it strips the table tags and keeps only the inner text — collapsing every cell into one run, exactly what you saw.

The paste cleaner (`wordPasteCleaner.ts`) and the public-HTML sanitizer already allow `<table>`, but the editor schema is the bottleneck.

## Fix

### 1. Install Tiptap table extensions
- `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-header`, `@tiptap/extension-table-cell`

### 2. Register them in `src/components/editor/TiptapEditor.tsx`
Add to `buildExtensions`:
```ts
Table.configure({ resizable: true, allowTableNodeSelection: true }),
TableRow, TableHeader, TableCell,
```
This lets Tiptap accept `<table><tr><td>…` from pasted HTML (Keep Source Formatting and Match Destination Style both go through Tiptap's schema, so both will now preserve tables).

### 3. Convert div-grid "tables" to real `<table>` in `wordPasteCleaner.ts`
Gemini, Claude, and some PDFs paste tables as nested `<div>`s with `display: grid` / `display: table` instead of `<table>`. Add a small pre-pass that detects these patterns and rewrites them to `<table><tr><td>` so Tiptap's table schema picks them up:
- `<div style="display:table">` → `<table>`, child `display:table-row` → `<tr>`, `display:table-cell` → `<td>`.
- CSS-grid blocks where every direct child is a same-width grid item and `grid-template-columns` has N tracks → group children into rows of N as `<tr><td>`.

### 4. Style tables in the editor and in public/reader views
Add minimal table CSS in `src/index.css` (borders, padding, header row, full-width, overflow-x on small screens) for both `.ProseMirror` (editor) and `.article-prose` (already has a `table` rule — extend it).

### 5. Toolbar button (small add-on)
Add an "Insert table" control to `FormattingToolbar.tsx` so users can also create tables manually (rows/cols picker, add/remove row/column, delete table). This is a small UI addition wired to the new Tiptap commands; skip if you want the minimum fix.

### Out of scope
- DOCX/PDF export already understands `<table>` via the existing HTML parser path, so once tables survive in the stored HTML the Study Pack export will render them. I will spot-check `parseHtmlToParagraphs` and only patch it if tables come through as flattened text.

### Files touched
- `package.json` (new deps)
- `src/components/editor/TiptapEditor.tsx` (register extensions)
- `src/components/editor/extensions/wordPasteCleaner.ts` (div-grid → table)
- `src/index.css` (table styling in editor + reader)
- `src/components/FormattingToolbar.tsx` (insert-table control — optional)
- possibly `src/utils/wordExport.ts` (only if export drops tables)

### Verification
Paste the Gemini table from your screenshot into a topic and confirm a real 3-column / 3-row table appears, persists after save/reload, and renders correctly in the public reader and in the Study Pack DOCX/PDF.