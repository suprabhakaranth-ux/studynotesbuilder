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
  if (!/\$|\\\(|\\\[/.test(html)) return html;

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
  const tokens = tokenizeMath(text);
  if (!tokens) return null;

  return tokens
    .map((token) => {
      if (token.type === "text") return token.value;

      try {
        const rendered = katex.renderToString(token.latex, {
          displayMode: token.display,
          throwOnError: false,
          output: "html",
        });
        const tag = token.display ? "div" : "span";
        const cls = token.display ? "math-display" : "math-inline";
        const encoded = encodeAttr(token.latex);
        return `<${tag} class="${cls}" data-latex="${encoded}" data-display="${token.display}" contenteditable="false">${rendered}</${tag}>`;
      } catch {
        return token.raw;
      }
    })
    .join("");
};

type MathToken =
  | { type: "text"; value: string }
  | { type: "math"; raw: string; latex: string; display: boolean };

const tokenizeMath = (text: string): MathToken[] | null => {
  const tokens: MathToken[] = [];
  let cursor = 0;
  let found = false;

  while (cursor < text.length) {
    const next = findNextMath(text, cursor);
    if (!next) {
      tokens.push({ type: "text", value: text.slice(cursor) });
      break;
    }

    if (next.start > cursor) {
      tokens.push({ type: "text", value: text.slice(cursor, next.start) });
    }

    tokens.push({
      type: "math",
      raw: text.slice(next.start, next.end),
      latex: next.latex.trim(),
      display: next.display,
    });
    found = true;
    cursor = next.end;
  }

  return found ? tokens : null;
};

const findNextMath = (
  text: string,
  from: number,
): { start: number; end: number; latex: string; display: boolean } | null => {
  const starts: Array<{ index: number; delimiter: "$$" | "\\[" | "\\(" | "$"; display: boolean }> = [];

  const displayBlock = text.indexOf("$$", from);
  if (displayBlock !== -1) starts.push({ index: displayBlock, delimiter: "$$", display: true });

  const bracketBlock = text.indexOf("\\[", from);
  if (bracketBlock !== -1) starts.push({ index: bracketBlock, delimiter: "\\[", display: true });

  const parenInline = text.indexOf("\\(", from);
  if (parenInline !== -1) starts.push({ index: parenInline, delimiter: "\\(", display: false });

  const dollarInline = findInlineDollarStart(text, from);
  if (dollarInline !== -1) starts.push({ index: dollarInline, delimiter: "$", display: false });

  if (starts.length === 0) return null;

  starts.sort((a, b) => a.index - b.index);

  for (const candidate of starts) {
    const endInfo = findMatchingEnd(text, candidate.index, candidate.delimiter);
    if (!endInfo) continue;

    return {
      start: candidate.index,
      end: endInfo.end,
      latex: endInfo.latex,
      display: candidate.display,
    };
  }

  return null;
};

const findInlineDollarStart = (text: string, from: number): number => {
  for (let index = text.indexOf("$", from); index !== -1; index = text.indexOf("$", index + 1)) {
    const prev = text[index - 1];
    const next = text[index + 1];
    if (prev === "\\") continue;
    if (next === "$") {
      index += 1;
      continue;
    }
    return index;
  }
  return -1;
};

const findMatchingEnd = (
  text: string,
  start: number,
  delimiter: "$$" | "\\[" | "\\(" | "$",
): { end: number; latex: string } | null => {
  const openingLength = delimiter.length;
  const closing = delimiter === "$$" ? "$$" : delimiter === "\\[" ? "\\]" : delimiter === "\\(" ? "\\)" : "$";

  let index = start + openingLength;
  while (index < text.length) {
    const nextIndex = text.indexOf(closing, index);
    if (nextIndex === -1) return null;
    if (text[nextIndex - 1] === "\\" && closing === "$") {
      index = nextIndex + 1;
      continue;
    }
    return {
      end: nextIndex + closing.length,
      latex: text.slice(start + openingLength, nextIndex),
    };
  }

  return null;
};

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
