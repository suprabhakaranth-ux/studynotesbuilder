import { pdfjs } from "react-pdf";

// Pin worker to the exact installed pdfjs-dist version using Vite's
// new URL(..., import.meta.url) pattern. This avoids `?url` plugin quirks
// and guarantees the API and Worker versions match.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export { pdfjs };
