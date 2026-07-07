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
  BorderStyle,
  PageOrientation,
  Bookmark,
  InternalHyperlink,
  SimpleField,
  TabStopType,
  TabStopPosition,
  LeaderType,
} from "docx";
} from "docx";
import type { Table } from "docx";
import type { TopicBundle, ExportOptions, ProgressCallback } from "./types";
import { parseHtmlToParagraphs, createPageBreak } from "@/utils/wordExport";


const PAGE_SIZES = {
  a4: { width: 11906, height: 16838 },
  letter: { width: 12240, height: 15840 },
};
const MARGIN = 1440;

// Bookmark IDs must not contain hyphens for maximum Word compatibility.
const bookmarkIdFor = (topicId: string) => `topic_${topicId.replace(/-/g, "")}`;

function flattenHeadings(nodes: any[], level: number, out: Paragraph[]): void {
  nodes.forEach((n) => {
    const headingLevel =
      level === 0
        ? HeadingLevel.HEADING_2
        : level === 1
        ? HeadingLevel.HEADING_3
        : HeadingLevel.HEADING_4;
    out.push(
      new Paragraph({
        text: n.title,
        heading: headingLevel,
        spacing: { before: 200, after: 120 },
      })
    );
    if (n.notes) {
      out.push(...parseHtmlToParagraphs(n.notes));
    }
    if (n.children?.length) flattenHeadings(n.children, level + 1, out);
  });
}

export async function buildArchiveDocx(
  bundles: TopicBundle[],
  opts: ExportOptions,
  meta: { exportedAt: Date },
  onProgress?: ProgressCallback
): Promise<Blob> {
  const pageSize = PAGE_SIZES[opts.paper];

  const children: Array<Paragraph> = [];

  // ───────── Cover page ─────────
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 200 },
      children: [
        new TextRun({ text: "Study Pack", bold: true, size: 72, font: "Arial" }),
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
          color: "555555",
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
          color: "777777",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `${bundles.length} topic${bundles.length === 1 ? "" : "s"}`,
          size: 22,
          color: "777777",
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // ───────── Index (clickable, with auto page numbers) ─────────
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
      children: [new TextRun({ text: "Index", bold: true })],
    })
  );

  let lastSubject = "";
  let lastChapter = "";
  bundles.forEach((b) => {
    if (b.subject.name !== lastSubject) {
      children.push(
        new Paragraph({
          spacing: { before: 220, after: 80 },
          children: [
            new TextRun({
              text: b.subject.name,
              bold: true,
              size: 26,
              font: "Arial",
            }),
          ],
        })
      );
      lastSubject = b.subject.name;
      lastChapter = "";
    }
    const chapName = b.chapter?.name || "Unfiled";
    if (chapName !== lastChapter) {
      children.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({
              text: chapName,
              italics: true,
              size: 22,
              color: "555555",
            }),
          ],
        })
      );
      lastChapter = chapName;
    }

    const bmId = bookmarkIdFor(b.topic.id);
    children.push(
      new Paragraph({
        indent: { left: 720 },
        spacing: { after: 40 },
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: TabStopPosition.MAX,
            leader: LeaderType.DOT,
          },
        ],
        children: [
          new InternalHyperlink({
            anchor: bmId,
            children: [
              new TextRun({
                text: b.topic.title,
                color: "1155CC",
                size: 22,
              }),
            ],
          }),
          new TextRun({ text: "\t", size: 22 }),
          new SimpleField(`PAGEREF ${bmId} \\h`, "1"),
        ],
      })
    );
  });

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ───────── Topics ─────────
  for (let i = 0; i < bundles.length; i++) {
    const b = bundles[i];
    onProgress?.({
      stage: "docx",
      message: `Word: topic ${i + 1}/${bundles.length}`,
      percent: Math.round(((i + 1) / bundles.length) * 100),
    });

    if (i > 0) children.push(createPageBreak());

    // Breadcrumb
    const breadcrumb = [b.subject.name, b.chapter?.name]
      .filter(Boolean)
      .join("  ›  ");
    if (breadcrumb) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 4,
              color: "DDDDDD",
              space: 4,
            },
          },
          children: [
            new TextRun({
              text: breadcrumb,
              color: "777777",
              size: 18,
              font: "Arial",
            }),
          ],
        })
      );
    }

    // Title — wrap title text in a Bookmark so the Index can link/PAGEREF here.
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 240 },
        children: [
          new Bookmark({
            id: bookmarkIdFor(b.topic.id),
            children: [new TextRun({ text: b.topic.title, bold: true })],
          }),
        ],
      })
    );

    // Blocks — reuse the proven single-topic renderer
    for (const block of b.blocks) {
      if (!block.content?.trim()) continue;

      if (block.type === "title") {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: block.content })],
            spacing: { before: 240, after: 120 },
          })
        );
        continue;
      }

      if (block.type === "image") {
        // Skipped here — images inside rich content come through parseHtmlToParagraphs.
        // Standalone image blocks: include as a labelled placeholder paragraph.
        continue;
      }

      if (block.type === "summary" || block.type === "mnemonic") {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: block.type === "summary" ? "Summary" : "Mnemonic",
              }),
            ],
            spacing: { before: 240, after: 120 },
          })
        );
      }

      children.push(...parseHtmlToParagraphs(block.content));
    }

    // Outline (heading tree)
    if (opts.includeOutline && b.headingTree.length) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 160 },
          children: [new TextRun({ text: "Outline" })],
        })
      );
      const outline: Paragraph[] = [];
      flattenHeadings(b.headingTree, 0, outline);
      children.push(...outline);
    }

    // Summary tab content
    if (opts.includeSummary && b.summary.trim()) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 160 },
          children: [new TextRun({ text: "Summary" })],
        })
      );
      children.push(...parseHtmlToParagraphs(b.summary));
    }

    // Mnemonic tab content
    if (opts.includeMnemonic && b.mnemonic.trim()) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 160 },
          children: [new TextRun({ text: "Mnemonic" })],
        })
      );
      children.push(...parseHtmlToParagraphs(b.mnemonic));
    }
  }

  // ───────── Document ─────────
  const doc = new Document({
    creator: "Study Notes Builder",
    title: "Study Pack",
    features: { updateFields: true }, // forces Word/Docs to refresh PAGEREFs on open
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
        {
          id: "Heading4",
          name: "Heading 4",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, font: "Arial", color: "333333" },
          paragraph: { spacing: { before: 120, after: 80 }, outlineLevel: 3 },
        },
      ],
    },
    numbering: {
      // Matches the reference used inside parseHtmlToParagraphs (single-topic export).
      config: [
        {
          reference: "default-numbering",
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
              format: LevelFormat.DECIMAL,
              text: "%1.%2.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
            {
              level: 2,
              format: LevelFormat.DECIMAL,
              text: "%1.%2.%3.",
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
                    color: "AAAAAA",
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
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: "666666",
                  }),
                  new TextRun({ text: " of ", size: 18, color: "666666" }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: "666666",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
