import { Node, mergeAttributes } from "@tiptap/core";
import katex from "katex";
import { MATH_DISPLAY_ATTR } from "./mathTokenizer";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathDisplay: {
      insertMathDisplay: (latex: string) => ReturnType;
    };
  }
}

export const MathDisplay = Node.create({
  name: "mathDisplay",
  group: "block",
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
        tag: `div[${MATH_DISPLAY_ATTR}]`,
        getAttrs: (el) => ({
          latex: (el as HTMLElement).getAttribute(MATH_DISPLAY_ATTR) || "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const latex = (node.attrs.latex as string) || "";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        [MATH_DISPLAY_ATTR]: latex,
        class: "math-display math-node",
      }),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className = "math-display math-node";
      dom.setAttribute(MATH_DISPLAY_ATTR, (node.attrs.latex as string) || "");
      dom.contentEditable = "false";
      try {
        dom.innerHTML = katex.renderToString(
          (node.attrs.latex as string) || "",
          { throwOnError: false, displayMode: true, output: "html" }
        );
      } catch {
        dom.textContent = `$$${node.attrs.latex}$$`;
      }
      return { dom };
    };
  },

  addCommands() {
    return {
      insertMathDisplay:
        (latex: string) =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { latex } })
            .insertContent({ type: "paragraph" })
            .focus()
            .run(),
    };
  },
});
