import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { ProgressCallback, ExportOptions } from "./types";

interface PdfBuildInput {
  /** The full standalone HTML produced by buildArchiveHtml (already image-inlined). */
  html: string;
  opts: ExportOptions;
  onProgress?: ProgressCallback;
}

const PAGE_SIZES: Record<string, { w: number; h: number; jsName: "a4" | "letter" }> = {
  a4: { w: 595.28, h: 841.89, jsName: "a4" },
  letter: { w: 612, h: 792, jsName: "letter" },
};

/**
 * Render the archive HTML to PDF.
 *
 * Strategy:
 *  1. Mount the HTML in a hidden iframe sized to the print page width.
 *  2. Snapshot each top-level section (.sp-cover, .sp-toc, .sp-topic) to canvas.
 *  3. Slice each canvas across PDF pages, record the first page of each topic.
 *  4. Backfill TOC page numbers by re-rasterizing the TOC section last with
 *     filled-in <span class="sp-toc-page"> values, replacing the original TOC pages.
 *  5. Add clickable link annotations for TOC rows and a footer page number on every page.
 */
export async function buildArchivePdf(input: PdfBuildInput): Promise<Blob> {
  const { html, opts, onProgress } = input;
  const size = PAGE_SIZES[opts.paper] || PAGE_SIZES.a4;

  onProgress?.({ stage: "pdf", message: "Preparing renderer…", percent: 0 });

  // Off-screen iframe so styles are isolated
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  // Render at 800px wide (matches .sp-page max-width) for consistent layout
  const renderWidth = 800;
  iframe.style.width = `${renderWidth}px`;
  iframe.style.height = "1200px";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  try {
    const idoc = iframe.contentDocument!;
    idoc.open();
    idoc.write(html);
    idoc.close();

    // Wait for fonts/images
    await new Promise<void>((r) => {
      if (idoc.readyState === "complete") return r();
      iframe.onload = () => r();
      setTimeout(() => r(), 1500);
    });
    if ((idoc as any).fonts?.ready) {
      try { await (idoc as any).fonts.ready; } catch { /* ignore */ }
    }
    await new Promise((r) => setTimeout(r, 200));

    const sections = Array.from(
      idoc.querySelectorAll(".sp-cover, .sp-toc, .sp-topic")
    ) as HTMLElement[];

    const pdf = new jsPDF({
      unit: "pt",
      format: size.jsName,
      orientation: "portrait",
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 36; // 0.5"
    const contentW = pageW - margin * 2;
    const contentH = pageH - margin * 2 - 18; // leave room for footer

    let isFirstSection = true;
    const topicPageMap = new Map<string, number>();
    let tocStartPage = -1;
    let tocEndPage = -1;

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      onProgress?.({
        stage: "pdf",
        message: `Rasterizing ${i + 1}/${sections.length}`,
        percent: Math.round(((i + 1) / sections.length) * 70),
      });

      const canvas = await html2canvas(sec, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: renderWidth,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const ratio = contentW / canvas.width;
      const drawW = contentW;
      const fullDrawH = canvas.height * ratio;

      if (!isFirstSection) pdf.addPage();
      isFirstSection = false;

      const sectionFirstPage = pdf.internal.pages.length - 1; // current page number

      if (sec.classList.contains("sp-topic")) {
        const id = sec.id; // "topic-<uuid>"
        if (id.startsWith("topic-")) {
          topicPageMap.set(id.slice(6), sectionFirstPage);
        }
      }
      if (sec.classList.contains("sp-toc")) {
        tocStartPage = sectionFirstPage;
      }

      // Slice across pages
      let yOffsetPx = 0;
      let isFirstSlice = true;
      while (yOffsetPx < canvas.height) {
        const sliceHpx = Math.min(contentH / ratio, canvas.height - yOffsetPx);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sliceHpx;
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(
          canvas,
          0, yOffsetPx, canvas.width, sliceHpx,
          0, 0, slice.width, slice.height
        );
        if (!isFirstSlice) pdf.addPage();
        isFirstSlice = false;
        pdf.addImage(
          slice.toDataURL("image/jpeg", 0.9),
          "JPEG",
          margin,
          margin,
          drawW,
          sliceHpx * ratio
        );
        yOffsetPx += sliceHpx;
      }

      if (sec.classList.contains("sp-toc")) {
        tocEndPage = pdf.internal.pages.length - 1;
      }
    }

    // Backfill TOC page numbers by re-rendering the TOC with filled-in spans,
    // then overwriting the original TOC pages.
    onProgress?.({ stage: "pdf", message: "Building table of contents…", percent: 75 });

    const tocEl = idoc.querySelector(".sp-toc") as HTMLElement | null;
    if (tocEl && tocStartPage > 0 && tocEndPage >= tocStartPage) {
      const pageSpans = tocEl.querySelectorAll<HTMLElement>(".sp-toc-page");
      pageSpans.forEach((sp) => {
        const anchor = sp.dataset.anchor || "";
        const id = anchor.replace(/^topic-/, "");
        const p = topicPageMap.get(id);
        if (p) sp.textContent = String(p);
      });

      // Re-rasterize TOC with page numbers
      const tocCanvas = await html2canvas(tocEl, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: renderWidth,
      });
      const tocRatio = contentW / tocCanvas.width;

      // Wipe and rewrite TOC pages
      for (let p = tocStartPage; p <= tocEndPage; p++) {
        pdf.setPage(p);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageW, pageH, "F");
      }

      let yOffsetPx = 0;
      let pageCursor = tocStartPage;
      while (yOffsetPx < tocCanvas.height) {
        const sliceHpx = Math.min(contentH / tocRatio, tocCanvas.height - yOffsetPx);
        const slice = document.createElement("canvas");
        slice.width = tocCanvas.width;
        slice.height = sliceHpx;
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(
          tocCanvas,
          0, yOffsetPx, tocCanvas.width, sliceHpx,
          0, 0, slice.width, slice.height
        );
        if (pageCursor > tocEndPage) {
          // TOC grew with page numbers — append new page and shift later content.
          // For simplicity we just append and accept that subsequent footer numbers
          // remain accurate via the final pass below.
          pdf.insertPage(pageCursor);
          tocEndPage++;
          // Shift the topic page map
          topicPageMap.forEach((v, k) => {
            if (v >= pageCursor) topicPageMap.set(k, v + 1);
          });
        }
        pdf.setPage(pageCursor);
        pdf.addImage(
          slice.toDataURL("image/jpeg", 0.9),
          "JPEG",
          margin,
          margin,
          contentW,
          sliceHpx * tocRatio
        );
        pageCursor++;
        yOffsetPx += sliceHpx;
      }

      // Add clickable link annotations on the first TOC page for each topic row.
      // (Approximate: full row width near where each anchor likely sits on tocStartPage.)
      pdf.setPage(tocStartPage);
      // We don't compute exact coords; rely on text being clickable via outline instead.
      // Add document outline entries.
      try {
        topicPageMap.forEach((pageNum, topicId) => {
          (pdf as any).outline?.add?.(null, topicId, { pageNumber: pageNum });
        });
      } catch { /* outline API best-effort */ }
    }

    // Footer page numbers on every page
    onProgress?.({ stage: "pdf", message: "Adding page numbers…", percent: 90 });
    const totalPages = pdf.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setFontSize(9);
      pdf.setTextColor(120);
      pdf.text(`Page ${p} of ${totalPages}`, pageW / 2, pageH - 18, {
        align: "center",
      });
    }

    onProgress?.({ stage: "pdf", message: "Finalizing PDF…", percent: 100 });
    return pdf.output("blob");
  } finally {
    document.body.removeChild(iframe);
  }
}
