import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  LevelFormat,
  AlignmentType,
  PageBreak,
  Footer,
  Header,
  PageNumber,
  TableOfContents,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  ImageRun,
  PageOrientation,
} from "docx";
import type { TopicBundle, ExportOptions, ProgressCallback } from "./types";

const PAGE_SIZES = {
  a4: { width: 11906, height: 16838 }, // DXA (twips)
  letter: { width: 12240, height: 15840 },
};
const MARGIN = 1440; // 1 inch
const CONTENT_WIDTH_DXA = (size: "a4" | "letter") =>
  PAGE_SIZES[size].width - MARGIN * 2;

interface InlineStyle {
  bold?: boolean;
  italics?: boolean;
  underline?: {} | undefined;
  size?: number;
  color?: string;
}

function processInline(node: Node, inherited: InlineStyle = {}): TextRun[] {
  const out: TextRun[] = [];
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    if (text) out.push(new TextRun({ text, ...inherited }));
    return out;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return out;

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const next: InlineStyle = { ...inherited };
  if (tag === "strong" || tag === "b") next.bold = true;
  if (tag === "em" || tag === "i") next.italics = true;
  if (tag === "u") next.underline = {};
  if (tag === "br") {
    out.push(new TextRun({ break: 1 }));
    return out;
  }

  el.childNodes.forEach((c) => out.push(...processInline(c, next)));
  return out;
}

async function fetchImageBuffer(
  src: string
): Promise<{ data: ArrayBuffer; type: "png" | "jpg" | "gif" | "bmp" } | null> {
  if (!src) return null;
  try {
    let blob: Blob;
    if (src.startsWith("data:")) {
      const res = await fetch(src);
      blob = await res.blob();
    } else {
      const res = await fetch(src, { mode: "cors" });
      if (!res.ok) return null;
      blob = await res.blob();
    }
    const mime = blob.type.toLowerCase();
    let type: "png" | "jpg" | "gif" | "bmp" = "png";
    if (mime.includes("jpeg") || mime.includes("jpg")) type = "jpg";
    else if (mime.includes("gif")) type = "gif";
    else if (mime.includes("bmp")) type = "bmp";
    const data = await blob.arrayBuffer();
    return { data, type };
  } catch {
    return null;
  }
}

async function makeImageParagraph(src: string): Promise<Paragraph | null> {
  const img = await fetchImageBuffer(src);
  if (!img) return null;
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new ImageRun({
        type: img.type as any,
        data: img.data,
        transformation: { width: 480, height: 320 },
        altText: { title: "Image", description: "Image", name: "image" },
      }),
    ],
  });
}

async function makeTableElement(
  tableEl: HTMLTableElement,
  contentWidthDxa: number
): Promise<Table> {
  const rows = Array.from(tableEl.querySelectorAll("tr"));
  const colCount = Math.max(
    1,
    ...rows.map((r) => r.querySelectorAll("th,td").length)
  );
  const colWidth = Math.floor(contentWidthDxa / colCount);
  const columnWidths = Array(colCount).fill(colWidth);
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "888888" };
  const cellBorders = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
  };

  const docxRows = rows.map((tr, rIdx) => {
    const cells = Array.from(tr.querySelectorAll("th,td"));
    const padded = [...cells];
    while (padded.length < colCount) padded.push(document.createElement("td"));
    return new TableRow({
      children: padded.map((cell, cIdx) => {
        const runs = processInline(cell);
        return new TableCell({
          width: { size: columnWidths[cIdx], type: WidthType.DXA },
          borders: cellBorders,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          shading:
            (cell as HTMLElement).tagName.toLowerCase() === "th"
              ? { fill: "EEEEEE", type: ShadingType.CLEAR, color: "auto" }
              : undefined,
          children: [
            new Paragraph({
              children: runs.length ? runs : [new TextRun("")],
            }),
          ],
        });
      }),
    });
  });

  return new Table({
    width: { size: contentWidthDxa, type: WidthType.DXA },
    columnWidths,
    rows: docxRows,
  });
}

/**
 * Convert an HTML fragment to a flat array of docx block elements (Paragraph | Table | Image-bearing Paragraph).
 */
async function htmlToDocxBlocks(
  html: string,
  contentWidthDxa: number
): Promise<Array<Paragraph | Table>> {
  if (!html) return [];
  const root = document.createElement("div");
  root.innerHTML = html;

  const out: Array<Paragraph | Table> = [];

  async function walk(el: HTMLElement, listLevel = 0) {
    const tag = el.tagName.toLowerCase();

    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      const map: any = {
        h1: HeadingLevel.HEADING_2, // demote since topic title is H1
        h2: HeadingLevel.HEADING_3,
        h3: HeadingLevel.HEADING_4,
        h4: HeadingLevel.HEADING_5,
        h5: HeadingLevel.HEADING_6,
        h6: HeadingLevel.HEADING_6,
      };
      out.push(
        new Paragraph({
          heading: map[tag],
          children: processInline(el),
          spacing: { before: 200, after: 100 },
        })
      );
      return;
    }

    if (tag === "ol") {
      Array.from(el.children).forEach((liEl) => {
        if (liEl.tagName.toLowerCase() === "li") {
          const runs = processInline(liEl);
          if (runs.length) {
            out.push(
              new Paragraph({
                children: runs,
                numbering: { reference: "sp-numbering", level: listLevel },
              })
            );
          }
          Array.from(liEl.children).forEach(async (c: any) => {
            const ct = c.tagName?.toLowerCase();
            if (ct === "ol" || ct === "ul") await walk(c as HTMLElement, listLevel + 1);
          });
        }
      });
      return;
    }

    if (tag === "ul") {
      Array.from(el.children).forEach((liEl) => {
        if (liEl.tagName.toLowerCase() === "li") {
          const runs = processInline(liEl);
          if (runs.length) {
            out.push(
              new Paragraph({
                children: runs,
                bullet: { level: listLevel },
              })
            );
          }
          Array.from(liEl.children).forEach(async (c: any) => {
            const ct = c.tagName?.toLowerCase();
            if (ct === "ol" || ct === "ul") await walk(c as HTMLElement, listLevel + 1);
          });
        }
      });
      return;
    }

    if (tag === "table") {
      const t = await makeTableElement(el as HTMLTableElement, contentWidthDxa);
      out.push(t);
      return;
    }

    if (tag === "img") {
      const src = (el as HTMLImageElement).getAttribute("src") || "";
      const p = await makeImageParagraph(src);
      if (p) out.push(p);
      return;
    }

    if (tag === "figure") {
      const img = el.querySelector("img");
      if (img) {
        const p = await makeImageParagraph(img.getAttribute("src") || "");
        if (p) out.push(p);
      }
      return;
    }

    if (["div", "section", "article", "header", "nav"].includes(tag)) {
      for (const c of Array.from(el.children)) {
        await walk(c as HTMLElement, listLevel);
      }
      return;
    }

    if (tag === "p" || tag === "span" || tag === "blockquote") {
      const runs = processInline(el);
      if (runs.length) {
        out.push(
          new Paragraph({
            children: runs,
            spacing: { after: 120 },
          })
        );
      }
      return;
    }

    if (tag === "hr") {
      out.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "888888", space: 1 },
          },
        })
      );
      return;
    }

    // Unknown — recurse children
    for (const c of Array.from(el.children)) {
      await walk(c as HTMLElement, listLevel);
    }
  }

  for (const c of Array.from(root.children)) {
    await walk(c as HTMLElement, 0);
  }
  return out;
}

function headingTreeParagraphs(nodes: any[], level = 0): Paragraph[] {
  const out: Paragraph[] = [];
  nodes.forEach((n) => {
    out.push(
      new Paragraph({
        bullet: { level },
        children: [new TextRun({ text: n.title, bold: true })],
      })
    );
    if (n.notes) {
      out.push(
        new Paragraph({
          indent: { left: 720 * (level + 1) },
          children: [new TextRun({ text: n.notes })],
        })
      );
    }
    if (n.children?.length) out.push(...headingTreeParagraphs(n.children, level + 1));
  });
  return out;
}

export async function buildArchiveDocx(
  bundles: TopicBundle[],
  opts: ExportOptions,
  meta: { exportedAt: Date },
  onProgress?: ProgressCallback
): Promise<Blob> {
  const pageSize = PAGE_SIZES[opts.paper];
  const contentWidthDxa = CONTENT_WIDTH_DXA(opts.paper);

  const children: Array<Paragraph | Table | TableOfContents> = [];

  // Cover
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 200 },
      children: [
        new TextRun({ text: "Study Pack", bold: true, size: 64, font: "Arial" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "Offline backup of your notes",
          size: 28,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Exported ${meta.exportedAt.toLocaleString()}`,
          italics: true,
          size: 22,
          color: "555555",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${bundles.length} topic${bundles.length === 1 ? "" : "s"}`,
          size: 22,
          color: "555555",
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // TOC
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Table of Contents" })],
    }),
    new TableOfContents("Table of Contents", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Topics
  for (let i = 0; i < bundles.length; i++) {
    const b = bundles[i];
    onProgress?.({
      stage: "docx",
      message: `Word: topic ${i + 1}/${bundles.length}`,
      percent: Math.round(((i + 1) / bundles.length) * 100),
    });

    // Breadcrumb
    const breadcrumb = [b.subject.name, b.chapter?.name, b.topic.title]
      .filter(Boolean)
      .join(" › ");

    children.push(
      new Paragraph({
        pageBreakBefore: i > 0,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: breadcrumb,
            color: "666666",
            size: 18,
            font: "Arial",
          }),
        ],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 },
        },
      })
    );

    // Title (H1)
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: b.topic.title })],
        spacing: { before: 200, after: 200 },
      })
    );

    // Blocks
    for (const block of b.blocks) {
      if (!block.content?.trim()) continue;
      if (block.type === "title") {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: block.content })],
          })
        );
        continue;
      }
      if (block.type === "image") {
        const p = await makeImageParagraph(block.content);
        if (p) children.push(p);
        continue;
      }
      if (["summary", "mnemonic"].includes(block.type)) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [
              new TextRun({
                text: block.type === "summary" ? "Summary" : "Mnemonic",
              }),
            ],
          })
        );
      }
      const blocks = await htmlToDocxBlocks(block.content, contentWidthDxa);
      children.push(...blocks);
    }

    // Outline
    if (opts.includeOutline && b.headingTree.length) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: "Outline" })],
          spacing: { before: 240 },
        })
      );
      children.push(...headingTreeParagraphs(b.headingTree));
    }

    // Summary tab
    if (opts.includeSummary && b.summary.trim()) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: "Summary" })],
          spacing: { before: 240 },
        })
      );
      children.push(...(await htmlToDocxBlocks(b.summary, contentWidthDxa)));
    }

    // Mnemonic tab
    if (opts.includeMnemonic && b.mnemonic.trim()) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: "Mnemonic" })],
          spacing: { before: 240 },
        })
      );
      children.push(...(await htmlToDocxBlocks(b.mnemonic, contentWidthDxa)));
    }
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 40, bold: true, font: "Arial", color: "1A1A1A" },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 30, bold: true, font: "Arial", color: "1A1A1A" },
          paragraph: { spacing: { before: 200, after: 160 }, outlineLevel: 1 },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial", color: "333333" },
          paragraph: { spacing: { before: 160, after: 120 }, outlineLevel: 2 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "sp-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.LOWER_LETTER,
              text: "%2.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
            {
              level: 2,
              format: LevelFormat.LOWER_ROMAN,
              text: "%3.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 2160, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: pageSize.width,
              height: pageSize.height,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "Study Pack",
                    color: "999999",
                    size: 18,
                    font: "Arial",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Page ", size: 18, color: "666666" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "666666" }),
                  new TextRun({ text: " of ", size: 18, color: "666666" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "666666" }),
                ],
              }),
            ],
          }),
        },
        children: children as any,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
