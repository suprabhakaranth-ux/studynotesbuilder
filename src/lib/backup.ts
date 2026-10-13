import { supabase } from "@/integrations/supabase/client";

const TABLES = ["subjects", "chapters", "topics", "blocks", "summaries", "mnemonics", "heading_nodes", "topic_margin_notes", "presentations"] as const;
type TableName = (typeof TABLES)[number];
export const LAST_BACKUP_KEY = "study-notes-last-backup-at";

export type BackupFile = { app: "study-notes"; version: 1; created_at: string; data: Record<TableName, any[]> };

async function fetchAll(table: TableName, userId: string) {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", userId).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

export async function buildBackup(userId: string): Promise<BackupFile> {
  const data = {} as Record<TableName, any[]>;
  for (const t of TABLES) data[t] = await fetchAll(t, userId);
  return { app: "study-notes", version: 1, created_at: new Date().toISOString(), data };
}

/** Adds back only topics (and their parents) that are missing. Never overwrites. */
export async function restoreMissing(file: BackupFile, userId: string) {
  if (file?.app !== "study-notes" || !file.data) throw new Error("This is not a study notes backup file.");
  const d = file.data;
  const { data: existing, error } = await supabase.from("topics").select("id").eq("user_id", userId);
  if (error) throw error;
  const have = new Set((existing || []).map(t => t.id));
  const missing = (d.topics || []).filter(t => !have.has(t.id));
  if (!missing.length) return 0;
  const ids = new Set(missing.map(t => t.id));
  const own = (r: any) => ({ ...r, user_id: userId });
  const add = async (table: TableName, rows: any[], onConflict = "id") => {
    if (!rows.length) return;
    const { error } = await supabase.from(table).upsert(rows.map(own) as any, { onConflict, ignoreDuplicates: true });
    if (error) throw error;
  };
  const needSubjects = new Set(missing.map(t => t.subject_id));
  const needChapters = new Set(missing.map(t => t.chapter_id));
  await add("subjects", (d.subjects || []).filter(s => needSubjects.has(s.id)));
  await add("chapters", (d.chapters || []).filter(c => needChapters.has(c.id)));
  await add("topics", missing);
  await add("blocks", (d.blocks || []).filter(b => ids.has(b.topic_id)));
  const hn = (d.heading_nodes || []).filter(h => ids.has(h.topic_id));
  await add("heading_nodes", [...hn.filter(h => !h.parent_id), ...hn.filter(h => h.parent_id)]);
  await add("summaries", (d.summaries || []).filter(s => ids.has(s.topic_id)), "topic_id");
  await add("mnemonics", (d.mnemonics || []).filter(m => ids.has(m.topic_id)), "topic_id");
  await add("topic_margin_notes", (d.topic_margin_notes || []).filter(m => ids.has(m.topic_id)));
  return missing.length;
}
