import { Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from "docx";

/**
 * Parses HTML content and converts it to Word TextRun objects with formatting preserved
 */
export const parseHtmlToRuns = (html: string): TextRun[] => {
  if (!html) return [];
  
  const runs: TextRun[] = [];
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const processNode = (node: Node, inheritedFormatting: { bold?: boolean; italic?: boolean; underline?: boolean } = {}): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) {
        runs.push(new TextRun({
          text,
          bold: inheritedFormatting.bold,
          italics: inheritedFormatting.italic,
          underline: inheritedFormatting.underline ? {} : undefined,
        }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      // Update formatting based on current tag
      const currentFormatting = { ...inheritedFormatting };
      
      if (tagName === 'strong' || tagName === 'b') {
        currentFormatting.bold = true;
      } else if (tagName === 'em' || tagName === 'i') {
        currentFormatting.italic = true;
      } else if (tagName === 'u') {
        currentFormatting.underline = true;
      } else if (tagName === 'br') {
        runs.push(new TextRun({ break: 1 }));
        return;
      }

      // Process children with inherited formatting
      node.childNodes.forEach(child => processNode(child, currentFormatting));
    }
  };

  tempDiv.childNodes.forEach(node => processNode(node, {}));
  return runs;
};

/**
 * Converts HTML content to Word Paragraph objects with proper formatting and spacing
 */
export const parseHtmlToParagraphs = (html: string): Paragraph[] => {
  if (!html) return [];

  const paragraphs: Paragraph[] = [];
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const processElement = (element: HTMLElement): void => {
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'p') {
      const runs = parseHtmlToRuns(element.innerHTML);
      if (runs.length > 0) {
        paragraphs.push(new Paragraph({
          children: runs,
          spacing: { after: 200, line: 276 }, // Add spacing after paragraph
        }));
      }
    } else if (tagName === 'h1') {
      const text = element.textContent || '';
      if (text.trim()) {
        paragraphs.push(new Paragraph({
          text,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }));
      }
    } else if (tagName === 'h2') {
      const text = element.textContent || '';
      if (text.trim()) {
        paragraphs.push(new Paragraph({
          text,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        }));
      }
    } else if (tagName === 'h3') {
      const text = element.textContent || '';
      if (text.trim()) {
        paragraphs.push(new Paragraph({
          text,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 200 },
        }));
      }
    } else if (tagName === 'ul') {
      // Process list items
      const listItems = element.querySelectorAll('li');
      listItems.forEach(li => {
        const runs = parseHtmlToRuns(li.innerHTML);
        if (runs.length > 0) {
          paragraphs.push(new Paragraph({
            children: runs,
            bullet: { level: 0 },
            spacing: { after: 100 },
          }));
        }
      });
    } else if (tagName === 'ol') {
      // Process numbered list items
      const listItems = element.querySelectorAll('li');
      listItems.forEach((li, index) => {
        const runs = parseHtmlToRuns(li.innerHTML);
        if (runs.length > 0) {
          paragraphs.push(new Paragraph({
            children: runs,
            numbering: { reference: "default-numbering", level: 0 },
            spacing: { after: 100 },
          }));
        }
      });
    } else if (tagName === 'br') {
      paragraphs.push(new Paragraph({ children: [new TextRun({ break: 1 })] }));
    } else {
      // For other elements, try to extract text with formatting
      const runs = parseHtmlToRuns(element.innerHTML);
      if (runs.length > 0) {
        paragraphs.push(new Paragraph({
          children: runs,
          spacing: { after: 200 },
        }));
      }
    }
  };

  // Process direct children of the div
  Array.from(tempDiv.children).forEach(child => {
    if (child instanceof HTMLElement) {
      processElement(child);
    }
  });

  // If no block elements found, treat as single paragraph
  if (paragraphs.length === 0) {
    const runs = parseHtmlToRuns(html);
    if (runs.length > 0) {
      paragraphs.push(new Paragraph({
        children: runs,
        spacing: { after: 200 },
      }));
    }
  }

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
