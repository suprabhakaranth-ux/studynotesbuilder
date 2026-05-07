import DOMPurify from "dompurify";
import katex from "katex";

const ALLOWED_TAGS = [
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote",
  "strong", "em", "b", "i", "u", "s", "code", "pre",
  "a", "img", "br", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
  "span", "div", "sub", "sup", "figure", "figcaption",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "colspan", "rowspan",
  "class", "style",
  "data-latex", "data-math-inline", "data-math-display", "data-display",
];

const KEEP_CLASS_PREFIXES = [
  "katex", "math-", "ProseMirror", "tiptap-", "editor-",
];
const DROP_CLASS_PATTERNS = [
  /^Mso/i, /^gmail[-_]/i, /^docs-internal-guid/i,
];

const INLINE_STYLE_KEEP_INLINE = new Set([
  "color", "background-color", "text-align",
  "font-weight", "font-style", "text-decoration",
]);
const INLINE_STYLE_KEEP_BLOCK = new Set(["text-align"]);

const MATH_SELECTOR =
  "[data-latex],[data-math-inline],[data-math-display],.katex,.math-inline,.math-display,.math-node";

const isMathNode = (el: Element): boolean => {
  return !!el.closest(MATH_SELECTOR);
};

const filterClasses = (el: Element) => {
  const cls = el.getAttribute("class");
  if (!cls) return;
  const kept = cls
    .split(/\s+/)
    .filter(Boolean)
    .filter((c) => {
      if (DROP_CLASS_PATTERNS.some((re) => re.test(c))) return false;
      if (KEEP_CLASS_PREFIXES.some((p) => c.startsWith(p))) return true;
      return true;
    });
  if (kept.length === 0) el.removeAttribute("class");
  else el.setAttribute("class", kept.join(" "));
};

const BLOCK_TAGS = new Set([
  "p", "div", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote", "pre", "table",
  "thead", "tbody", "tr", "td", "th", "figure", "hr",
]);

const filterStyles = (el: Element) => {
  const style = el.getAttribute("style");
  if (!style) return;
  const isBlock = BLOCK_TAGS.has(el.tagName.toLowerCase());
  const allowed = isBlock ? INLINE_STYLE_KEEP_BLOCK : INLINE_STYLE_KEEP_INLINE;
  const kept: string[] = [];
  style.split(";").forEach((decl) => {
    const idx = decl.indexOf(":");
    if (idx === -1) return;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val = decl.slice(idx + 1).trim();
    if (!prop || !val) return;
    if (allowed.has(prop)) kept.push(`${prop}: ${val}`);
  });
  if (kept.length === 0) el.removeAttribute("style");
  else el.setAttribute("style", kept.join("; "));
};

const unwrap = (el: Element) => {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
};

const hasBlockChild = (el: Element): boolean => {
  for (const c of Array.from(el.children)) {
    if (BLOCK_TAGS.has(c.tagName.toLowerCase())) return true;
  }
  return false;
};

const isEmptyParagraph = (el: Element): boolean => {
  if (el.querySelector("img,svg," + MATH_SELECTOR)) return false;
  const text = (el.textContent || "").replace(/\u00A0/g, " ").trim();
  return text.length === 0;
};

const collapseBrRuns = (root: Element) => {
  const brs = Array.from(root.querySelectorAll("br"));
  brs.forEach((br) => {
    let next = br.nextSibling;
    let count = 1;
    while (next && next.nodeType === 1 && (next as Element).tagName === "BR") {
      const toRemove = next;
      next = next.nextSibling;
      toRemove.parentNode?.removeChild(toRemove);
      count++;
    }
    if (count >= 2) {
      br.parentNode?.removeChild(br);
    }
  });
};

const normalizeDom = (root: Element) => {
  collapseBrRuns(root);

  const all = Array.from(root.querySelectorAll("*"));
  for (const el of all) {
    if (!el.isConnected) continue;
    if (isMathNode(el)) continue;

    filterClasses(el);
    filterStyles(el);

    const tag = el.tagName.toLowerCase();

    if (tag === "h1") {
      const h2 = el.ownerDocument!.createElement("h2");
      while (el.firstChild) h2.appendChild(el.firstChild);
      Array.from(el.attributes).forEach((a) => h2.setAttribute(a.name, a.value));
      el.replaceWith(h2);
      continue;
    }

    if (tag === "div" && !hasBlockChild(el) && !el.hasAttribute("class") && !el.hasAttribute("style")) {
      const p = el.ownerDocument!.createElement("p");
      while (el.firstChild) p.appendChild(el.firstChild);
      el.replaceWith(p);
      continue;
    }

    if ((tag === "span" || tag === "div") && el.attributes.length === 0) {
      unwrap(el);
      continue;
    }
  }

  Array.from(root.querySelectorAll("p")).forEach((p) => {
    if (isEmptyParagraph(p)) p.remove();
  });
  Array.from(root.querySelectorAll("li")).forEach((li) => {
    if (!li.querySelector("img," + MATH_SELECTOR) && (li.textContent || "").trim() === "") {
      li.remove();
    }
  });
  Array.from(root.querySelectorAll("ul,ol")).forEach((list) => {
    if (list.children.length === 0) list.remove();
  });

  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) textNodes.push(n as Text);
  textNodes.forEach((t) => {
    if (t.parentElement && isMathNode(t.parentElement)) return;
    if (t.data.includes("\u00A0")) {
      t.data = t.data.replace(/\u00A0{2,}/g, " ");
    }
  });

  Array.from(root.querySelectorAll("a[href]")).forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href)) {
      a.setAttribute("rel", "noopener noreferrer nofollow");
      a.setAttribute("target", "_blank");
    }
  });
};

const renderMath = (root: Element) => {
  const inlines = Array.from(root.querySelectorAll("[data-math-inline],[data-latex]"));
  inlines.forEach((el) => {
    if (el.querySelector(".katex")) return;
    const latex =
      el.getAttribute("data-math-inline") ||
      el.getAttribute("data-latex") ||
      el.textContent ||
      "";
    if (!latex) return;
    const display = el.getAttribute("data-math-display") !== null ||
      el.getAttribute("data-display") === "true";
    try {
      el.innerHTML = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: display,
      });
    } catch {
    }
  });
  const displays = Array.from(root.querySelectorAll("[data-math-display]"));
  displays.forEach((el) => {
    if (el.querySelector(".katex")) return;
    const latex = el.getAttribute("data-math-display") || el.textContent || "";
    if (!latex) return;
    try {
      el.innerHTML = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
    }
  });
};

const cache = new Map<string, string>();

export const sanitizePublicHtml = (html: string): string => {
  if (!html) return "";
  const cached = cache.get(html);
  if (cached !== undefined) return cached;

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
  });

  const doc = new DOMParser().parseFromString(`<div>${clean}</div>`, "text/html");
  const root = doc.body.firstElementChild as Element;
  if (root) {
    normalizeDom(root);
    renderMath(root);
  }
  const out = root ? root.innerHTML : clean;
  if (cache.size > 200) cache.clear();
  cache.set(html, out);
  return out;
};
