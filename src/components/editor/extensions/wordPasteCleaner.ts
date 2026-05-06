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
