import { toDocx } from 'docshift';

/**
 * Convert HTML content to a Word document blob using docshift library.
 * This is a pure client-side library that handles HTML to DOCX conversion.
 */
export const convertHtmlToDocx = async (html: string): Promise<Blob> => {
  // Wrap content in styled HTML for better formatting
  const styledHtml = `
    <div style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5;">
      ${html}
    </div>
  `;

  return await toDocx(styledHtml);
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
  let html = `<h1 style="text-align: center;">${escapeHtml(chapterName)}</h1>`;

  for (let i = 0; i < topicsData.length; i++) {
    const topic = topicsData[i];

    // Add page break before each topic (except the first one)
    if (i > 0) {
      html += '<p style="page-break-before: always;"></p>';
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
