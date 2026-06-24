import { supabase } from "@/integrations/supabase/client";
import type {
  ExportSubject,
  ExportChapter,
  ExportTopic,
  ExportBlock,
  ExportHeadingNode,
  TopicBundle,
} from "./types";

/** Build a heading tree the same way TopicEditor.loadData does. */
function buildHeadingTree(
  rows: Array<{
    id: string;
    title: string;
    notes: string | null;
    parent_id: string | null;
    node_order: number;
  }>
): ExportHeadingNode[] {
  const map = new Map<string, ExportHeadingNode>();
  rows.forEach((r) =>
    map.set(r.id, { id: r.id, title: r.title, notes: r.notes || "", children: [] })
  );
  const roots: ExportHeadingNode[] = [];
  rows.forEach((r) => {
    const node = map.get(r.id)!;
    if (r.parent_id) {
      const parent = map.get(r.parent_id);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

/** Fetch all data for the selected topic ids, preserving order. */
export async function fetchStudyData(
  topicIds: string[],
  userId: string
): Promise<TopicBundle[]> {
  if (topicIds.length === 0) return [];

  // 1. Fetch topics
  const { data: topicsData, error: topicsErr } = await supabase
    .from("topics")
    .select("id, subject_id, chapter_id, title, created_at")
    .in("id", topicIds)
    .eq("user_id", userId);
  if (topicsErr) throw topicsErr;
  if (!topicsData || topicsData.length === 0) return [];

  // 2. Fetch related subjects + chapters
  const subjectIds = Array.from(
    new Set(topicsData.map((t) => t.subject_id).filter(Boolean) as string[])
  );
  const chapterIds = Array.from(
    new Set(topicsData.map((t) => t.chapter_id).filter(Boolean) as string[])
  );

  const [subjectsRes, chaptersRes] = await Promise.all([
    subjectIds.length
      ? supabase
          .from("subjects")
          .select("id, name, color")
          .in("id", subjectIds)
          .eq("user_id", userId)
      : Promise.resolve({ data: [] as ExportSubject[], error: null } as any),
    chapterIds.length
      ? supabase
          .from("chapters")
          .select("id, subject_id, name, chapter_order")
          .in("id", chapterIds)
          .eq("user_id", userId)
      : Promise.resolve({ data: [] as ExportChapter[], error: null } as any),
  ]);
  if ((subjectsRes as any).error) throw (subjectsRes as any).error;
  if ((chaptersRes as any).error) throw (chaptersRes as any).error;

  const subjectsMap = new Map<string, ExportSubject>(
    ((subjectsRes as any).data || []).map((s: ExportSubject) => [s.id, s])
  );
  const chaptersMap = new Map<string, ExportChapter>(
    ((chaptersRes as any).data || []).map((c: ExportChapter) => [c.id, c])
  );

  // 3. Fetch blocks, summaries, mnemonics, heading_nodes in parallel
  const ids = topicsData.map((t) => t.id);
  const [blocksRes, summariesRes, mnemonicsRes, headingsRes] = await Promise.all([
    supabase
      .from("blocks")
      .select("id, topic_id, type, content, block_order, headings")
      .in("topic_id", ids)
      .eq("user_id", userId)
      .order("block_order", { ascending: true }),
    supabase
      .from("summaries")
      .select("topic_id, content")
      .in("topic_id", ids)
      .eq("user_id", userId),
    supabase
      .from("mnemonics")
      .select("topic_id, content")
      .in("topic_id", ids)
      .eq("user_id", userId),
    supabase
      .from("heading_nodes")
      .select("id, topic_id, title, notes, parent_id, node_order")
      .in("topic_id", ids)
      .eq("user_id", userId)
      .order("node_order", { ascending: true }),
  ]);
  if (blocksRes.error) throw blocksRes.error;
  if (summariesRes.error) throw summariesRes.error;
  if (mnemonicsRes.error) throw mnemonicsRes.error;
  if (headingsRes.error) throw headingsRes.error;

  // Group by topic
  const blocksByTopic = new Map<string, ExportBlock[]>();
  (blocksRes.data || []).forEach((b: any) => {
    const arr = blocksByTopic.get(b.topic_id) || [];
    arr.push({
      id: b.id,
      type: b.type,
      content: b.content || "",
      block_order: b.block_order,
      headings: Array.isArray(b.headings) ? (b.headings as string[]) : [],
    });
    blocksByTopic.set(b.topic_id, arr);
  });

  const summaryByTopic = new Map<string, string>();
  (summariesRes.data || []).forEach((s: any) =>
    summaryByTopic.set(s.topic_id, s.content || "")
  );

  const mnemonicByTopic = new Map<string, string>();
  (mnemonicsRes.data || []).forEach((m: any) =>
    mnemonicByTopic.set(m.topic_id, m.content || "")
  );

  const headingsByTopic = new Map<string, typeof headingsRes.data>();
  (headingsRes.data || []).forEach((h: any) => {
    const arr = headingsByTopic.get(h.topic_id) || ([] as any);
    arr.push(h);
    headingsByTopic.set(h.topic_id, arr);
  });

  // 4. Sort topics by creation order (oldest first), grouped by subject/chapter for sane TOC order.
  const ordered = [...topicsData].sort((a, b) => {
    const sa = subjectsMap.get(a.subject_id || "")?.name || "";
    const sb = subjectsMap.get(b.subject_id || "")?.name || "";
    if (sa !== sb) return sa.localeCompare(sb);
    const ca = chaptersMap.get(a.chapter_id || "")?.chapter_order ?? -1;
    const cb = chaptersMap.get(b.chapter_id || "")?.chapter_order ?? -1;
    if (ca !== cb) return ca - cb;
    const da = a.created_at ? Date.parse(a.created_at) : 0;
    const db = b.created_at ? Date.parse(b.created_at) : 0;
    return da - db;
  });

  const bundles: TopicBundle[] = ordered.map((t) => ({
    topic: {
      id: t.id,
      subject_id: t.subject_id,
      chapter_id: t.chapter_id,
      title: t.title,
      created_at: t.created_at,
    },
    subject: subjectsMap.get(t.subject_id || "") || {
      id: "",
      name: "Unsorted",
      color: "#888",
    },
    chapter: t.chapter_id ? chaptersMap.get(t.chapter_id) || null : null,
    blocks: blocksByTopic.get(t.id) || [],
    summary: summaryByTopic.get(t.id) || "",
    mnemonic: mnemonicByTopic.get(t.id) || "",
    headingTree: buildHeadingTree((headingsByTopic.get(t.id) as any) || []),
  }));

  return bundles;
}

/** Fetch the full hierarchy for the Export Center tree. */
export async function fetchHierarchy(userId: string) {
  const [subjects, chapters, topics] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, color")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
    supabase
      .from("chapters")
      .select("id, subject_id, name, chapter_order")
      .eq("user_id", userId)
      .order("chapter_order", { ascending: true }),
    supabase
      .from("topics")
      .select("id, subject_id, chapter_id, title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);
  if (subjects.error) throw subjects.error;
  if (chapters.error) throw chapters.error;
  if (topics.error) throw topics.error;
  return {
    subjects: (subjects.data || []) as ExportSubject[],
    chapters: (chapters.data || []) as ExportChapter[],
    topics: (topics.data || []) as ExportTopic[],
  };
}
