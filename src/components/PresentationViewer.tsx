import { useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import { useInView } from "react-intersection-observer";
import "@/lib/pdfWorker";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

interface PresentationViewerProps {
  fileUrl: string;
  onLoadSuccess?: (pageCount: number) => void;
}

const MAX_PAGE_WIDTH = 1100;

const LazyPage = ({ pageNumber, width, onVisible }: { pageNumber: number; width: number; onVisible: (n: number) => void }) => {
  const { ref, inView } = useInView({ rootMargin: "600px 0px", threshold: 0 });
  const { ref: visibleRef, inView: visible } = useInView({ rootMargin: "-40% 0px -40% 0px", threshold: 0 });

  useEffect(() => {
    if (visible) onVisible(pageNumber);
  }, [visible, pageNumber, onVisible]);

  return (
    <div
      ref={(el) => {
        ref(el);
        visibleRef(el);
      }}
      className="bg-white shadow-md rounded-sm overflow-hidden mx-auto"
      style={{ width, minHeight: width * 0.7 }}
      data-page-number={pageNumber}
    >
      {inView ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          renderAnnotationLayer={false}
          renderTextLayer
          loading={<div style={{ height: width * 0.7 }} />}
        />
      ) : (
        <div style={{ height: width * 0.7 }} />
      )}
    </div>
  );
};

export const PresentationViewer = ({ fileUrl, onLoadSuccess }: PresentationViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(MAX_PAGE_WIDTH);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const cw = containerRef.current.clientWidth;
      setWidth(Math.min(cw - 32, MAX_PAGE_WIDTH));
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        const next = document.querySelector<HTMLElement>(`[data-page-number="${Math.min(numPages, currentPage + 1)}"]`);
        next?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        const prev = document.querySelector<HTMLElement>(`[data-page-number="${Math.max(1, currentPage - 1)}"]`);
        prev?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentPage, numPages]);

  return (
    <div ref={containerRef} className="w-full">
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages: n }) => {
          setNumPages(n);
          onLoadSuccess?.(n);
        }}
        loading={
          <div className="text-center py-16 text-muted-foreground text-sm">Loading deck…</div>
        }
        error={
          <div className="text-center py-16 text-destructive text-sm">Failed to load PDF.</div>
        }
      >
        <div className="flex flex-col gap-6 py-6">
          {Array.from({ length: numPages }, (_, i) => (
            <LazyPage key={i + 1} pageNumber={i + 1} width={width} onVisible={setCurrentPage} />
          ))}
        </div>
      </Document>

      {numPages > 0 && (
        <div className="fixed bottom-4 right-4 bg-foreground/90 text-background text-xs font-medium px-3 py-1.5 rounded-full shadow-lg z-40 backdrop-blur">
          {currentPage} / {numPages}
        </div>
      )}
    </div>
  );
};
