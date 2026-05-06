/**
 * Walks an HTML string's text nodes and replaces $..$ / $$..$$ /
 * \(..\) / \[..\] with placeholder elements that Tiptap math nodes
 * can parse. Preserves surrounding tags (b, span, li, etc.).
 *
 * Also normalizes any pre-rendered legacy KaTeX nodes
 * (`<span class="math-inline" data-latex="..">..</span>`) into the
 * same placeholders, discarding the inner KaTeX HTML.
 */

const MATH_PLACEHOLDER_INLINE = "data-math-inline";
const MATH_PLACEHOLDER_DISPLAY = "data-math-display";

export const MATH_INLINE_ATTR = MATH_PLACEHOLDER_INLINE;
export const MATH_DISPLAY_ATTR = MATH_PLACEHOLDER_DISPLAY;

export const normalizeHtmlForTiptap = (html: string): string => {
  if (!html) return html;
  const container = document.createElement("div");
  container.innerHTML = html;

  // Step 1: convert legacy rendered KaTeX nodes into placeholders
  const legacy = Array.from(
    container.querySelectorAll<HTMLElement>("[data-latex]")
  );
  for (const el of legacy) {
    const latex = el.getAttribute("data-latex") || "";
    const isDisplay =
      el.getAttribute("data-display") === "true" ||
      el.classList.contains("math-display");
    const placeholder = document.createElement(isDisplay ? "div" : "span");
    placeholder.setAttribute(
      isDisplay ? MATH_PLACEHOLDER_DISPLAY : MATH_PLACEHOLDER_INLINE,
      latex
    );
    el.replaceWith(placeholder);
  }

  // Step 2: walk text nodes and tokenize $..$ / $$..$$ / \(..\) / \[..\]
  walkTextNodes(container, (text, parent) => {
    const tokens = tokenize(text);
    if (!tokens) return null;
    const frag = document.createDocumentFragment();
    for (const t of tokens) {
      if (t.type === "text") {
        if (t.value) frag.appendChild(document.createTextNode(t.value));
      } else {
        const el = document.createElement(t.display ? "div" : "span");
        el.setAttribute(
          t.display ? MATH_PLACEHOLDER_DISPLAY : MATH_PLACEHOLDER_INLINE,
          t.latex
        );
        frag.appendChild(el);
      }
    }
    return frag;
  });

  return container.innerHTML;
};

const walkTextNodes = (
  root: Node,
  replacer: (text: string, parent: Node) => DocumentFragment | null
) => {
  // Skip subtrees inside math placeholders or KaTeX
  const SKIP_SELECTOR = `[${MATH_PLACEHOLDER_INLINE}],[${MATH_PLACEHOLDER_DISPLAY}],.katex,script,style`;
  const skip = (n: Node) =>
    n.nodeType === Node.ELEMENT_NODE &&
    (n as Element).matches(SKIP_SELECTOR);

  const collect = (n: Node, out: Text[]) => {
    if (skip(n)) return;
    for (const child of Array.from(n.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) out.push(child as Text);
      else if (child.nodeType === Node.ELEMENT_NODE) collect(child, out);
    }
  };
  const texts: Text[] = [];
  collect(root, texts);

  for (const t of texts) {
    if (!t.parentNode) continue;
    const text = t.nodeValue || "";
    if (!/\$|\\\(|\\\[/.test(text)) continue;
    const frag = replacer(text, t.parentNode);
    if (frag) t.parentNode.replaceChild(frag, t);
  }
};

type Token =
  | { type: "text"; value: string }
  | { type: "math"; latex: string; display: boolean };

const tokenize = (text: string): Token[] | null => {
  const tokens: Token[] = [];
  let cursor = 0;
  let found = false;

  while (cursor < text.length) {
    const next = findNext(text, cursor);
    if (!next) {
      tokens.push({ type: "text", value: text.slice(cursor) });
      break;
    }
    if (next.start > cursor)
      tokens.push({ type: "text", value: text.slice(cursor, next.start) });
    tokens.push({
      type: "math",
      latex: next.latex.trim(),
      display: next.display,
    });
    found = true;
    cursor = next.end;
  }
  return found ? tokens : null;
};

const findNext = (
  text: string,
  from: number
): { start: number; end: number; latex: string; display: boolean } | null => {
  const candidates: Array<{
    index: number;
    delim: "$$" | "\\[" | "\\(" | "$";
    display: boolean;
  }> = [];
  const a = text.indexOf("$$", from);
  if (a !== -1) candidates.push({ index: a, delim: "$$", display: true });
  const b = text.indexOf("\\[", from);
  if (b !== -1) candidates.push({ index: b, delim: "\\[", display: true });
  const c = text.indexOf("\\(", from);
  if (c !== -1) candidates.push({ index: c, delim: "\\(", display: false });
  const d = findInlineDollar(text, from);
  if (d !== -1) candidates.push({ index: d, delim: "$", display: false });
  if (!candidates.length) return null;
  candidates.sort((x, y) => x.index - y.index);

  for (const cand of candidates) {
    const opening = cand.delim.length;
    const closing =
      cand.delim === "$$"
        ? "$$"
        : cand.delim === "\\["
        ? "\\]"
        : cand.delim === "\\("
        ? "\\)"
        : "$";
    let i = cand.index + opening;
    while (i < text.length) {
      const j = text.indexOf(closing, i);
      if (j === -1) break;
      if (closing === "$" && text[j - 1] === "\\") {
        i = j + 1;
        continue;
      }
      const latex = text.slice(cand.index + opening, j);
      if (!latex.trim()) break; // empty math, skip
      return {
        start: cand.index,
        end: j + closing.length,
        latex,
        display: cand.display,
      };
    }
  }
  return null;
};

const findInlineDollar = (text: string, from: number): number => {
  for (let i = text.indexOf("$", from); i !== -1; i = text.indexOf("$", i + 1)) {
    if (text[i - 1] === "\\") continue;
    if (text[i + 1] === "$") {
      i += 1;
      continue;
    }
    return i;
  }
  return -1;
};

/**
 * Post-process Tiptap-emitted HTML so math placeholders become the
 * canonical $..$ / $$..$$ source form that the rest of the app
 * (Word export, public viewer, legacy code) already understands.
 */
export const serializeMathPlaceholders = (html: string): string => {
  if (!html) return html;
  const container = document.createElement("div");
  container.innerHTML = html;

  const inlineEls = Array.from(
    container.querySelectorAll<HTMLElement>(`[${MATH_PLACEHOLDER_INLINE}]`)
  );
  for (const el of inlineEls) {
    const latex = el.getAttribute(MATH_PLACEHOLDER_INLINE) || "";
    el.replaceWith(document.createTextNode(`$${latex}$`));
  }
  const displayEls = Array.from(
    container.querySelectorAll<HTMLElement>(`[${MATH_PLACEHOLDER_DISPLAY}]`)
  );
  for (const el of displayEls) {
    const latex = el.getAttribute(MATH_PLACEHOLDER_DISPLAY) || "";
    el.replaceWith(document.createTextNode(`$$${latex}$$`));
  }
  return container.innerHTML;
};
