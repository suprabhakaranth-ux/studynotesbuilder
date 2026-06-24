import katexCss from "katex/dist/katex.min.css?inline";
import { renderTopicHtml, STUDY_PACK_CSS } from "./renderTopicHtml";
import type { TopicBundle, ExportOptions } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Fetch image as base64 data URL; on failure return original src so HTML still validates. */
async function inlineImage(src: string): Promise<string> {
  if (!src || src.startsWith("data:")) return src;
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) return src;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
}

/** Replace every <img src> in an HTML string with a base64 data URL. */
async function inlineAllImages(html: string): Promise<string> {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const imgs = Array.from(doc.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src) return;
      const data = await inlineImage(src);
      img.setAttribute("src", data);
    })
  );
  return doc.body.firstElementChild?.innerHTML || html;
}

interface TocRow {
  subject: string;
  chapter: string | null;
  title: string;
  anchor: string;
}

function buildToc(bundles: TopicBundle[]): { html: string; rows: TocRow[] } {
  const rows: TocRow[] = bundles.map((b) => ({
    subject: b.subject.name,
    chapter: b.chapter?.name || null,
    title: b.topic.title,
    anchor: `topic-${b.topic.id}`,
  }));

  // Group for display
  let html = `<nav class="sp-toc"><h1>Table of Contents</h1><ul class="sp-toc-list">`;
  let lastSubject = "";
  let lastChapter = "";
  rows.forEach((r) => {
    if (r.subject !== lastSubject) {
      html += `<li class="sp-toc-subject">${esc(r.subject)}</li>`;
      lastSubject = r.subject;
      lastChapter = "";
    }
    const chapKey = r.chapter || "—";
    if (chapKey !== lastChapter) {
      html += `<li class="sp-toc-chapter">${esc(chapKey)}</li>`;
      lastChapter = chapKey;
    }
    html += `<li class="sp-toc-topic"><a href="#${r.anchor}">${esc(r.title)}</a><span class="sp-toc-dots"></span><span class="sp-toc-page" data-anchor="${r.anchor}"></span></li>`;
  });
  html += `</ul></nav>`;
  return { html, rows };
}

export async function buildArchiveHtml(
  bundles: TopicBundle[],
  opts: ExportOptions,
  meta: { exportedAt: Date; userName?: string }
): Promise<string> {
  const topicsHtml = await Promise.all(
    bundles.map(async (b) => {
      const rendered = renderTopicHtml(b, opts);
      return await inlineAllImages(rendered);
    })
  );

  const { html: tocHtml } = buildToc(bundles);

  const cover = `
<section class="sp-cover">
  <h1>Study Pack</h1>
  <p>Offline backup of your notes</p>
  <div class="sp-meta">
    Exported ${esc(meta.exportedAt.toLocaleString())}<br/>
    ${bundles.length} topic${bundles.length === 1 ? "" : "s"}
  </div>
</section>`.trim();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Study Pack — ${esc(meta.exportedAt.toISOString().slice(0, 10))}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${katexCss}</style>
<style>${STUDY_PACK_CSS}</style>
</head>
<body>
<div class="sp-page">
${cover}
${tocHtml}
${topicsHtml.join("\n")}
</div>
</body>
</html>`;
}
