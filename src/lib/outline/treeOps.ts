export interface TreeNode {
  id: string;
  title: string;
  notes: string;
  children: TreeNode[];
}

/** Deepest allowed level (0 = heading, 1 = sub-heading, 2 = sub-sub-heading). */
export const MAX_DEPTH = 2;

const height = (n: TreeNode): number =>
  n.children.length ? 1 + Math.max(...n.children.map(height)) : 0;

/** Returns [siblingList, index, depth] for a node id, or null. */
const locate = (nodes: TreeNode[], id: string, depth = 0): [TreeNode[], number, number] | null => {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return [nodes, i, depth];
    const r = locate(nodes[i].children, id, depth + 1);
    if (r) return r;
  }
  return null;
};

const clone = (nodes: TreeNode[]): TreeNode[] => nodes.map((n) => ({ ...n, children: clone(n.children) }));

export const canIndent = (nodes: TreeNode[], id: string): boolean => {
  const loc = locate(nodes, id);
  if (!loc) return false;
  const [list, i, depth] = loc;
  return i > 0 && depth + 1 + height(list[i]) <= MAX_DEPTH;
};

/** Make the node the last child of the item just above it (same visual position). */
export const indentNode = (nodes: TreeNode[], id: string): TreeNode[] => {
  if (!canIndent(nodes, id)) return nodes;
  const next = clone(nodes);
  const [list, i] = locate(next, id)!;
  const [node] = list.splice(i, 1);
  list[i - 1].children.push(node);
  return next;
};

/**
 * Lift the node one level, placing it right after its parent. Siblings that
 * came after it become its children, so the visible sequence never changes.
 */
export const outdentNode = (nodes: TreeNode[], id: string): TreeNode[] => {
  const next = clone(nodes);
  const findParent = (list: TreeNode[], parentList: TreeNode[] | null, parentIdx: number): boolean => {
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      const ci = n.children.findIndex((c) => c.id === id);
      if (ci >= 0) {
        const [node] = n.children.splice(ci, 1);
        const following = n.children.splice(ci);
        node.children.push(...following);
        list.splice(i + 1, 0, node);
        return true;
      }
      if (findParent(n.children, list, i)) return true;
    }
    return false;
  };
  return findParent(next, null, -1) ? next : nodes;
};

export const canOutdent = (nodes: TreeNode[], id: string): boolean => {
  const loc = locate(nodes, id);
  return !!loc && loc[2] > 0;
};

/** Reorder within the same sibling list (drag & drop). */
export const reorderSiblings = (nodes: TreeNode[], activeId: string, overId: string): TreeNode[] => {
  const next = clone(nodes);
  const a = locate(next, activeId);
  const o = locate(next, overId);
  if (!a || !o || a[0] !== o[0]) return nodes;
  const [list, from] = a;
  const [node] = list.splice(from, 1);
  list.splice(o[1], 0, node);
  return next;
};

export const replaceNode = (nodes: TreeNode[], updated: TreeNode): TreeNode[] =>
  nodes.map((n) => (n.id === updated.id ? updated : { ...n, children: replaceNode(n.children, updated) }));

export const removeNode = (nodes: TreeNode[], id: string): TreeNode[] =>
  nodes.filter((n) => n.id !== id).map((n) => ({ ...n, children: removeNode(n.children, id) }));
