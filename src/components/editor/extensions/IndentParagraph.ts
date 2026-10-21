import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indentParagraph: {
      indentBlock: () => ReturnType;
      outdentBlock: () => ReturnType;
    };
  }
}

const STEP = 40;

const parseIndent = (el: HTMLElement): number => {
  const ml = el.style.marginLeft;
  if (!ml) return 0;
  const v = parseInt(ml, 10);
  return Number.isFinite(v) ? v : 0;
};

const renderIndent = (attrs: Record<string, unknown>) => {
  if (!attrs.indent) return {};
  return { style: `margin-left: ${attrs.indent}px` };
};

/**
 * Preserves and edits margin-left on paragraphs, headings and list items —
 * used for the existing indent/outdent feature and for round-tripping
 * legacy notes that store indentation as inline style.
 *
 * List items are indented at the <li> level so the bullet/number marker
 * moves together with the text (indenting the inner paragraph would shift
 * the text while the marker stays put).
 */
export const IndentParagraph = Extension.create({
  name: "indentParagraph",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "listItem"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => parseIndent(el as HTMLElement),
            renderHTML: (attrs) => renderIndent(attrs),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indentBlock:
        () =>
        ({ state, chain }) => {
          const { from, to } = state.selection;
          // When the selection touches list items, indent the <li> so the
          // bullet/number moves with the text.
          let hasListItem = false;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.type.name === "listItem") hasListItem = true;
          });
          const tr = chain();
          if (hasListItem) {
            let ok = false;
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (node.type.name === "listItem") {
                ok = true;
                const cur = (node.attrs.indent as number) || 0;
                tr.command(({ tr }) => {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    indent: cur + STEP,
                  });
                  return true;
                });
              }
            });
            return ok ? tr.run() : false;
          }
          let ok = false;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              ok = true;
            }
          });
          if (!ok) return false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              const cur = (node.attrs.indent as number) || 0;
              tr.command(({ tr }) => {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: cur + STEP,
                });
                return true;
              });
            }
          });
          return tr.run();
        },
      outdentBlock:
        () =>
        ({ state, chain }) => {
          const { from, to } = state.selection;
          let hasListItem = false;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.type.name === "listItem") hasListItem = true;
          });
          const tr = chain();
          if (hasListItem) {
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (node.type.name === "listItem") {
                const cur = (node.attrs.indent as number) || 0;
                const next = Math.max(0, cur - STEP);
                if (next !== cur) {
                  tr.command(({ tr }) => {
                    tr.setNodeMarkup(pos, undefined, {
                      ...node.attrs,
                      indent: next,
                    });
                    return true;
                  });
                }
              }
            });
            return tr.run();
          }
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              const cur = (node.attrs.indent as number) || 0;
              const next = Math.max(0, cur - STEP);
              if (next !== cur) {
                tr.command(({ tr }) => {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    indent: next,
                  });
                  return true;
                });
              }
            }
          });
          return tr.run();
        },
    };
  },
});
