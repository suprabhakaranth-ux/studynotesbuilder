import type { Editor } from "@tiptap/react";
import { Fragment, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { closeHistory } from "@tiptap/pm/history";

/** Split complete points in-place; never rebuild the editor HTML or split lists. */
export function formatLlmNotes(editor: Editor): number {
  if (!editor.isEditable || editor.isDestroyed) return 0;
  const { doc, selection, schema } = editor.state;
  const paragraph = schema.nodes.paragraph;
  const bold = schema.marks.bold;
  if (!paragraph || !bold) return 0;
  const replacements: { pos: number; size: number; content: Fragment }[] = [];

  doc.descendants((node, pos, parent, index) => {
    if (node.type.name !== "paragraph" || !parent) return;
    if (!selection.empty && (pos + node.nodeSize <= selection.from || pos >= selection.to)) return false;
    // Continuation paragraphs already belong to a point, not a new heading.
    if (parent.type.name === "listItem" && index !== 0) return false;
    // Also leave the body of an already split plain paragraph alone on repeat clicks.
    const previous = index > 0 ? parent.child(index - 1) : null;
    const beforePrevious = index > 1 ? parent.child(index - 2) : null;
    if (previous?.type.name === "paragraph" && previous.content.size === 0 &&
        beforePrevious?.textContent.trim().endsWith(":")) return false;

    const text = node.textContent;
    const colon = text.indexOf(":");
    if (colon <= 0 || colon > 160) return false;
    const title = text.slice(0, colon).trim();
    const bodyText = text.slice(colon + 1);
    // Require prose after the colon, not URLs, times, ratios or heading-only lines.
    if (!/^\s+\S/.test(bodyText) || title.split(/\s+/).length > 18 ||
        !/\p{L}/u.test(title) || /[.!?\n]/.test(title) || /https?$/i.test(title)) return false;

    // textContent offsets equal inline positions only for plain text runs.
    // Leave math, images and hard breaks untouched rather than cutting an atom.
    let textOnly = true;
    node.content.forEach((child) => { if (!child.isText) textOnly = false; });
    if (!textOnly) return false;

    const bodyStart = colon + 1 + (bodyText.match(/^\s*/)?.[0].length ?? 0);
    let headingContent = Fragment.empty;
    node.content.cut(0, colon + 1).forEach((child) => {
      headingContent = headingContent.append(Fragment.from(child.mark(bold.create().addToSet(child.marks))));
    });
    const heading = paragraph.create(node.attrs, headingContent);
    const body = paragraph.create(node.attrs, node.content.cut(bodyStart));
    const nodes: ProseMirrorNode[] = [heading, paragraph.create(), body];
    const next = index + 1 < parent.childCount ? parent.child(index + 1) : null;
    if (next?.type.name !== "paragraph" || next.content.size !== 0) nodes.push(paragraph.create());
    replacements.push({ pos, size: node.nodeSize, content: Fragment.fromArray(nodes) });
    return false;
  });

  if (!replacements.length) return 0;
  const tr = closeHistory(editor.state.tr);
  // Descending positions keep every original point's offsets valid.
  for (const replacement of replacements.reverse()) {
    tr.replaceWith(replacement.pos, replacement.pos + replacement.size, replacement.content);
  }
  editor.view.dispatch(tr.scrollIntoView());
  // Keep later typing separate from this single undoable formatting operation.
  editor.view.dispatch(closeHistory(editor.state.tr));
  editor.view.focus();
  return replacements.length;
}