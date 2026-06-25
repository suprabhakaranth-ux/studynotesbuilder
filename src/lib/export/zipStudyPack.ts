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

export async function generateStudyPack(args: {
  topicIds: string[];
  userId: string;
  opts: ExportOptions;
  onProgress?: ProgressCallback;
}): Promise<{ filename: string; blob: Blob; bundles: TopicBundle[] }> {
  const { topicIds, userId, opts, onProgress } = args;
  const exportedAt = new Date();

  onProgress?.({ stage: "fetching", message: "Loading topics from database…" });
  const bundles = await fetchStudyData(topicIds, userId);
  if (bundles.length === 0) throw new Error("No topics found for selection.");

  onProgress?.({ stage: "html", message: "Building HTML archive…" });
  const html = await buildArchiveHtml(bundles, opts, { exportedAt });

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

  const blob = await zip.generateAsync({ type: "blob" });
  const filename = `StudyPack-${stamp}.zip`;
  onProgress?.({ stage: "done", message: "Done!", percent: 100 });

  saveAs(blob, filename);
  return { filename, blob, bundles };
}
