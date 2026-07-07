## Problem

Study Pack export (DOCX + PDF) has two gaps:

1. **Empty paragraphs between bullets/points/paragraphs are dropped.** `parseHtmlToParagraphs` (DOCX) skips any `<p>` whose runs are empty, and `parseHtmlToBlocks` (PDF) skips paragraphs whose runs contain no non‑whitespace text. Tiptap writes intentional visual gaps as `<p></p>` or `<p><br></p>`, so those blank rows never make it into the exported document.
2. **Tables are flattened to plain text.** `parseHtmlToParagraphs` has no `<table>` branch — it just recurses into cells and pushes their contents as loose paragraphs. `parseHtmlToBlocks` in the PDF path deliberately joins cells with `"   |   "`. Result: tables collapse into a single wall of text.

The HTML source is fine (Tiptap now stores real `<table>` markup after the earlier paste fix); only the exporters need updating.

## Fix

Scope is strictly the two exporter renderers. No changes to the editor, storage, or single‑topic export.

### 1. Preserve blank paragraphs

**`src/utils/wordExport.ts` — `parseHtmlToParagraphs`**
- When a `<p>` produces zero runs (or only a `<br>`), emit an empty `Paragraph({})` instead of skipping. This gives Word a real blank line at the same spacing as the surrounding text.

**`src/lib/export/buildArchivePdf.ts` — `parseHtmlToBlocks`**
- For `<p>` / `<blockquote>` with no non‑whitespace text, push a `{ kind: "space", pt: 8 }` block so the PDF gets the same vertical gap.

### 2. Render tables as tables

**`src/utils/wordExport.ts`**
- Add a `<table>` branch to `parseHtmlToParagraphs` that builds a real docx `Table`:
  - Iterate `<tr>` → `<td>`/`<th>`.
  - For each cell, run its inner HTML back through `parseHtmlToParagraphs` so bold/italic/lists inside cells survive.
  - Use `WidthType.DXA` with equal column widths summing to content width (9360 for Letter / 9026 for A4 — read from the section, or hard‑code 9026 which fits both). Set matching `columnWidths` and per‑cell `width`. Grey borders, small cell padding, header row shaded.
- Change the return type helper so `walk` can push both `Paragraph` and `Table` into the same `children` array. Docx `sections.children` accepts both; adjust the `Paragraph[]` typing to `(Paragraph | Table)[]` and update `buildArchiveDocx.ts` where the array is typed as `Paragraph[]` so it accepts tables from `parseHtmlToParagraphs`.

**`src/lib/export/buildArchivePdf.ts`**
- Replace the current `<table>` flattening with a real grid renderer:
  - Introduce a new block kind `{ kind: "table"; rows: Run[][][]; hasHeader: boolean }`.
  - In `drawBlock`, compute equal column widths from `layout.contentW`, measure wrapped text height per cell using the existing font metrics, draw cell borders with `pdf.rect`, and render text inside each cell with the existing `drawRuns` machinery (bounded to the cell rect). Handle page breaks by re‑drawing the header row on the next page when `hasHeader`.
  - Keep it simple: uniform column widths, one line height, no colspan/rowspan.

### Out of scope

- HTML/reader view already renders tables correctly (CSS in `renderTopicHtml.ts` handles `table/th/td`) and preserves empty `<p>` as valid HTML — no change needed.
- Single‑topic legacy exporter is untouched.
- No new dependencies.

### Files touched

- `src/utils/wordExport.ts` — blank‑paragraph handling + table branch
- `src/lib/export/buildArchiveDocx.ts` — widen `children` typing to accept `Table`
- `src/lib/export/buildArchivePdf.ts` — blank‑paragraph spacing + real table rendering

### Verification

Export a topic containing (a) two paragraphs separated by a blank line, (b) a bulleted list with a blank line between items, (c) a 3×3 table (like the Gemini one). Confirm:
- DOCX opens in Word/Google Docs with the blank lines visible and the table rendered as a real table with borders.
- PDF shows the same spacing and a bordered table with wrapped cell text.
