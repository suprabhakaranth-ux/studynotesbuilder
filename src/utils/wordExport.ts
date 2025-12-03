import { Paragraph, TextRun, HeadingLevel, PageBreak } from "docx";

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

  const root = document.createElement("div");
  root.innerHTML = html;

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
 * Export result with validation info
 */
export interface ExportResult {
  paragraphs: Paragraph[];
  sourceCharCount: number;
  exportedCharCount: number;
  ratio: number;
  hasWarning: boolean;
}

/**
 * Recursively parse HTML into paragraphs (block level) with enhanced formatting
 * Returns paragraphs and validation metrics
 */
export const parseHtmlToParagraphs = (html: string): Paragraph[] => {
  const result = parseHtmlToParagraphsWithValidation(html);
  return result.paragraphs;
};

/**
 * Parse HTML with validation - returns paragraphs and character count metrics
 */
export const parseHtmlToParagraphsWithValidation = (html: string): ExportResult => {
  if (!html) return { paragraphs: [], sourceCharCount: 0, exportedCharCount: 0, ratio: 1, hasWarning: false };

  const root = document.createElement("div");
  root.innerHTML = html;

  // Calculate source text length (excluding whitespace for comparison)
  const sourceText = root.textContent || "";
  const sourceCharCount = sourceText.replace(/\s+/g, "").length;

  // Temporarily attach to DOM for getComputedStyle to work
  root.style.position = "absolute";
  root.style.left = "-9999px";
  document.body.appendChild(root);

  const paragraphs: Paragraph[] = [];
  let exportedTextBuffer: string[] = [];

  const walk = (el: HTMLElement, listLevel = 0) => {
    const tag = el.tagName.toLowerCase();
    const style = window.getComputedStyle(el);

    // Extract spacing values (filter out undefined)
    const spacingRaw = {
      before: pxToTwip(style.marginTop),
      after: pxToTwip(style.marginBottom),
    };
    
    // Clean up spacing object - remove undefined values
    const spacing = Object.fromEntries(
      Object.entries(spacingRaw).filter(([_, v]) => v !== undefined)
    ) as any;

    // Skip meta and br tags at block level
    if (tag === "meta" || tag === "br") {
      return;
    }

    // HEADINGS
    if (["h1", "h2", "h3", "h4"].includes(tag)) {
      const text = el.textContent || "";
      const headingMap: any = {
        h1: HeadingLevel.HEADING_1,
        h2: HeadingLevel.HEADING_2,
        h3: HeadingLevel.HEADING_3,
        h4: HeadingLevel.HEADING_4,
      };
      paragraphs.push(
        new Paragraph({
          text,
          heading: headingMap[tag],
          spacing,
        })
      );
      exportedTextBuffer.push(text);
      return;
    }

    // ORDERED LIST - handle all children, not just <li>
    if (tag === "ol") {
      Array.from(el.children).forEach((child) => {
        const childTag = child.tagName.toLowerCase();
        
        if (childTag === "li") {
          const runs = processInline(child, {});
          const text = child.textContent || "";
          if (runs.length) {
            paragraphs.push(
              new Paragraph({
                children: runs,
                numbering: { reference: "default-numbering", level: listLevel },
                spacing,
              })
            );
            exportedTextBuffer.push(text);
          }

          // Handle nested lists inside li
          Array.from(child.children).forEach((nested: any) => {
            const nestedTag = nested.tagName?.toLowerCase();
            if (nestedTag === "ol" || nestedTag === "ul") {
              walk(nested, listLevel + 1);
            }
          });
        } else if (childTag === "ol" || childTag === "ul") {
          // Nested list directly under ol
          walk(child as HTMLElement, listLevel + 1);
        } else if (["div", "p", "section", "article"].includes(childTag)) {
          // Block element inside list - recurse
          walk(child as HTMLElement, listLevel);
        } else if (["span", "b", "strong", "em", "i", "a", "u", "s"].includes(childTag)) {
          // Inline element with content - extract as paragraph
          const runs = processInline(child, {});
          const text = child.textContent || "";
          if (runs.length) {
            paragraphs.push(new Paragraph({ children: runs }));
            exportedTextBuffer.push(text);
          }
        }
        // Skip meta, br, etc.
      });
      return;
    }

    // UNORDERED LIST - handle all children, not just <li>
    if (tag === "ul") {
      Array.from(el.children).forEach((child) => {
        const childTag = child.tagName.toLowerCase();
        
        if (childTag === "li") {
          const runs = processInline(child, {});
          const text = child.textContent || "";
          if (runs.length) {
            paragraphs.push(
              new Paragraph({
                children: runs,
                bullet: { level: listLevel },
                spacing,
              })
            );
            exportedTextBuffer.push(text);
          }

          // Handle nested lists inside li
          Array.from(child.children).forEach((nested: any) => {
            const nestedTag = nested.tagName?.toLowerCase();
            if (nestedTag === "ul" || nestedTag === "ol") {
              walk(nested, listLevel + 1);
            }
          });
        } else if (childTag === "ul" || childTag === "ol") {
          // Nested list directly under ul
          walk(child as HTMLElement, listLevel + 1);
        } else if (["div", "p", "section", "article"].includes(childTag)) {
          // Block element inside list - recurse
          walk(child as HTMLElement, listLevel);
        } else if (["span", "b", "strong", "em", "i", "a", "u", "s"].includes(childTag)) {
          // Inline element with content - extract as paragraph
          const runs = processInline(child, {});
          const text = child.textContent || "";
          if (runs.length) {
            paragraphs.push(new Paragraph({ children: runs }));
            exportedTextBuffer.push(text);
          }
        }
        // Skip meta, br, etc.
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
      const text = el.textContent || "";
      if (runs.length) {
        const options: any = { children: runs };
        if (Object.keys(spacing).length > 0) {
          options.spacing = spacing;
        }
        paragraphs.push(new Paragraph(options));
        exportedTextBuffer.push(text);
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

  // Calculate exported text length
  const exportedCharCount = exportedTextBuffer.join("").replace(/\s+/g, "").length;
  const ratio = sourceCharCount > 0 ? exportedCharCount / sourceCharCount : 1;
  const hasWarning = ratio < 0.9 && sourceCharCount > 100;

  if (hasWarning) {
    console.warn(`Export validation: Only ${Math.round(ratio * 100)}% of content exported. Source: ${sourceCharCount} chars, Exported: ${exportedCharCount} chars`);
  }

  return { paragraphs, sourceCharCount, exportedCharCount, ratio, hasWarning };
};

/**
 * Creates a page break paragraph
 */
export const createPageBreak = (): Paragraph => {
  return new Paragraph({
    children: [new PageBreak()],
  });
};
