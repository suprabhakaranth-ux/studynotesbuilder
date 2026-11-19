import JSZip from "jszip";
import type { ExportChapter, ExportOptions, ExportTopic, ProgressCallback, TopicBundle } from "./types";
import { fetchStudyData } from "./fetchStudyData";
import { buildArchiveHtml } from "./buildArchiveHtml";
import { buildArchivePdf } from "./buildArchivePdf";
import { buildArchiveDocx } from "./buildArchiveDocx";

export type SeparateFormat = "pdf" | "docx" | "html" | "zip";

export interface FileGroup {
  name: string;
  topicIds: string[];
}

/** One group per fully-selected chapter; otherwise one group per selected topic. */
export function planFileGroups(
  selected: Set<string>,
  topics: ExportTopic[],
  chapters: ExportChapter[],
): FileGroup[] {
  const groups: FileGroup[] = [];
  const byChapter = new Map<string, ExportTopic[]>();
  for (const t of topics) {
    const key = t.chapter_id ?? `__none_${t.id}`;
    if (!byChapter.has(key)) byChapter.set(key, []);
    byChapter.get(key)!.push(t);
  }
  for (const [key, list] of byChapter) {
    const sel = list.filter((t) => selected.has(t.id));
    if (sel.length === 0) continue;
    const ch = chapters.find((c) => c.id === key);
    if (ch && sel.length === list.length) {
      groups.push({ name: ch.name, topicIds: sel.map((t) => t.id) });
    } else {
      for (const t of sel) groups.push({ name: t.title, topicIds: [t.id] });
    }
  }
  return groups;
}

export function safeFileName(name: string): string {
  const s = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim().replace(/^\.+/, "");
  return (s || "Untitled").slice(0, 150);
}

export interface SeparateResult {
  blob: Blob;
  filename: string;
  count: number;
}

export async function buildSeparateFiles(args: {
  groups: FileGroup[];
  userId: string;
  opts: ExportOptions;
  format: SeparateFormat;
  onProgress?: ProgressCallback;
}): Promise<SeparateResult> {
  const { groups, userId, opts, format, onProgress } = args;
  const exportedAt = new Date();
  onProgress?.({ stage: "fetching", message: "Loading topics from database…" });
  const all = await fetchStudyData(groups.flatMap((g) => g.topicIds), userId);
  const byId = new Map<string, TopicBundle>(all.map((b) => [b.topic.id, b]));

  const used = new Set<string>();
  const unique = (base: string) => {
    let n = base, i = 2;
    while (used.has(n.toLowerCase())) n = `${base} (${i++})`;
    used.add(n.toLowerCase());
    return n;
  };

  const files: { name: string; blob: Blob }[] = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const ids = new Set(g.topicIds);
    const bundles = all.filter((b) => ids.has(b.topic.id));
    if (bundles.length === 0 && !g.topicIds.some((id) => byId.has(id))) continue;
    const base = unique(safeFileName(g.name));
    onProgress?.({ stage: "rendering", message: `File ${i + 1} of ${groups.length}: ${g.name}` });
    const wantPdf = format === "pdf" || format === "zip";
    const wantDocx = format === "docx" || format === "zip";
    const wantHtml = format === "html" || format === "zip";
    if (wantPdf) files.push({ name: `${base}.pdf`, blob: await buildArchivePdf({ bundles, opts, meta: { exportedAt } }) });
    if (wantDocx) files.push({ name: `${base}.docx`, blob: await buildArchiveDocx(bundles, opts, { exportedAt }) });
    if (wantHtml) {
      const html = await buildArchiveHtml(bundles, opts, { exportedAt });
      files.push({ name: `${base}.html`, blob: new Blob([html], { type: "text/html;charset=utf-8" }) });
    }
  }
  if (files.length === 0) throw new Error("No topics found for selection.");

  if (files.length === 1) {
    onProgress?.({ stage: "done", message: "File ready.", percent: 100 });
    return { blob: files[0].blob, filename: files[0].name, count: 1 };
  }
  onProgress?.({ stage: "zipping", message: `Packaging ${files.length} files…` });
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.blob);
  const blob = await zip.generateAsync({ type: "blob" });
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = exportedAt;
  onProgress?.({ stage: "done", message: "Files ready.", percent: 100 });
  return {
    blob,
    filename: `Separate files ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.zip`,
    count: files.length,
  };
}
