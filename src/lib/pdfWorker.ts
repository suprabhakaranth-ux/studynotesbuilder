import { pdfjs } from "react-pdf";
// Vite-friendly worker URL
// eslint-disable-next-line import/no-unresolved
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl as unknown as string;

export { pdfjs };
