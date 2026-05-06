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

/**
 * Preserves and edits margin-left on paragraphs and headings — used
 * for the existing indent/outdent feature and for round-tripping
 * legacy notes that store indentation as inline style.
 */
export const IndentParagraph = Extension.create({
  name: "indentParagraph",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => {
              const ml = (el as HTMLElement).style.marginLeft;
              if (!ml) return 0;
              const v = parseInt(ml, 10);
              return Number.isFinite(v) ? v : 0;
            },
            renderHTML: (attrs) => {
              if (!attrs.indent) return {};
              return { style: `margin-left: ${attrs.indent}px` };
            },
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
          let ok = false;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              ok = true;
            }
          });
          if (!ok) return false;
          const tr = chain();
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
          const tr = chain();
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
