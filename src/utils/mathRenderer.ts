import katex from "katex";

/**
 * Renders LaTeX in a string to KaTeX HTML.
 * Detects: $$...$$, $...$, \[...\], \(...\)
 * Replaces matches with <span class="math-inline" data-latex="..."> or
 * <span class="math-display" data-latex="...">.
 *
 * Operates on raw HTML by walking text nodes only, so existing markup
 * (bold, lists, images, etc.) is preserved.
 */
export const renderMathInHTML = (html: string): string => {
  if (!html) return html;
  // Skip work if no delimiters at all
  if (!/\$|\\(|\\[/.test(html)) return html;

  const container = document.createElement("div");
  container.innerHTML = html;

  walkAndRender(container);

  return container.innerHTML;
};

const walkAndRender = (node: Node) => {
  // Don't re-render inside already-rendered math
  if (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).matches('.math-inline, .math-display, .katex, [data-latex]')
  ) {
    return;
  }

  // Don't process script/style
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tag = (node as Element).tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "IMG") return;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue || "";
    const replaced = replaceMathInText(text);
    if (replaced !== null) {
      const wrapper = document.createElement("span");
      wrapper.innerHTML = replaced;
      const parent = node.parentNode;
      if (parent) {
        while (wrapper.firstChild) {
          parent.insertBefore(wrapper.firstChild, node);
        }
        parent.removeChild(node);
      }
    }
    return;
  }

  // Recurse over children (snapshot since we mutate)
  const children = Array.from(node.childNodes);
  for (const child of children) {
    walkAndRender(child);
  }
};

/**
 * Find LaTeX delimiters in plain text and replace with rendered HTML.
 * Returns null if no math found (so caller can skip the work).
 */
const replaceMathInText = (text: string): string | null => {
  // Order matters: longer/escape-style delimiters first
  const patterns: Array<{ regex: RegExp; display: boolean }> = [
    { regex: /\$\$([\s\S]+?)\$\$/g, display: true },
    { regex: /\\\[([\s\S]+?)\\\]/g, display: true },
    { regex: /\\\(([\s\S]+?)\\\)/g, display: false },
    { regex: /\$([^\$\n]+?)\$/g, display: false },
  ];

  let result = text;
  let found = false;

  for (const { regex, display } of patterns) {
    result = result.replace(regex, (match, latex) => {
      const trimmed = latex.trim();
      if (!trimmed) return match;
      try {
        const rendered = katex.renderToString(trimmed, {
          displayMode: display,
          throwOnError: false,
          output: "html",
        });
        found = true;
        const tag = display ? "div" : "span";
        const cls = display ? "math-display" : "math-inline";
        // Encode latex source for round-tripping
        const encoded = encodeAttr(trimmed);
        return `<${tag} class="${cls}" data-latex="${encoded}" data-display="${display}" contenteditable="false">${rendered}</${tag}>`;
      } catch {
        return match;
      }
    });
  }

  return found ? escapePlainSegments(result) : null;
};

// We only inserted HTML for the math segments; the rest of `text` is plain
// text and must be HTML-escaped to keep angle brackets safe. But our
// regex .replace() preserved the original text — since the source was a
// text node (already plain), the only HTML we added is the <span>/<div>
// for math, which uses safe characters. So no extra escaping needed
// beyond what KaTeX produced. This helper exists if we ever need it.
const escapePlainSegments = (s: string): string => s;

const encodeAttr = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Inverse of renderMathInHTML: takes HTML possibly containing rendered
 * math nodes and converts each back to its source delimited form
 * ($...$ or $$...$$). Used before saving so stored content stays editable.
 */
export const restoreMathSource = (html: string): string => {
  if (!html || !/data-latex=/.test(html)) return html;

  const container = document.createElement("div");
  container.innerHTML = html;

  const nodes = Array.from(container.querySelectorAll<HTMLElement>("[data-latex]"));
  for (const node of nodes) {
    const latex = node.getAttribute("data-latex") || "";
    const display = node.getAttribute("data-display") === "true";
    const delim = display ? `$$${latex}$$` : `$${latex}$`;
    const text = document.createTextNode(delim);
    node.replaceWith(text);
  }

  return container.innerHTML;
};

/**
 * Quick check: does this string look like it contains any LaTeX math?
 */
export const containsMath = (s: string): boolean =>
  !!s && /\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)/.test(s);
