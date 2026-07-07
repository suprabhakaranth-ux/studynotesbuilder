import {
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from "docx";
import { restoreMathSource } from "@/utils/mathRenderer";

/**
 * Convert CSS pixel values to twip (twentieth of a point)
 * Returns undefined for invalid/non-numeric values
 */
const pxToTwip = (px: string | null): number | undefined => {
  if (!px || px === "normal" || px === "auto") return undefined;
  const value = parseFloat(px.replace("px", ""));
  if (isNaN(value) || value === 0) return undefined;
  return Math.round(value * 15); // approx conversion
};

/**
 * Convert rgb(r, g, b) to hex format for Word
 */
const rgbToHex = (rgb: string): string | undefined => {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return undefined;
  const [, r, g, b] = match;
  return ((1 << 24) + (parseInt(r) << 16) + (parseInt(g) << 8) + parseInt(b))
    .toString(16)
    .slice(1);
};

/**
 * Extract inline style and map it to TextRun formatting
 */
const getTextStyle = (element: HTMLElement, inherited: any) => {
  const style = window.getComputedStyle(element);

  return {
    bold:
      inherited.bold ||
      style.fontWeight === "bold" ||
      parseInt(style.fontWeight) >= 600,

    italics: inherited.italic || style.fontStyle === "italic",

    underline:
      inherited.underline || style.textDecoration.includes("underline")
        ? {}
        : undefined,

    color:
      style.color && style.color !== "rgb(0, 0, 0)"
        ? rgbToHex(style.color)
        : undefined,

    // Note: highlight removed as it requires specific color names in docx
    // and arbitrary hex values cause document corruption

    size: style.fontSize ? parseInt(style.fontSize) * 2 : undefined, // docx size is half-points
  };
};

/**
 * Convert inline content (with tags) into TextRun[]
 */
const processInline = (
  node: Node,
  inherited: any = {},
  runs: TextRun[] = []
): TextRun[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    if (text) {
      runs.push(new TextRun({ text, ...inherited }));
    }
    return runs;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    let next = { ...inherited };

    if (tag === "strong" || tag === "b") next.bold = true;
    if (tag === "em" || tag === "i") next.italics = true;
    if (tag === "u") next.underline = {};

    // Get CSS styling
    next = { ...next, ...getTextStyle(el, inherited) };

    if (tag === "br") {
      runs.push(new TextRun({ break: 1 }));
      return runs;
    }

    el.childNodes.forEach((child) => processInline(child, next, runs));
    return runs;
  }

  return runs;
};

/**
 * Legacy function - parses HTML to TextRun objects (kept for compatibility)
 */
export const parseHtmlToRuns = (html: string): TextRun[] => {
  if (!html) return [];

  // Convert any rendered math nodes back to their LaTeX source so they
  // export as readable text in Word.
  const prepared = restoreMathSource(html);

  const root = document.createElement("div");
  root.innerHTML = prepared;

  // Temporarily attach to DOM for getComputedStyle to work
  root.style.position = "absolute";
  root.style.left = "-9999px";
  document.body.appendChild(root);

  const runs: TextRun[] = [];
  root.childNodes.forEach((node) => processInline(node, {}, runs));

  document.body.removeChild(root);
  return runs;
};

/**
 * Recursively parse HTML into paragraphs (block level) with enhanced formatting
 */
export const parseHtmlToParagraphs = (html: string): Array<Paragraph | Table> => {
  if (!html) return [];

  const prepared = restoreMathSource(html);

  const root = document.createElement("div");
  root.innerHTML = prepared;

  // Temporarily attach to DOM for getComputedStyle to work
  root.style.position = "absolute";
  root.style.left = "-9999px";
  document.body.appendChild(root);

  const paragraphs: Paragraph[] = [];

  const walk = (el: HTMLElement, listLevel = 0) => {
    const tag = el.tagName.toLowerCase();
    const style = window.getComputedStyle(el);

    // Extract spacing values (filter out undefined)
    const spacingRaw = {
      before: pxToTwip(style.marginTop),
      after: pxToTwip(style.marginBottom),
      // Note: lineHeight removed as it requires specific docx line spacing format
      // (e.g., 240 for single, 360 for 1.5x) not direct twip conversion
    };
    
    // Clean up spacing object - remove undefined values
    const spacing = Object.fromEntries(
      Object.entries(spacingRaw).filter(([_, v]) => v !== undefined)
    ) as any;

    // HEADINGS
    if (["h1", "h2", "h3", "h4"].includes(tag)) {
      const headingMap: any = {
        h1: HeadingLevel.HEADING_1,
        h2: HeadingLevel.HEADING_2,
        h3: HeadingLevel.HEADING_3,
        h4: HeadingLevel.HEADING_4,
      };
      paragraphs.push(
        new Paragraph({
          text: el.textContent || "",
          heading: headingMap[tag],
          spacing,
        })
      );
      return;
    }

    // ORDERED LIST
    if (tag === "ol") {
      Array.from(el.children).forEach((li) => {
        if (li.tagName.toLowerCase() === "li") {
          const runs = processInline(li, {});
          if (runs.length) {
            paragraphs.push(
              new Paragraph({
                children: runs,
                numbering: { reference: "default-numbering", level: listLevel },
                spacing,
              })
            );
          }

          // Handle nested lists inside li
          Array.from(li.children).forEach((child: any) => {
            if (
              child.tagName?.toLowerCase() === "ol" ||
              child.tagName?.toLowerCase() === "ul"
            ) {
              walk(child, listLevel + 1);
            }
          });
        }
      });
      return;
    }

    // UNORDERED LIST
    if (tag === "ul") {
      Array.from(el.children).forEach((li) => {
        if (li.tagName.toLowerCase() === "li") {
          const runs = processInline(li, {});
          if (runs.length) {
            paragraphs.push(
              new Paragraph({
                children: runs,
                bullet: { level: listLevel },
                spacing,
              })
            );
          }

          Array.from(li.children).forEach((child: any) => {
            if (
              child.tagName?.toLowerCase() === "ul" ||
              child.tagName?.toLowerCase() === "ol"
            ) {
              walk(child, listLevel + 1);
            }
          });
        }
      });
      return;
    }

    // CONTAINER ELEMENTS - only recurse, don't process inline content
    if (["div", "section", "article"].includes(tag)) {
      Array.from(el.children).forEach((child) =>
        walk(child as HTMLElement, listLevel)
      );
      return;
    }

    // LEAF BLOCK ELEMENTS - process inline content and return
    if (["p", "span"].includes(tag)) {
      const runs = processInline(el, {});
      if (runs.length) {
        const options: any = { children: runs };
        if (Object.keys(spacing).length > 0) {
          options.spacing = spacing;
        }
        paragraphs.push(new Paragraph(options));
      }
      return;
    }

    // RECURSE CHILDREN for any other elements
    Array.from(el.children).forEach((child) =>
      walk(child as HTMLElement, listLevel)
    );
  };

  Array.from(root.children).forEach((child) => walk(child as HTMLElement, 0));

  // Clean up DOM
  document.body.removeChild(root);

  return paragraphs;
};

/**
 * Creates a page break paragraph
 */
export const createPageBreak = (): Paragraph => {
  return new Paragraph({
    children: [new PageBreak()],
  });
};
