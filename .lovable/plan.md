# Study Pack Export — Plan

A separate, self-contained "Study Pack" export that produces a single ZIP containing a PDF, a Word document, and a standalone HTML archive. The existing per-topic export (`TopicEditor.exportToWord`, `src/utils/wordExport.ts`) stays untouched.

## 1. Limitations found in the current export

These are documented now so the new feature avoids them:

- **Per-topic only.** `TopicEditor.exportToWord` works on one open topic; no batch path exists.
- **Math is downgraded to LaTeX source.** `parseHtmlToRuns`/`parseHtmlToParagraphs` call `restoreMathSource`, so equations become plain text in Word — not the rendered KaTeX the user sees.
- **Images are dropped.** `processInline` only handles text, `<strong/em/u/br>`. No `<img>` branch → image blocks vanish in Word.
- **Tables are dropped.** No `<table>` handling in `parseHtmlToParagraphs`.
- **Highlight color and line-height are stripped** (comments in the file say they corrupt docx).
- **No TOC, no breadcrumbs, no footer/page numbers.**
- **Headings come from two sources** (block `headings[]` array + `heading_nodes` tree) and are appended after the body, not threaded with content.
- **DOM-dependent.** Uses `getComputedStyle` on a hidden div → only works in the browser, only for the currently-mounted topic styles.

The new pipeline routes around all of these instead of patching the old one.

## 2. Architecture

New module tree, no edits to existing export code:

```text
src/
  pages/
    ExportCenter.tsx              new route /export
  components/export/
    ExportTree.tsx                subject→chapter→topic checkbox tree
    ExportProgressDialog.tsx      step-by-step progress + log
  lib/export/
    fetchStudyData.ts             batch load subjects/chapters/topics/blocks/summaries/mnemonics/heading_nodes
    renderTopicHtml.ts            single source of truth: topic → semantic HTML (matches on-screen render)
    buildArchiveHtml.ts           whole-pack standalone HTML (TOC + all topics, inline CSS, base64 images, KaTeX CSS)
    buildArchivePdf.ts            HTML → paginated PDF via jsPDF + html2canvas, with bookmarks + TOC page-number backfill
    buildArchiveDocx.ts           docx Document with native TOC field, breadcrumbs, page breaks, footer page numbers, image + table + math-image support
    zipStudyPack.ts               JSZip bundle: pdf + docx + html + manifest.json + README.txt
    types.ts                      ExportSelection, StudyNode, ProgressEvent
```

Sidebar gets one new link: **Export Center** (`/export`), added next to existing nav. `App.tsx` gets a single new `<Route path="/export" element={<ExportCenter />} />`.

## 3. Export Center UI (`/export`)

- Hierarchy with tri-state checkboxes: Subject → Chapter → Topic. Selecting a subject auto-selects its chapters/topics; partial selection shows indeterminate.
- **Select All / Deselect All** buttons at the top.
- Live counters: `X subjects · Y chapters · Z topics selected` and an **estimated page count** (≈ 1 + topics + ceil(total chars / 2500)).
- Options panel:
  - Paper size: A4 (default) / Letter
  - Include Summary tab content (default on)
  - Include Mnemonic tab content (default on)
  - Include heading-tree outline (default on)
- "Generate Study Pack" button → opens `ExportProgressDialog` showing: Fetching data → Rendering topics → Building HTML → Building PDF → Building Word → Zipping → Done. Cancel button stops mid-flight.
- Output: browser download of `StudyPack-YYYY-MM-DD-HHmm.zip`.

## 4. Content fidelity strategy

To avoid the "rebuild from fragmented fields" trap, we render each topic **once** to canonical HTML in `renderTopicHtml.ts`, then all three exporters consume that same HTML.

`renderTopicHtml(topic, blocks, summary, mnemonic, headingTree, breadcrumb)` returns:

```html
<section class="topic" id="topic-<id>">
  <header class="breadcrumb">Subject › Chapter › Topic</header>
  <h1 class="topic-title">…</h1>
  <!-- blocks in block_order, each block's content is the same sanitized HTML
       shown by RichTextEditor / ContentBlock, including <img>, <table>,
       <span class="katex">…</span>, lists, bold/italic/underline -->
  <article class="blocks">…</article>
  <section class="summary-outline">…heading tree as nested <ol>…</section>
  <section class="summary">…</section>
  <section class="mnemonic">…</section>
</section>
```

KaTeX nodes are kept as-is (HTML the editor produced) so PDF and HTML keep the rendered formula; for Word, math is rasterized to PNG via `html-to-image` (already a dep) on the live KaTeX nodes, then embedded as `ImageRun`. Images stored as `<img src="…">` are fetched and inlined as base64 in HTML and as `ImageRun` in Word.

## 5. PDF pipeline (`buildArchivePdf.ts`)

- Mount the combined archive HTML in an off-screen iframe sized to chosen paper.
- Use `html2canvas` per topic section + `jsPDF` to stitch pages; insert a hard page break before each `<section class="topic">`.
- Footer: page number drawn on each page after pagination (`doc.text` in `pdf.internal.getNumberOfPages()` loop).
- TOC: first pass renders all topics and records each topic's starting page; second pass prepends a TOC page (or reserves it up front and writes into it) with one row per Subject/Chapter/Topic and the recorded page number. Each row is added with `doc.link(x,y,w,h,{pageNumber})` for clickable navigation, plus `doc.outline` entries for the PDF sidebar bookmarks.
- New deps: `jspdf`, `html2canvas`, `jszip`.

## 6. Word pipeline (`buildArchiveDocx.ts`)

Built from the same canonical HTML, but with a richer parser than `wordExport.ts` (kept separate, in `lib/export/docxHtml.ts`):

- Adds `<img>` → `ImageRun` (fetch → ArrayBuffer, infer type from MIME).
- Adds `<table>` → `docx.Table` with `WidthType.DXA`, dual widths, `ShadingType.CLEAR`.
- Rasterizes `.katex` nodes via `html-to-image` → `ImageRun`.
- Each topic: `Paragraph(breadcrumb)` → `Paragraph(title, HEADING_1, pageBreakBefore: true)` → body paragraphs → optional summary/mnemonic headings.
- Document-level:
  - `TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" })` — Word fills page numbers on open (prompt "Update fields?" is standard).
  - Section `footers.default` with `PageNumber.CURRENT`.
  - Page size A4/Letter per option; 1-inch margins; explicit Heading1–3 style overrides with `outlineLevel` so TOC works.
- Validates by writing through `Packer.toBuffer`.

## 7. HTML pipeline (`buildArchiveHtml.ts`)

- Single self-contained `.html` file:
  - Inline `<style>` with print CSS (`@page`, page-break-before for topics, footer counter `content: counter(page)`).
  - Inline KaTeX CSS (imported from `katex/dist/katex.min.css` as a string via `?inline`).
  - All `<img>` rewritten to base64 data URIs.
  - Clickable TOC using in-page `<a href="#topic-id">` plus subject/chapter anchors.
- This is the long-term backup: opens in any browser offline, prints to PDF natively.

## 8. ZIP bundle (`zipStudyPack.ts`)

```text
StudyPack-2026-06-24-1430.zip
├── StudyPack.pdf
├── StudyPack.docx
├── StudyPack.html
├── manifest.json   (export date, options, list of included subjects/chapters/topics with ids)
└── README.txt      (how to open each file, note about Word "Update fields" prompt for TOC)
```

## 9. Data fetch (`fetchStudyData.ts`)

Single batched load, gated by current `user.id`:

1. `subjects` for selected subject ids.
2. `chapters` for selected chapter ids ∪ chapters of selected subjects.
3. `topics` for selected topic ids ∪ topics under selected chapters/subjects.
4. For every resolved topic id, parallel `Promise.all` of `blocks`, `summaries`, `mnemonics`, `heading_nodes`.
5. Build the heading tree the same way `TopicEditor.loadData` does (so the outline matches the app).

Order honored throughout: subjects by name, chapters by `chapter_order`, topics by creation order (oldest first — matches the existing export-ordering memory rule), blocks by `block_order`.

## 10. Routing & nav

- `src/App.tsx`: add `<Route path="/export" element={<ExportCenter />} />` inside the existing `<Routes>`.
- `src/components/Sidebar.tsx`: add a "Export Center" button (Download icon) below the existing AI/Settings buttons, navigating to `/export`. Hidden when `readOnly`.

## 11. Dependencies to add

- `jspdf`
- `html2canvas`
- `jszip`

`docx`, `file-saver`, `html-to-image`, `katex` are already installed.

## 12. Non-goals / explicit constraints

- Do **not** edit `src/utils/wordExport.ts`, `TopicEditor.exportToWord`, or any existing export call site.
- Do **not** change any database schema.
- Do **not** alter the public library / read-only routes.

## 13. Open question

Before I implement, one decision:

**TOC page numbers in the PDF** — the two-pass render is reliable but doubles PDF build time (a 50-topic pack could take ~30–60s on a mid laptop). Acceptable, or would you rather a faster single-pass PDF where the TOC only shows clickable section links without page numbers (Word doc and printed HTML still have full page numbers)?

I'll default to the two-pass / accurate-page-numbers version unless you say otherwise.
