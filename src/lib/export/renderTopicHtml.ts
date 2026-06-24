import type { TopicBundle, ExportHeadingNode, ExportOptions } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderHeadingTree(nodes: ExportHeadingNode[]): string {
  if (!nodes.length) return "";
  const renderNode = (n: ExportHeadingNode): string => {
    const kids = n.children.length
      ? `<ol class="sp-outline-list">${n.children.map(renderNode).join("")}</ol>`
      : "";
    const notes = n.notes ? `<div class="sp-outline-notes">${n.notes}</div>` : "";
    return `<li><span class="sp-outline-title">${esc(n.title)}</span>${notes}${kids}</li>`;
  };
  return `<ol class="sp-outline-list">${nodes.map(renderNode).join("")}</ol>`;
}

/** Render one topic to the canonical HTML used by all three exporters. */
export function renderTopicHtml(b: TopicBundle, opts: ExportOptions): string {
  const breadcrumb = [b.subject.name, b.chapter?.name, b.topic.title]
    .filter(Boolean)
    .map(esc)
    .join(" &rsaquo; ");

  const blockTitle = (type: string) => {
    switch (type) {
      case "title":
        return "Title";
      case "summary":
        return "Summary";
      case "mnemonic":
        return "Mnemonic";
      case "image":
        return "Image";
      default:
        return "";
    }
  };

  const blocksHtml = b.blocks
    .filter((bl) => (bl.content || "").trim().length > 0)
    .map((bl) => {
      if (bl.type === "title") {
        // Plain title block
        return `<h2 class="sp-block-title">${esc(bl.content)}</h2>`;
      }
      if (bl.type === "image") {
        // content holds the image URL
        return `<figure class="sp-block-image"><img src="${esc(bl.content)}" alt="" /></figure>`;
      }
      const heading = blockTitle(bl.type);
      const head = heading
        ? `<h3 class="sp-block-heading sp-block-${esc(bl.type)}">${heading}</h3>`
        : "";
      return `<section class="sp-block sp-block-${esc(bl.type)}">${head}<div class="sp-block-body">${bl.content}</div></section>`;
    })
    .join("\n");

  const outlineHtml =
    opts.includeOutline && b.headingTree.length
      ? `<section class="sp-outline"><h2>Outline</h2>${renderHeadingTree(b.headingTree)}</section>`
      : "";

  const summaryHtml =
    opts.includeSummary && b.summary.trim()
      ? `<section class="sp-summary"><h2>Summary</h2><div>${b.summary}</div></section>`
      : "";

  const mnemonicHtml =
    opts.includeMnemonic && b.mnemonic.trim()
      ? `<section class="sp-mnemonic"><h2>Mnemonic</h2><div>${b.mnemonic}</div></section>`
      : "";

  return `
<section class="sp-topic" id="topic-${esc(b.topic.id)}" data-topic-id="${esc(b.topic.id)}">
  <header class="sp-breadcrumb">${breadcrumb}</header>
  <h1 class="sp-topic-title">${esc(b.topic.title)}</h1>
  <article class="sp-blocks">${blocksHtml}</article>
  ${outlineHtml}
  ${summaryHtml}
  ${mnemonicHtml}
</section>`.trim();
}

export const STUDY_PACK_CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 12pt;
  line-height: 1.55;
  color: #1a1a1a;
  background: #fff;
  margin: 0;
}
.sp-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 48px 56px;
}
h1, h2, h3, h4 { font-family: "Helvetica Neue", Arial, sans-serif; color: #111; }
h1 { font-size: 22pt; margin: 0 0 16px; }
h2 { font-size: 16pt; margin: 24px 0 12px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
h3 { font-size: 13pt; margin: 18px 0 8px; }
p { margin: 0 0 10px; }
ul, ol { margin: 0 0 12px 24px; padding: 0; }
li { margin: 4px 0; }
table { border-collapse: collapse; margin: 12px 0; width: 100%; }
th, td { border: 1px solid #888; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #f0f0f0; }
img { max-width: 100%; height: auto; }
figure { margin: 12px 0; }
.sp-cover {
  text-align: center;
  padding: 80px 40px;
  page-break-after: always;
  break-after: page;
}
.sp-cover h1 { font-size: 32pt; margin-bottom: 16px; }
.sp-cover .sp-meta { color: #555; font-size: 11pt; margin-top: 24px; }
.sp-toc {
  page-break-after: always;
  break-after: page;
}
.sp-toc h1 { border-bottom: 2px solid #333; padding-bottom: 8px; }
.sp-toc-list { list-style: none; padding: 0; margin: 16px 0; }
.sp-toc-subject { font-weight: bold; margin-top: 14px; font-size: 13pt; }
.sp-toc-chapter { font-weight: 600; margin: 6px 0 4px 16px; font-size: 12pt; color: #333; }
.sp-toc-topic { display: flex; justify-content: space-between; margin-left: 32px; padding: 2px 0; }
.sp-toc-topic a { color: #1d4ed8; text-decoration: none; flex: 1; }
.sp-toc-topic .sp-toc-page { color: #555; font-variant-numeric: tabular-nums; margin-left: 12px; }
.sp-toc-topic .sp-toc-dots {
  flex: 1; border-bottom: 1px dotted #999; margin: 0 6px 4px; min-width: 20px;
}
.sp-topic {
  page-break-before: always;
  break-before: page;
  padding-top: 8px;
}
.sp-topic:first-child { page-break-before: auto; break-before: auto; }
.sp-breadcrumb {
  font-size: 10pt;
  color: #666;
  border-bottom: 1px solid #ddd;
  padding-bottom: 6px;
  margin-bottom: 12px;
  font-family: "Helvetica Neue", Arial, sans-serif;
}
.sp-topic-title { font-size: 20pt; margin: 0 0 16px; }
.sp-block { margin: 16px 0; }
.sp-block-heading { font-size: 12pt; color: #555; margin: 12px 0 6px; }
.sp-block-summary { background: #fffceb; padding: 10px 14px; border-left: 4px solid #f5c518; border-radius: 4px; }
.sp-block-mnemonic { background: #f1f7ff; padding: 10px 14px; border-left: 4px solid #3b82f6; border-radius: 4px; }
.sp-block-image img { display: block; margin: 0 auto; }
.sp-outline ol { margin-left: 18px; }
.sp-outline-title { font-weight: 600; }
.sp-outline-notes { font-size: 11pt; color: #444; margin: 2px 0 4px; }
.sp-summary, .sp-mnemonic { margin-top: 20px; }
.sp-summary > div, .sp-mnemonic > div { padding: 10px 14px; border-radius: 4px; }
.sp-summary > div { background: #fffceb; border-left: 4px solid #f5c518; }
.sp-mnemonic > div { background: #f1f7ff; border-left: 4px solid #3b82f6; }
@media print {
  body { font-size: 11pt; }
  .sp-page { padding: 0; max-width: none; }
  .sp-topic { page-break-before: always; }
  .sp-toc, .sp-cover { page-break-after: always; }
}
`;
