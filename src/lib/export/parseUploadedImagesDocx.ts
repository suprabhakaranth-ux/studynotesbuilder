import { ImageRun, Paragraph } from "docx";
import type { Table } from "docx";
import { parseHtmlToParagraphs } from "@/utils/wordExport";

/** Only handle uploaded block images; keep the proven text parser unchanged. */
export async function parseUploadedImagesDocx(html: string): Promise<Array<Paragraph | Table>> {
  if (!html.includes("/note-images/")) return parseHtmlToParagraphs(html);
  const root = new DOMParser().parseFromString(html, "text/html").body;
  const result: Array<Paragraph | Table> = [];
  let pending = "";
  for (const node of Array.from(root.childNodes)) {
    const image = node instanceof HTMLImageElement ? node : null;
    if (!image || !image.src.includes("/note-images/")) {
      pending += node instanceof Element ? node.outerHTML : node.textContent || "";
      continue;
    }
    if (pending) { result.push(...parseHtmlToParagraphs(pending)); pending = ""; }
    const response = await fetch(image.src);
    if (!response.ok) throw new Error("Could not download a note image for Word export. Please retry.");
    const blob = await response.blob();
    const local = URL.createObjectURL(blob);
    try {
      const decoded = new Image(); decoded.src = local; await decoded.decode();
      const ratio = Math.min(1, 600 / decoded.naturalWidth);
      const width = Math.round(decoded.naturalWidth * ratio), height = Math.round(decoded.naturalHeight * ratio);
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare the image for Word export.");
      context.drawImage(decoded, 0, 0, width, height);
      const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Could not encode image.")), "image/png"));
      result.push(new Paragraph({ children: [new ImageRun({ type: "png", data: new Uint8Array(await png.arrayBuffer()), transformation: { width, height } })] }));
    } finally { URL.revokeObjectURL(local); }
  }
  if (pending) result.push(...parseHtmlToParagraphs(pending));
  return result;
}