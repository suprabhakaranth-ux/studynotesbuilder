import jsPDF from "jspdf";
import type {
  TopicBundle,
  ExportOptions,
  ExportHeadingNode,
  ProgressCallback,
} from "./types";

interface PdfInput {
  bundles: TopicBundle[];
  opts: ExportOptions;
  meta: { exportedAt: Date };
  onProgress?: ProgressCallback;
}

const PAGE_FORMATS: Record<string, "a4" | "letter"> = {
  a4: "a4",
  letter: "letter",
};

// Inline run with formatting flags
interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}
type Block =
  | { kind: "h"; level: 1 | 2 | 3 | 4; runs: Run[] }
  | { kind: "p"; runs: Run[] }
  | { kind: "li"; runs: Run[]; ordered: boolean; index: number; depth: number }
  | { kind: "img"; src: string }
  | { kind: "hr" }
  | { kind: "space"; pt: number };

const esc = (s: string) => s.replace(/\s+/g, " ");

// ─────────────────────── HTML → Block stream ───────────────────────

function parseHtmlToBlocks(html: string): Block[] {
  if (!html) return [];
  const root = document.createElement("div");
  root.innerHTML = html;

  const blocks: Block[] = [];

  function inlineRuns(node: Node, inh: Run): Run[] {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent || "";
      if (!t) return [];
      return [{ ...inh, text: t }];
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return [];
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const next: Run = { ...inh };
    if (tag === "strong" || tag === "b") next.bold = true;
    if (tag === "em" || tag === "i") next.italic = true;
    if (tag === "u") next.underline = true;
    if (tag === "br") return [{ text: "\n" }];
    const out: Run[] = [];
    el.childNodes.forEach((c) => out.push(...inlineRuns(c, next)));
    return out;
  }

  function walkList(el: HTMLElement, ordered: boolean, depth: number) {
    let idx = 1;
    Array.from(el.children).forEach((li) => {
      if (li.tagName.toLowerCase() !== "li") return;
      // Collect inline runs only from non-list children
      const runs: Run[] = [];
      Array.from(li.childNodes).forEach((c) => {
        if (c.nodeType === Node.ELEMENT_NODE) {
          const t = (c as HTMLElement).tagName.toLowerCase();
          if (t === "ul" || t === "ol") return;
        }
        runs.push(...inlineRuns(c, { text: "" }));
      });
      blocks.push({
        kind: "li",
        ordered,
        index: idx++,
        depth,
        runs: runs.length ? runs : [{ text: "" }],
      });
      // Recurse nested lists
      Array.from(li.children).forEach((c) => {
        const t = c.tagName.toLowerCase();
        if (t === "ul") walkList(c as HTMLElement, false, depth + 1);
        if (t === "ol") walkList(c as HTMLElement, true, depth + 1);
      });
    });
  }

  function walk(el: HTMLElement) {
    const tag = el.tagName.toLowerCase();

    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      const lvl = Math.min(parseInt(tag[1], 10), 4) as 1 | 2 | 3 | 4;
      blocks.push({ kind: "h", level: lvl, runs: inlineRuns(el, { text: "" }) });
      return;
    }
    if (tag === "p" || tag === "blockquote") {
      const runs = inlineRuns(el, { text: "" });
      if (runs.some((r) => r.text.trim())) blocks.push({ kind: "p", runs });
      return;
    }
    if (tag === "ul") return walkList(el, false, 0);
    if (tag === "ol") return walkList(el, true, 0);
    if (tag === "hr") return blocks.push({ kind: "hr" });
    if (tag === "img") {
      const src = (el as HTMLImageElement).getAttribute("src") || "";
      if (src) blocks.push({ kind: "img", src });
      return;
    }
    if (tag === "figure") {
      const img = el.querySelector("img");
      if (img) blocks.push({ kind: "img", src: img.getAttribute("src") || "" });
      return;
    }
    if (tag === "table") {
      // Flatten table rows to plain paragraphs to keep text selectable.
      Array.from(el.querySelectorAll("tr")).forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll("th,td")).map(
          (c) => (c as HTMLElement).innerText.replace(/\s+/g, " ").trim()
        );
        const text = cells.join("   |   ");
        if (text) blocks.push({ kind: "p", runs: [{ text }] });
      });
      blocks.push({ kind: "space", pt: 6 });
      return;
    }
    if (["div", "section", "article", "header", "nav"].includes(tag)) {
      Array.from(el.children).forEach((c) => walk(c as HTMLElement));
      return;
    }
    // Default: treat as paragraph
    const runs = inlineRuns(el, { text: "" });
    if (runs.some((r) => r.text.trim())) blocks.push({ kind: "p", runs });
  }

  Array.from(root.children).forEach((c) => walk(c as HTMLElement));
  return blocks;
}

function headingTreeToBlocks(
  nodes: ExportHeadingNode[],
  level: number,
  out: Block[]
) {
  nodes.forEach((n) => {
    const hLevel = Math.min(level + 2, 4) as 1 | 2 | 3 | 4;
    out.push({ kind: "h", level: hLevel, runs: [{ text: n.title, bold: true }] });
    if (n.notes) out.push(...parseHtmlToBlocks(n.notes));
    if (n.children?.length) headingTreeToBlocks(n.children, level + 1, out);
  });
}

// ─────────────────────── PDF writer ───────────────────────

interface Layout {
  pageW: number;
  pageH: number;
  margin: number;
  contentW: number;
  contentBottom: number;
}

interface Writer {
  pdf: jsPDF;
  layout: Layout;
  y: number;
  page: number;
  pageOffset: number; // applied for footer numbering after we insert index pages
}

const FONT = "helvetica";

function setFont(pdf: jsPDF, size: number, bold = false, italic = false) {
  const style =
    bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal";
  pdf.setFont(FONT, style);
  pdf.setFontSize(size);
}

function newPage(w: Writer) {
  w.pdf.addPage();
  w.page = w.pdf.getNumberOfPages();
  w.y = w.layout.margin;
}

function ensureSpace(w: Writer, needed: number) {
  if (w.y + needed > w.layout.contentBottom) newPage(w);
}

/**
 * Render a sequence of runs as wrapped text starting at writer position.
 * Mixed bold/italic per run, preserves spacing.
 */
function drawRuns(
  w: Writer,
  runs: Run[],
  opts: { size: number; lineHeight?: number; indent?: number; firstIndent?: number }
) {
  const lineH = opts.lineHeight ?? opts.size * 1.35;
  const indent = opts.indent ?? 0;
  const firstIndent = opts.firstIndent ?? indent;
  const maxW = w.layout.contentW - indent;
  const { pdf, layout } = w;

  let cursorX = layout.margin + firstIndent;
  let isFirstLineOfBlock = true;

  const space = () => {
    setFont(pdf, opts.size);
    return pdf.getTextWidth(" ");
  };

  // Tokenize each run into words (preserving spaces and explicit newlines)
  const tokens: Array<{ text: string; run: Run; isNewline?: boolean }> = [];
  runs.forEach((r) => {
    if (!r.text) return;
    // Split keeping spaces; treat \n explicitly
    const parts = r.text.split(/(\n)/);
    parts.forEach((p) => {
      if (p === "\n") {
        tokens.push({ text: "", run: r, isNewline: true });
        return;
      }
      const words = p.split(/(\s+)/).filter((s) => s.length);
      words.forEach((wd) => tokens.push({ text: wd, run: r }));
    });
  });

  const lineBreak = () => {
    w.y += lineH;
    if (w.y + lineH > layout.contentBottom) {
      newPage(w);
    }
    cursorX = layout.margin + indent;
    isFirstLineOfBlock = false;
  };

  // Ensure space for first line
  ensureSpace(w, lineH);

  for (const t of tokens) {
    if (t.isNewline) {
      lineBreak();
      continue;
    }
    const isSpace = /^\s+$/.test(t.text);
    setFont(pdf, opts.size, !!t.run.bold, !!t.run.italic);
    const wWidth = pdf.getTextWidth(t.text);

    // Don't start a line with a leading space
    if (isSpace && cursorX === layout.margin + (isFirstLineOfBlock ? firstIndent : indent)) {
      continue;
    }

    if (cursorX + wWidth > layout.margin + (isFirstLineOfBlock ? firstIndent : indent) + maxW + 0.5) {
      if (isSpace) continue;
      lineBreak();
    }

    pdf.text(t.text, cursorX, w.y + opts.size * 0.9);
    if (t.run.underline) {
      const yU = w.y + opts.size * 0.95 + 1;
      pdf.setDrawColor(60);
      pdf.setLineWidth(0.5);
      pdf.line(cursorX, yU, cursorX + wWidth, yU);
    }
    cursorX += wWidth;
  }
  w.y += lineH; // finish current line
}

async function loadImage(
  src: string
): Promise<{ data: string; w: number; h: number; type: "JPEG" | "PNG" } | null> {
  try {
    let blobUrl = src;
    if (!src.startsWith("data:")) {
      const res = await fetch(src, { mode: "cors" });
      if (!res.ok) return null;
      const blob = await res.blob();
      blobUrl = await new Promise<string>((r, j) => {
        const fr = new FileReader();
        fr.onloadend = () => r(fr.result as string);
        fr.onerror = j;
        fr.readAsDataURL(blob);
      });
    }
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = blobUrl;
    });
    const type: "JPEG" | "PNG" = blobUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
    return { data: blobUrl, w: img.naturalWidth, h: img.naturalHeight, type };
  } catch {
    return null;
  }
}

async function drawBlock(w: Writer, b: Block) {
  switch (b.kind) {
    case "space":
      w.y += b.pt;
      ensureSpace(w, 1);
      break;
    case "hr": {
      ensureSpace(w, 12);
      w.y += 4;
      w.pdf.setDrawColor(200);
      w.pdf.setLineWidth(0.5);
      w.pdf.line(
        w.layout.margin,
        w.y,
        w.layout.margin + w.layout.contentW,
        w.y
      );
      w.y += 8;
      break;
    }
    case "h": {
      const sizeMap = { 1: 20, 2: 16, 3: 13, 4: 11.5 } as const;
      const beforeMap = { 1: 14, 2: 12, 3: 10, 4: 8 } as const;
      const afterMap = { 1: 8, 2: 6, 3: 5, 4: 4 } as const;
      w.y += beforeMap[b.level];
      ensureSpace(w, sizeMap[b.level] + 4);
      drawRuns(
        w,
        b.runs.map((r) => ({ ...r, bold: true })),
        { size: sizeMap[b.level] }
      );
      w.y += afterMap[b.level];
      break;
    }
    case "p":
      drawRuns(w, b.runs, { size: 11 });
      w.y += 4;
      break;
    case "li": {
      const indent = 18 + b.depth * 14;
      const bullet = b.ordered ? `${b.index}.` : "•";
      const size = 11;
      // Draw bullet
      ensureSpace(w, size * 1.35);
      setFont(w.pdf, size);
      w.pdf.setTextColor(40);
      w.pdf.text(bullet, w.layout.margin + indent - 14, w.y + size * 0.9);
      drawRuns(w, b.runs, { size, indent, firstIndent: indent });
      w.y += 2;
      break;
    }
    case "img": {
      const img = await loadImage(b.src);
      if (!img) return;
      const maxW = w.layout.contentW * 0.85;
      const ratio = Math.min(1, maxW / img.w);
      const drawW = img.w * ratio;
      const drawH = img.h * ratio;
      ensureSpace(w, drawH + 8);
      const x = w.layout.margin + (w.layout.contentW - drawW) / 2;
      w.pdf.addImage(img.data, img.type, x, w.y, drawW, drawH);
      w.y += drawH + 8;
      break;
    }
  }
}

// ─────────────────────── Top-level pipeline ───────────────────────

export async function buildArchivePdf(input: PdfInput): Promise<Blob> {
  const { bundles, opts, meta, onProgress } = input;
  const format = PAGE_FORMATS[opts.paper] || "a4";

  onProgress?.({ stage: "pdf", message: "Preparing PDF…", percent: 2 });

  const pdf = new jsPDF({ unit: "pt", format, orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 54; // 0.75"
  const layout: Layout = {
    pageW,
    pageH,
    margin,
    contentW: pageW - margin * 2,
    contentBottom: pageH - margin - 20,
  };

  const writer: Writer = { pdf, layout, y: margin, page: 1, pageOffset: 0 };

  // ─── Cover ───
  setFont(pdf, 32, true);
  pdf.setTextColor(20);
  pdf.text("Study Pack", pageW / 2, pageH / 2 - 30, { align: "center" });
  setFont(pdf, 14);
  pdf.setTextColor(90);
  pdf.text("Offline backup of your notes", pageW / 2, pageH / 2, {
    align: "center",
  });
  setFont(pdf, 11, false, true);
  pdf.setTextColor(120);
  pdf.text(
    `Exported ${meta.exportedAt.toLocaleString()}`,
    pageW / 2,
    pageH / 2 + 24,
    { align: "center" }
  );
  pdf.text(
    `${bundles.length} topic${bundles.length === 1 ? "" : "s"}`,
    pageW / 2,
    pageH / 2 + 42,
    { align: "center" }
  );

  // ─── Render all topics; record each topic's start page ───
  const topicPage = new Map<string, number>();

  for (let i = 0; i < bundles.length; i++) {
    const b = bundles[i];
    onProgress?.({
      stage: "pdf",
      message: `PDF: topic ${i + 1}/${bundles.length} — ${b.topic.title}`,
      percent: 5 + Math.round((i / bundles.length) * 70),
    });

    // Each topic starts on a new page
    newPage(writer);
    topicPage.set(b.topic.id, writer.page);

    // Breadcrumb
    const breadcrumb = [b.subject.name, b.chapter?.name]
      .filter(Boolean)
      .join("  ›  ");
    if (breadcrumb) {
      setFont(pdf, 9);
      pdf.setTextColor(120);
      pdf.text(breadcrumb, margin, writer.y + 6);
      pdf.setDrawColor(220);
      pdf.line(margin, writer.y + 12, margin + layout.contentW, writer.y + 12);
      writer.y += 22;
    }

    // Title
    pdf.setTextColor(20);
    await drawBlock(writer, {
      kind: "h",
      level: 1,
      runs: [{ text: b.topic.title, bold: true }],
    });

    // Blocks
    for (const block of b.blocks) {
      if (!block.content?.trim()) continue;

      if (block.type === "title") {
        await drawBlock(writer, {
          kind: "h",
          level: 2,
          runs: [{ text: block.content, bold: true }],
        });
        continue;
      }
      if (block.type === "image") {
        await drawBlock(writer, { kind: "img", src: block.content });
        continue;
      }
      if (block.type === "summary" || block.type === "mnemonic") {
        await drawBlock(writer, {
          kind: "h",
          level: 2,
          runs: [
            {
              text: block.type === "summary" ? "Summary" : "Mnemonic",
              bold: true,
            },
          ],
        });
      }
      const parsed = parseHtmlToBlocks(block.content);
      for (const p of parsed) await drawBlock(writer, p);
    }

    if (opts.includeOutline && b.headingTree.length) {
      await drawBlock(writer, {
        kind: "h",
        level: 2,
        runs: [{ text: "Outline", bold: true }],
      });
      const out: Block[] = [];
      headingTreeToBlocks(b.headingTree, 0, out);
      for (const p of out) await drawBlock(writer, p);
    }

    if (opts.includeSummary && b.summary.trim()) {
      await drawBlock(writer, {
        kind: "h",
        level: 2,
        runs: [{ text: "Summary", bold: true }],
      });
      const parsed = parseHtmlToBlocks(b.summary);
      for (const p of parsed) await drawBlock(writer, p);
    }

    if (opts.includeMnemonic && b.mnemonic.trim()) {
      await drawBlock(writer, {
        kind: "h",
        level: 2,
        runs: [{ text: "Mnemonic", bold: true }],
      });
      const parsed = parseHtmlToBlocks(b.mnemonic);
      for (const p of parsed) await drawBlock(writer, p);
    }
  }

  // ─── Build Index pages and insert them right after the cover (page 1) ───
  onProgress?.({ stage: "pdf", message: "Building index…", percent: 78 });

  // Render the index into a scratch pdf so we know its page count, then
  // insert that many blank pages and copy content over.
  const indexPages: Array<() => void> = [];
  {
    // Use a virtual writer that just measures by counting line-breaks against the same layout
    // but renders directly into the live pdf on temporary trailing pages, then we move them.
    const startPage = pdf.getNumberOfPages();
    newPage(writer);
    const indexStart = writer.page;

    // Heading
    pdf.setTextColor(20);
    setFont(pdf, 22, true);
    pdf.text("Index", margin, writer.y + 22);
    writer.y += 36;

    let lastSubject = "";
    let lastChapter = "";

    for (const b of bundles) {
      if (b.subject.name !== lastSubject) {
        ensureSpace(writer, 28);
        writer.y += 8;
        setFont(pdf, 13, true);
        pdf.setTextColor(30);
        pdf.text(b.subject.name, margin, writer.y + 12);
        writer.y += 20;
        lastSubject = b.subject.name;
        lastChapter = "";
      }
      const chap = b.chapter?.name || "Unfiled";
      if (chap !== lastChapter) {
        ensureSpace(writer, 18);
        setFont(pdf, 10.5, false, true);
        pdf.setTextColor(110);
        pdf.text(chap, margin + 14, writer.y + 10);
        writer.y += 16;
        lastChapter = chap;
      }

      ensureSpace(writer, 16);
      const targetPage =
        (topicPage.get(b.topic.id) || 0) + 0; // adjusted later for inserted index pages
      const yLine = writer.y + 11;
      const xStart = margin + 28;
      const pageLabel = String(targetPage);
      setFont(pdf, 11);
      pdf.setTextColor(20, 60, 160);
      const titleText = b.topic.title;
      const titleWidth = Math.min(
        pdf.getTextWidth(titleText),
        layout.contentW - 28 - 40
      );
      // Truncate title if too long
      let drawnTitle = titleText;
      while (
        pdf.getTextWidth(drawnTitle) > layout.contentW - 28 - 50 &&
        drawnTitle.length > 4
      ) {
        drawnTitle = drawnTitle.slice(0, -2);
      }
      if (drawnTitle !== titleText) drawnTitle = drawnTitle.replace(/\s?\S*$/, "") + "…";
      pdf.text(drawnTitle, xStart, yLine);
      const tw = pdf.getTextWidth(drawnTitle);
      // dot leader
      const pageW2 = pdf.getTextWidth(pageLabel);
      const xPageNum = margin + layout.contentW - pageW2;
      const dotStart = xStart + tw + 4;
      const dotEnd = xPageNum - 4;
      if (dotEnd > dotStart) {
        pdf.setTextColor(180);
        const dot = ".";
        const dw = pdf.getTextWidth(". ");
        const count = Math.max(0, Math.floor((dotEnd - dotStart) / dw));
        pdf.text(". ".repeat(count), dotStart, yLine);
      }
      pdf.setTextColor(20, 60, 160);
      pdf.text(pageLabel, xPageNum, yLine);

      // Record link region (page + rect) — fixed up after we reshuffle pages.
      indexPages.push(() => {
        const curPage = pdf.getNumberOfPages();
        // We'll re-attach links in the post-shuffle pass.
        void curPage;
      });

      // Save link metadata for post-pass
      linkRecords.push({
        onPage: writer.page,
        rect: {
          x: margin,
          y: writer.y,
          w: layout.contentW,
          h: 14,
        },
        toTopicId: b.topic.id,
      });

      writer.y += 16;
    }

    const indexEnd = writer.page;
    indexCount = indexEnd - indexStart + 1;
    indexStartPage = indexStart;
    void startPage;
  }

  // ─── Move the index pages from the end to position 2 (right after cover) ───
  // jsPDF page numbering is 1-based. We rendered cover=1, topics=2..N, index=N+1..N+indexCount.
  const totalBefore = pdf.getNumberOfPages();
  const topicsStart = 2;
  const topicsEnd = indexStartPage - 1; // last topic page
  // movePage(from, to) — move each index page in order to immediately after cover.
  for (let k = 0; k < indexCount; k++) {
    // After previous moves, the next index page is at totalBefore (it shifts down by k? actually movePage rewires)
    // Simpler: move the page currently numbered (topicsEnd + 1) — which is always the next index page after each shift —
    // to position 2 + k.
    pdf.movePage(topicsEnd + 1, 2 + k);
  }

  // After moving:
  //   page 1     = cover
  //   pages 2..1+indexCount     = index
  //   pages 2+indexCount..total = topics (shifted by indexCount)
  // Adjust topicPage and index-rendered page labels.
  topicPage.forEach((p, id) => topicPage.set(id, p + indexCount));

  // Re-stamp page numbers on the index lines (they were drawn with pre-shift numbers).
  // We do this by clearing the page-number region on each index line and reprinting.
  // To keep the implementation small, we redraw the page numbers as an overlay using
  // the link records (which carry the row position).
  for (const lr of linkRecords) {
    const newPageNum = (topicPage.get(lr.toTopicId) || 0);
    if (!newPageNum) continue;
    // The index pages were originally rendered on pages [indexStartPage..indexStartPage+indexCount-1],
    // and after movePage they now occupy [2..1+indexCount] in the same relative order.
    const newIndexPage = lr.onPage - indexStartPage + 2;
    pdf.setPage(newIndexPage);

    // Cover the old (stale) number with a white rectangle, then redraw.
    const rightX = layout.margin + layout.contentW;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(rightX - 50, lr.rect.y, 50, lr.rect.h, "F");
    setFont(pdf, 11);
    pdf.setTextColor(20, 60, 160);
    const label = String(newPageNum);
    const lw = pdf.getTextWidth(label);
    pdf.text(label, rightX - lw, lr.rect.y + 11);

    // Add a clickable link covering the whole row.
    pdf.link(lr.rect.x, lr.rect.y - 2, lr.rect.w, lr.rect.h + 2, {
      pageNumber: newPageNum,
    });
  }

  // ─── Footer page numbers on every page ───
  onProgress?.({ stage: "pdf", message: "Adding page numbers…", percent: 95 });
  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    setFont(pdf, 9);
    pdf.setTextColor(140);
    pdf.text(`${p} / ${total}`, pageW / 2, pageH - 22, { align: "center" });
  }

  onProgress?.({ stage: "pdf", message: "Finalizing PDF…", percent: 100 });
  void totalBefore;
  return pdf.output("blob");
}

// shared state for the index pass (module-local closures above)
const linkRecords: Array<{
  onPage: number;
  rect: { x: number; y: number; w: number; h: number };
  toTopicId: string;
}> = [];
let indexCount = 0;
let indexStartPage = 0;
