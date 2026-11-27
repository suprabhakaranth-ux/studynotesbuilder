import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { closeHistory } from "@tiptap/pm/history";

/** A line drawn with box/arrow characters, as NotebookLM outputs diagrams. */
export function isDiagramLine(line: string): boolean {
  if (/[│┃║┌┐└┘├┤┬┴┼─━═╔╗╚╝╠╣╦╩╬▼▲►◄→←↓↑]/.test(line)) return true;
  if (/\|.*\|/.test(line) || /^\s*\|/.test(line)) return true;
  if (/[-=]{3,}|-->|<--|\+-{2,}/.test(line)) return true;
  return false;
}

const lineTexts = (node: ProseMirrorNode): string[] => {
  const lines = [""];
  node.content.forEach((c) => {
    if (c.type.name === "hardBreak") lines.push("");
    else lines[lines.length - 1] += c.isText ? c.text : c.textContent;
  });
  return lines.map((l) => l.replace(/\u00a0/g, " "));
};

/**
 * Merge runs of diagram-looking paragraphs into one editable code block so
 * spacing is kept and CSS can shrink it to fit the page. Returns blocks made.
 */
export function formatDiagrams(editor: Editor, range?: { from: number; to: number }): number {
  if (!editor.isEditable || editor.isDestroyed) return 0;
  const { doc, selection, schema } = editor.state;
  const codeBlock = schema.nodes.codeBlock;
  if (!codeBlock) return 0;
  const scope = range ?? (selection.empty ? null : { from: selection.from, to: selection.to });
  type Item = { pos: number; size: number; lines: string[]; diagram: boolean; blank: boolean };
  const groups: Item[][] = [];
  let run: Item[] = [];
  const flush = () => {
    while (run.length && !run[run.length - 1].diagram) run.pop();
    if (run.filter((i) => i.diagram).length >= 3) groups.push(run);
    run = [];
  };
  // Only direct children of the document: lists and tables are left alone.
  doc.forEach((node, pos) => {
    if (scope && (pos + node.nodeSize <= scope.from || pos >= scope.to)) { flush(); return; }
    if (node.type.name !== "paragraph") { flush(); return; }
    const lines = lineTexts(node);
    const text = lines.join("");
    const diagram = lines.some(isDiagramLine);
    const item = { pos, size: node.nodeSize, lines, diagram, blank: !text.trim() };
    if (diagram) { run.push(item); return; }
    if (!run.length) return;
    // Allow short labels / blank lines between diagram rows.
    const gap = run.slice(-2).every((i) => !i.diagram);
    if (gap || text.length > 80) { flush(); return; }
    run.push(item);
  });
  flush();
  if (!groups.length) return 0;
  const tr = closeHistory(editor.state.tr);
  for (const g of groups.reverse()) {
    const from = g[0].pos;
    const last = g[g.length - 1];
    const text = g.flatMap((i) => i.lines).join("\n").replace(/\s+$/, "");
    tr.replaceWith(from, last.pos + last.size, codeBlock.create({ language: "diagram" }, schema.text(text)));
  }
  editor.view.dispatch(tr);
  return groups.length;
}
