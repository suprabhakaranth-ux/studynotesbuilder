import { Node, mergeAttributes } from "@tiptap/core";
import katex from "katex";
import { MATH_INLINE_ATTR } from "./mathTokenizer";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathInline: {
      insertMathInline: (latex: string) => ReturnType;
    };
  }
}

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      latex: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[${MATH_INLINE_ATTR}]`,
        getAttrs: (el) => ({
          latex: (el as HTMLElement).getAttribute(MATH_INLINE_ATTR) || "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const latex = (node.attrs.latex as string) || "";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        [MATH_INLINE_ATTR]: latex,
        class: "math-inline math-node",
      }),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.className = "math-inline math-node";
      dom.setAttribute(MATH_INLINE_ATTR, (node.attrs.latex as string) || "");
      dom.contentEditable = "false";
      try {
        dom.innerHTML = katex.renderToString(
          (node.attrs.latex as string) || "",
          { throwOnError: false, displayMode: false, output: "html" }
        );
      } catch {
        dom.textContent = `$${node.attrs.latex}$`;
      }
      return { dom };
    };
  },

  addCommands() {
    return {
      insertMathInline:
        (latex: string) =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { latex } })
            .insertContent(" ")
            .run(),
    };
  },
});
