import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { TopicBundle, ExportOptions, ProgressCallback } from "./types";
import { fetchStudyData } from "./fetchStudyData";
import { buildArchiveHtml } from "./buildArchiveHtml";
import { buildArchivePdf } from "./buildArchivePdf";
import { buildArchiveDocx } from "./buildArchiveDocx";

function ts(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export interface StudyPackArtifacts {
  stamp: string;
  exportedAt: Date;
  bundles: TopicBundle[];
  html: string;
  htmlBlob: Blob;
  pdfBlob: Blob;
  docxBlob: Blob;
  zipBlob: Blob;
  zipFilename: string;
}

/** Build all Study Pack artifacts in memory. Does NOT trigger a download. */
export async function buildStudyPack(args: {
  topicIds: string[];
  userId: string;
  opts: ExportOptions;
  onProgress?: ProgressCallback;
}): Promise<StudyPackArtifacts> {
  const { topicIds, userId, opts, onProgress } = args;
  const exportedAt = new Date();

  onProgress?.({ stage: "fetching", message: "Loading topics from database…" });
  const bundles = await fetchStudyData(topicIds, userId);
  if (bundles.length === 0) throw new Error("No topics found for selection.");

  onProgress?.({ stage: "html", message: "Building HTML archive…" });
  const html = await buildArchiveHtml(bundles, opts, { exportedAt });
  const htmlBlob = new Blob([html], { type: "text/html;charset=utf-8" });

  onProgress?.({ stage: "pdf", message: "Building PDF…" });
  const pdfBlob = await buildArchivePdf({ bundles, opts, meta: { exportedAt }, onProgress });

  onProgress?.({ stage: "docx", message: "Building Word document…" });
  const docxBlob = await buildArchiveDocx(bundles, opts, { exportedAt }, onProgress);

  onProgress?.({ stage: "zipping", message: "Packaging ZIP…" });
  const zip = new JSZip();
  const stamp = ts(exportedAt);
  zip.file(`StudyPack.html`, html);
  zip.file(`StudyPack.pdf`, pdfBlob);
  zip.file(`StudyPack.docx`, docxBlob);

  const manifest = {
    generator: "Study Notes — Study Pack Export",
    exported_at: exportedAt.toISOString(),
    options: opts,
    topic_count: bundles.length,
    topics: bundles.map((b) => ({
      id: b.topic.id,
      title: b.topic.title,
      subject: b.subject.name,
      chapter: b.chapter?.name || null,
    })),
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const readme =
    `Study Pack — Offline Backup
Exported: ${exportedAt.toLocaleString()}
Topics: ${bundles.length}

Files
-----
- StudyPack.html  Standalone web archive. Open in any browser; works fully offline.
                  Use your browser's Print to PDF for a fresh PDF anytime.
- StudyPack.pdf   Paginated PDF with table of contents and page numbers.
- StudyPack.docx  Microsoft Word document. On first open, Word may ask
                  "Update fields?" — choose Yes so the Table of Contents
                  shows correct page numbers.
- manifest.json   Machine-readable list of what was exported.

This archive is self-contained and does not require Lovable, Supabase,
the original application, or an internet connection to read.
`;
  zip.file("README.txt", readme);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipFilename = `StudyPack-${stamp}.zip`;
  onProgress?.({ stage: "done", message: "Study Pack ready.", percent: 100 });

  return { stamp, exportedAt, bundles, html, htmlBlob, pdfBlob, docxBlob, zipBlob, zipFilename };
}

/** Backward-compatible: build + auto-download the ZIP. */
export async function generateStudyPack(args: {
  topicIds: string[];
  userId: string;
  opts: ExportOptions;
  onProgress?: ProgressCallback;
}): Promise<{ filename: string; blob: Blob; bundles: TopicBundle[] }> {
  const a = await buildStudyPack(args);
  saveAs(a.zipBlob, a.zipFilename);
  return { filename: a.zipFilename, blob: a.zipBlob, bundles: a.bundles };
}
