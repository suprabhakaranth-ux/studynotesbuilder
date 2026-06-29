/**
 * Cleans HTML pasted from MS Word, Google Docs, and similar sources
 * before it reaches Tiptap. Removes mso-* / o:p / w:* gunk, unwraps
 * Google Docs' faux-bold wrapper, drops empty spans, and strips
 * dangerous tags / event handlers.
 */
export const cleanPastedHtml = (html: string): string => {
  if (!html) return "";
  const container = document.createElement("div");
  container.innerHTML = html;

  // Convert "fake" tables (CSS display:table / display:grid built from divs,
  // as produced by Gemini, Claude, ChatGPT, and some PDF exports) into real
  // <table> markup so Tiptap's Table schema preserves them.
  convertFakeTables(container);

  // Remove dangerous / chrome elements
  container
    .querySelectorAll(
      "script, style, iframe, object, embed, link, meta, title, head"
    )
    .forEach((el) => el.remove());

  // Remove MS Office namespaced tags (o:p, w:*, v:*)
  Array.from(container.querySelectorAll("*")).forEach((el) => {
    if (/^(o|w|v|m|st1):/i.test(el.tagName)) {
      // unwrap
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    }
  });

  // Strip event handlers, MS classes/styles, normalize attrs
  Array.from(container.querySelectorAll<HTMLElement>("*")).forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      if (name === "class") {
        if (/^Mso/i.test(attr.value)) el.removeAttribute(attr.name);
      }
      if (name === "lang" || name === "id" || name.startsWith("xml:")) {
        el.removeAttribute(attr.name);
      }
    });

    // Clean inline style: drop mso-* and empty styles
    const style = el.getAttribute("style");
    if (style) {
      const cleaned = style
        .split(";")
        .map((s) => s.trim())
        .filter(
          (s) =>
            s &&
            !/^mso-/i.test(s) &&
            !/^font-variant-ligatures/i.test(s) &&
            !/^line-height\s*:\s*normal/i.test(s)
        )
        .join("; ");
      if (cleaned) el.setAttribute("style", cleaned);
      else el.removeAttribute("style");
    }
  });

  // Convert <font> to <span style>
  Array.from(container.querySelectorAll("font")).forEach((font) => {
    const span = document.createElement("span");
    const color = font.getAttribute("color");
    const face = font.getAttribute("face");
    const size = font.getAttribute("size");
    const styles: string[] = [];
    if (color) styles.push(`color: ${color}`);
    if (face) styles.push(`font-family: ${face}`);
    if (size) styles.push(`font-size: ${size}`);
    if (styles.length) span.setAttribute("style", styles.join("; "));
    while (font.firstChild) span.appendChild(font.firstChild);
    font.replaceWith(span);
  });

  // Google Docs faux-bold wrapper: <b style="font-weight:normal">..</b>
  Array.from(container.querySelectorAll("b")).forEach((b) => {
    const fw = (b as HTMLElement).style.fontWeight;
    if (fw === "normal" || fw === "400") {
      const parent = b.parentNode;
      if (parent) {
        while (b.firstChild) parent.insertBefore(b.firstChild, b);
        parent.removeChild(b);
      }
    }
  });

  // Drop empty spans (no attrs, no text)
  Array.from(container.querySelectorAll("span")).forEach((span) => {
    if (!span.attributes.length && !span.textContent?.trim() && !span.querySelector("img")) {
      const parent = span.parentNode;
      if (parent) {
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        parent.removeChild(span);
      }
    }
  });

  // Remove HTML comments
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_COMMENT);
  const comments: ChildNode[] = [];
  let n = walker.nextNode();
  while (n) {
    comments.push(n as ChildNode);
    n = walker.nextNode();
  }
  comments.forEach((c) => c.remove());

  return container.innerHTML;
};

/* ---------------- fake-table → real-table conversion ---------------- */

const getStyle = (el: Element, prop: string): string => {
  const s = (el as HTMLElement).style?.[prop as any] as string | undefined;
  if (s) return s.toLowerCase();
  const attr = el.getAttribute("style") || "";
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i").exec(attr);
  return m ? m[1].trim().toLowerCase() : "";
};

const replaceTag = (el: Element, tag: string): HTMLElement => {
  const next = document.createElement(tag);
  while (el.firstChild) next.appendChild(el.firstChild);
  el.replaceWith(next);
  return next;
};

/**
 * Walk the tree and convert div-based "tables" into real HTML tables.
 * Handles two common patterns:
 *  (A) CSS table model: display:table / table-row / table-cell on divs.
 *  (B) CSS grid: a container with display:grid + grid-template-columns of N
 *      tracks, whose direct children are cells laid out row-major.
 */
function convertFakeTables(root: HTMLElement) {
  // Pattern A: display:table
  const tableLikes = Array.from(root.querySelectorAll<HTMLElement>("div, section")).filter(
    (el) => getStyle(el, "display") === "table"
  );
  for (const el of tableLikes) {
    el.querySelectorAll<HTMLElement>("*").forEach((d) => {
      const disp = getStyle(d, "display");
      if (disp === "table-row") replaceTag(d, "tr");
      else if (disp === "table-cell") replaceTag(d, "td");
      else if (disp === "table-header-group") replaceTag(d, "thead");
      else if (disp === "table-row-group") replaceTag(d, "tbody");
    });
    replaceTag(el, "table");
  }

  // Pattern B: display:grid with a fixed column count
  const gridLikes = Array.from(root.querySelectorAll<HTMLElement>("div, section")).filter(
    (el) => getStyle(el, "display") === "grid"
  );
  for (const el of gridLikes) {
    const cols = getStyle(el, "grid-template-columns");
    if (!cols) continue;
    // Count tracks (handles "1fr 1fr 1fr", "repeat(3, 1fr)", "120px 1fr 1fr", etc.)
    const repeatMatch = /repeat\(\s*(\d+)\s*,/.exec(cols);
    const colCount = repeatMatch
      ? parseInt(repeatMatch[1], 10)
      : cols.replace(/\([^)]*\)/g, "").trim().split(/\s+/).filter(Boolean).length;
    if (colCount < 2) continue;

    const cells = Array.from(el.children);
    if (cells.length < colCount) continue;

    const table = document.createElement("table");
    const tbody = document.createElement("tbody");
    for (let i = 0; i < cells.length; i += colCount) {
      const tr = document.createElement("tr");
      for (let j = 0; j < colCount && i + j < cells.length; j++) {
        const td = document.createElement("td");
        const cell = cells[i + j];
        while (cell.firstChild) td.appendChild(cell.firstChild);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    el.replaceWith(table);
  }
}
