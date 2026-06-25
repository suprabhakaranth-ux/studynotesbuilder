# Fix multi-topic Study Pack export

## Why the current build failed (honest analysis)

You're right — I ignored a working, higher-quality renderer that already existed in the app, and instead wrote three brand-new exporters from scratch. Specifically:

1. **DOCX (`buildArchiveDocx.ts`)** — I wrote a *new* HTML→docx walker (`processInline` / `htmlToDocxBlocks`) that throws away most of the formatting the single-topic exporter preserves. The good version lives in `src/utils/wordExport.ts` (`parseHtmlToParagraphs`) and is what `Index.tsx > handleExportChapter` and `TopicEditor.tsx` already use successfully. It handles bold/italic/underline/colour/font-size from inline styles, nested `<ol>`/`<ul>`, headings, spacing — none of which my new walker does well. I also demoted topic content headings (H1→H2 etc.) which makes the document feel flat. The "Table of Contents" I added is a Word `TableOfContents` field — Word shows it as empty until the user manually right-clicks → *Update Field*. So in practice you see no index.

2. **PDF (`buildArchivePdf.ts`)** — I rasterised the HTML via `html2canvas` into JPEGs and stuffed them into jsPDF. That's why it's "not readable": text becomes a blurry image, not selectable, not searchable, fonts get aliased, file size balloons, math/Unicode often misrenders. The single-topic flow never does this. The TOC page numbers were back-filled by re-rasterising, which is fragile and produced an ugly result.

3. **Index/TOC page** — Because of the two issues above, the TOC essentially didn't render in DOCX, and in PDF it was a low-res image with approximate page numbers and no working clickable links.

4. **Selection UI** — A separate complaint already addressed; this plan does not change it further.

Root cause: I treated the archive exporter as a greenfield build instead of an extension of `wordExport.ts` + the topic export flow. The fix is to reuse that code, not to add yet another layer.

## What I'll change

### 1. DOCX — reuse `parseHtmlToParagraphs`
Rewrite `src/lib/export/buildArchiveDocx.ts` to mirror `Index.tsx > handleExportChapter` structure, just iterated over the selected `TopicBundle[]`:

- Cover page (title, date, topic count) — keep, but cleaner.
- **Real Index page** built in code (not a Word field):
  - Group entries by Subject → Chapter → Topic in selection order.
  - Each topic row: `Topic title …………………… p. N` with the **actual** page number, using a two-pass strategy:
    - Pass 1: build the document with placeholder index entries to estimate page counts, OR use docx `INTERNAL HYPERLINK` field referencing bookmarks at each topic title. Bookmarks + `PAGEREF` fields produce a real, clickable, auto-updating index that Word/Google Docs render immediately on open (no manual "Update Field" needed for `PAGEREF \h`).
  - Add `Bookmark` at each topic's H1 (`topic-<id>`).
- Per-topic body uses **`parseHtmlToParagraphs`** from `src/utils/wordExport.ts` for blocks, summary, mnemonic, and heading-tree notes — identical to the working single-topic path. Drop my custom `htmlToDocxBlocks`.
- Keep the existing `default-numbering` config (3 list levels) from the working exporter so nested lists number correctly.
- Headings stay at their natural levels (no demotion).
- Page break before each topic (except first), breadcrumb line, then H1 title.
- Footer with page numbers (already works).

### 2. PDF — text-native via jsPDF (no html2canvas for text)
Rewrite `src/lib/export/buildArchivePdf.ts` to render text directly with jsPDF's text APIs:

- Walk the same `TopicBundle[]` and emit text using `pdf.text()` with wrapping via `pdf.splitTextToSize()`.
- Handle headings (size + weight), paragraphs, bullet/numbered lists, bold/italic runs by parsing the HTML to a lightweight token stream (reuse the existing `renderTopicHtml` DOM + a small inline-style reader — same idea as `wordExport.ts`'s `processInline`).
- Images: only rasterise actual `<img>` elements via `pdf.addImage`. Text stays as text — selectable, searchable, crisp at any zoom.
- **Real Index page**:
  - Pass 1: lay out all content, record the page number where each topic starts in a `Map<topicId, pageNumber>`.
  - Pass 2: insert index pages at the front using `pdf.insertPage()`, draw "Subject › Chapter › Topic ……… N" rows, attach `pdf.link()` annotations on each row pointing to the recorded page. Adjust topic page numbers for the inserted index pages.
- Footer "Page X of Y" on every page (kept).
- Cover page (title, date, count) drawn with text APIs.
- Optional unicode font: include `noto-sans` via `pdf.addFileToVFS` only if non-Latin characters are detected, to keep bundle size down. Default is jsPDF's built-in Helvetica.

### 3. HTML archive (`buildArchiveHtml.ts`)
Minor: keep as-is for the in-zip HTML deliverable (it's already readable). Ensure the index page in the HTML version also lists Subject › Chapter › Topic with anchor links — small tweak only.

### 4. No UI changes
Selection tree, sticky bar, options dialog stay as they are. This plan is purely about export *quality*.

## Files touched

- `src/lib/export/buildArchiveDocx.ts` — full rewrite, reuses `parseHtmlToParagraphs`, adds bookmark-based clickable index.
- `src/lib/export/buildArchivePdf.ts` — full rewrite, text-native, two-pass index with clickable links.
- `src/lib/export/buildArchiveHtml.ts` — small touch-up to the index section only.
- `src/lib/export/renderTopicHtml.ts` — unchanged unless the PDF tokenizer needs a shared helper.
- `src/utils/wordExport.ts` — unchanged (consumed as-is).

## Acceptance check I'll run before claiming done

1. Select 2 subjects with 5+ topics across chapters.
2. Generate Study Pack → open the DOCX in Word: confirm cover → Index with clickable topic rows showing real page numbers → each topic on its own page with proper headings, lists, bold/italic, images.
3. Open the PDF: text is selectable (Ctrl+F finds words), index links jump to topics, page numbers are correct, no blurry rasterised text.
4. Open the HTML in browser: index anchors jump to topics.
