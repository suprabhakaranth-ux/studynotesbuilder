import { pdfjs } from "react-pdf";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Resolve the package asset through Vite rather than a source-relative URL.
// Both the lazy floating viewer and public viewer use the installed version.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjs };
