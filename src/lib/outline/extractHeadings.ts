export interface OutlineHeadingNode {
  id: string;
  title: string;
  notes: string;
  children: OutlineHeadingNode[];
}

interface BlockInput {
  content: string;
  headings?: string[];
  type?: string;
}

interface FlatHeading {
  level: 1 | 2 | 3;
  title: string;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, "")
    .trim();

const cleanText = (s: string) => s.replace(/\s+/g, " ").trim();

/** Detects a paragraph whose entire visible text is inside a single <strong>/<b>. */
const isBoldOnlyParagraph = (p: HTMLElement): boolean => {
  const text = cleanText(p.textContent || "");
  if (!text) return false;
  if (text.length > 200) return false; // long sentence, not a heading
  // Must contain a bold element
  const strong = p.querySelector("strong, b");
  if (!strong) return false;
  const strongText = cleanText(strong.textContent || "");
  // The bold text should account for essentially all the paragraph text
  return normalize(strongText) === normalize(text);
};

const extractFromHtml = (html: string): FlatHeading[] => {
  if (!html || !html.trim()) return [];
  const doc = new DOMParser().parseFromString(
    `<div id="__root">${html}</div>`,
    "text/html"
  );
  const root = doc.getElementById("__root");
  if (!root) return [];

  const out: FlatHeading[] = [];

  const walk = (node: Element) => {
    // Skip headings inside tables or code
    const tag = node.tagName.toLowerCase();
    if (tag === "table" || tag === "pre" || tag === "code") return;

    if (/^h[1-6]$/.test(tag)) {
      const level = Math.min(3, parseInt(tag.slice(1), 10)) as 1 | 2 | 3;
      const title = cleanText(node.textContent || "");
      if (title) out.push({ level, title });
      return;
    }

    if (tag === "p" && isBoldOnlyParagraph(node as HTMLElement)) {
      const title = cleanText(node.textContent || "");
      if (title) out.push({ level: 2, title });
      return;
    }

    for (const child of Array.from(node.children)) walk(child);
  };

  for (const child of Array.from(root.children)) walk(child);
  return out;
};

/** Build a tree from a flat list of {level,title} in document order. */
const buildTree = (flat: FlatHeading[]): OutlineHeadingNode[] => {
  const roots: OutlineHeadingNode[] = [];
  let lastL1: OutlineHeadingNode | null = null;
  let lastL2: OutlineHeadingNode | null = null;

  for (const h of flat) {
    const node: OutlineHeadingNode = {
      id: crypto.randomUUID(),
      title: h.title,
      notes: "",
      children: [],
    };

    if (h.level === 1) {
      // Dedupe within roots by normalized title
      const existing = roots.find((r) => normalize(r.title) === normalize(h.title));
      if (existing) {
        lastL1 = existing;
        lastL2 = null;
        continue;
      }
      roots.push(node);
      lastL1 = node;
      lastL2 = null;
    } else if (h.level === 2) {
      const parent = lastL1;
      const bucket = parent ? parent.children : roots;
      const existing = bucket.find((r) => normalize(r.title) === normalize(h.title));
      if (existing) {
        lastL2 = existing;
        continue;
      }
      bucket.push(node);
      lastL2 = node;
    } else {
      // level 3
      const parent = lastL2 || lastL1;
      const bucket = parent ? parent.children : roots;
      const existing = bucket.find((r) => normalize(r.title) === normalize(h.title));
      if (existing) continue;
      bucket.push(node);
    }
  }

  return roots;
};

/** Merge extracted tree with existing nodes: preserve notes/children on title match. */
const mergeWith = (
  extracted: OutlineHeadingNode[],
  existing: OutlineHeadingNode[]
): { merged: OutlineHeadingNode[]; unmatched: OutlineHeadingNode[] } => {
  const matchedIds = new Set<string>();

  const findMatch = (title: string, pool: OutlineHeadingNode[]): OutlineHeadingNode | null => {
    const t = normalize(title);
    const stack = [...pool];
    while (stack.length) {
      const n = stack.pop()!;
      if (!matchedIds.has(n.id) && normalize(n.title) === t) return n;
      stack.push(...n.children);
    }
    return null;
  };

  const walk = (nodes: OutlineHeadingNode[]): OutlineHeadingNode[] =>
    nodes.map((n) => {
      const match = findMatch(n.title, existing);
      if (match) {
        matchedIds.add(match.id);
        return {
          id: match.id,
          title: n.title,
          notes: match.notes,
          children: walk(n.children),
        };
      }
      return { ...n, children: walk(n.children) };
    });

  const merged = walk(extracted);

  // Collect existing nodes whose id wasn't matched — flatten as top-level "unmatched"
  const unmatched: OutlineHeadingNode[] = [];
  const collectUnmatched = (nodes: OutlineHeadingNode[]) => {
    for (const n of nodes) {
      if (!matchedIds.has(n.id)) {
        // Only surface if it has notes worth preserving OR children; otherwise drop
        if (n.notes.trim() || n.children.length > 0) {
          unmatched.push({ ...n, children: [...n.children] });
        }
      } else {
        collectUnmatched(n.children);
      }
    }
  };
  collectUnmatched(existing);

  return { merged, unmatched };
};

export interface OutlineResult {
  nodes: OutlineHeadingNode[];
  headingCount: number;
  subHeadingCount: number;
  unmatchedCount: number;
}

export const generateOutlineFromBlocks = (
  blocks: BlockInput[],
  existing: OutlineHeadingNode[]
): OutlineResult => {
  const flat: FlatHeading[] = [];
  for (const b of blocks) {
    if (b.type && b.type !== "text") continue;
    flat.push(...extractFromHtml(b.content || ""));
    // Fold in any manually-tagged headings that weren't detected
    if (b.headings && b.headings.length > 0) {
      const detected = new Set(flat.map((f) => normalize(f.title)));
      for (const h of b.headings) {
        const t = cleanText(h);
        if (t && !detected.has(normalize(t))) {
          flat.push({ level: 2, title: t });
        }
      }
    }
  }

  const extracted = buildTree(flat);
  const { merged, unmatched } = mergeWith(extracted, existing);

  const finalNodes = unmatched.length > 0 ? [...merged, ...unmatched] : merged;

  const headingCount = merged.length;
  let subHeadingCount = 0;
  const countSubs = (nodes: OutlineHeadingNode[]) => {
    for (const n of nodes) {
      subHeadingCount += n.children.length;
      countSubs(n.children);
    }
  };
  countSubs(merged);

  return {
    nodes: finalNodes,
    headingCount,
    subHeadingCount,
    unmatchedCount: unmatched.length,
  };
};
