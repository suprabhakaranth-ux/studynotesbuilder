// @ts-ignore bun test runner types
import { describe, expect, test } from "bun:test";
import { indentNode, outdentNode, canIndent, reorderSiblings, type TreeNode } from "./treeOps";

const n = (id: string, children: TreeNode[] = []): TreeNode => ({ id, title: id, notes: "", children });
const flat = (ns: TreeNode[], d = 0): string[] => ns.flatMap((x) => [`${d}:${x.id}`, ...flat(x.children, d + 1)]);

describe("summary heading tree", () => {
  test("promoting a sub-heading keeps it in the same place in the sequence", () => {
    const tree = [n("A", [n("a1"), n("a2"), n("a3")]), n("B")];
    expect(flat(outdentNode(tree, "a2"))).toEqual(["0:A", "1:a1", "0:a2", "1:a3", "0:B"]);
  });
  test("a sub-sub-heading (third layer) can be created", () => {
    const tree = [n("A", [n("a1"), n("a2")])];
    expect(flat(indentNode(tree, "a2"))).toEqual(["0:A", "1:a1", "2:a2"]);
  });
  test("no fourth layer", () => {
    const tree = [n("A", [n("a1", [n("x"), n("y")])])];
    expect(canIndent(tree, "y")).toBe(false);
  });
  test("drag reorders sub-headings within their group", () => {
    const tree = [n("A", [n("a1"), n("a2"), n("a3")])];
    expect(flat(reorderSiblings(tree, "a1", "a3"))).toEqual(["0:A", "1:a2", "1:a3", "1:a1"]);
  });
});
