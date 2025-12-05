import htmlDocx from 'html-docx-js/dist/html-docx';

/**
 * Convert HTML content to a Word document blob using html-docx-js library.
 * This handles malformed HTML gracefully and preserves all text content.
 * Note: Best results when opened in Microsoft Word.
 */
export const convertHtmlToDocx = async (
  html: string,
  options?: {
    title?: string;
    margins?: { top?: string; right?: string; bottom?: string; left?: string };
  }
): Promise<Blob> => {
  // Wrap content in full HTML document with styling
  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: Calibri, Arial, sans-serif; 
            font-size: 11pt;
            line-height: 1.5;
          }
          h1 { font-size: 18pt; margin-top: 12pt; margin-bottom: 6pt; }
          h2 { font-size: 14pt; margin-top: 12pt; margin-bottom: 6pt; }
          h3 { font-size: 12pt; margin-top: 10pt; margin-bottom: 4pt; }
          h4, h5, h6 { font-size: 11pt; margin-top: 8pt; margin-bottom: 4pt; }
          p { margin-top: 0; margin-bottom: 6pt; }
          ul, ol { margin-top: 6pt; margin-bottom: 6pt; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  return htmlDocx.asBlob(fullHtml);
};

/**
 * Build HTML string for a topic export
 */
export const buildTopicHtml = (
  title: string,
  blocks: { content: string }[],
  headingNodes: { title: string; notes: string; children: any[] }[],
  summaryContent: string,
  mnemonicContent: string
): string => {
  let html = `<h1>${escapeHtml(title)}</h1>`;

  // Add content blocks
  for (const block of blocks) {
    if (block.content) {
      html += block.content;
    }
  }

  // Add headings from Summary tab with hierarchical structure
  if (headingNodes.length > 0) {
    html += `<h2>Summary</h2>`;
    html += buildHeadingNodesHtml(headingNodes, 2);
  }

  // Add summary content
  if (summaryContent.trim()) {
    html += `<h2>Summary Content</h2>`;
    html += summaryContent;
  }

  // Add mnemonic
  if (mnemonicContent.trim()) {
    html += `<h2>Mnemonic</h2>`;
    html += mnemonicContent;
  }

  return html;
};

/**
 * Recursively build HTML for heading nodes
 */
const buildHeadingNodesHtml = (nodes: any[], level: number): string => {
  let html = '';
  const headingTag = level <= 6 ? `h${level}` : 'p';

  for (const node of nodes) {
    html += `<${headingTag}>${escapeHtml(node.title)}</${headingTag}>`;
    if (node.notes) {
      html += node.notes;
    }
    if (node.children && node.children.length > 0) {
      html += buildHeadingNodesHtml(node.children, Math.min(level + 1, 6));
    }
  }

  return html;
};

/**
 * Build HTML string for a chapter export with multiple topics
 */
export const buildChapterHtml = (
  chapterName: string,
  topicsData: Array<{
    title: string;
    blocks: { content: string }[];
    headingNodes: any[];
    summaryContent: string;
    mnemonicContent: string;
  }>
): string => {
  let html = `<h1 style="text-align: center; font-size: 24pt;">${escapeHtml(chapterName)}</h1>`;

  for (let i = 0; i < topicsData.length; i++) {
    const topic = topicsData[i];

    // Add page break before each topic (except the first one)
    if (i > 0) {
      html += '<br style="page-break-before: always;">';
    }

    // Add topic title
    html += `<h2>${escapeHtml(topic.title)}</h2>`;

    // Add content blocks
    for (const block of topic.blocks) {
      if (block.content) {
        html += block.content;
      }
    }

    // Add headings from Summary tab
    if (topic.headingNodes.length > 0) {
      html += `<h3>Summary</h3>`;
      html += buildHeadingNodesHtml(topic.headingNodes, 4);
    }

    // Add summary content
    if (topic.summaryContent.trim()) {
      html += `<h3>Summary Content</h3>`;
      html += topic.summaryContent;
    }

    // Add mnemonic
    if (topic.mnemonicContent.trim()) {
      html += `<h3>Mnemonic</h3>`;
      html += topic.mnemonicContent;
    }
  }

  return html;
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
