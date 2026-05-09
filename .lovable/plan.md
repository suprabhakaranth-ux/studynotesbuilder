
# Fix: "Failed to load PDF" in presentation viewer

## What's happening

Upload works (file is in storage, row updated), but the public viewer at `/library/:subject/presentations/:slug` shows "Failed to load PDF." The most likely cause is the **pdf.js worker** failing to load — react-pdf 10 + pdfjs-dist 5 require a module worker URL set up in a Vite-friendly way, and the current `?url` import + `workerSrc` assignment is fragile (typical failure mode: blank/error with no obvious console clue, or "API version does not match Worker version").

A secondary suspect is a **CORS / Range-request** issue when `<Document file={publicUrl} />` fetches the PDF directly from Supabase Storage — pdf.js issues `Range` requests and some setups break on it.

## Plan

### 1. Make the worker setup robust (`src/lib/pdfWorker.ts`)
Replace the `?url` import with the official Vite pattern that pins the worker to the exact installed pdfjs version:

```ts
import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
```

This avoids the `?url` plugin path issues and guarantees version match.

### 2. Harden the `<Document>` load (`src/components/PresentationViewer.tsx`)
- Pass `file` as `{ url: fileUrl, withCredentials: false }` so pdf.js does not send auth headers (Supabase public bucket rejects `Authorization` for anon).
- Add `onLoadError` handler that captures the real error message and shows it in the UI (instead of the generic "Failed to load PDF.") — this turns a silent failure into actionable info if anything still goes wrong.
- Disable Range requests as a safety net: `options={{ disableRange: true, disableStream: true }}` (downloads the file once, then renders — fine for ≤100 MB decks).

### 3. Verify the public URL shape
`getPresentationPublicUrl` already calls `supabase.storage.from('presentations').getPublicUrl(path)`. Bucket is confirmed public. Add a quick sanity check: if the URL doesn't contain `/object/public/`, fall back to constructing it manually from `VITE_SUPABASE_URL`.

### 4. Quick QA
After the fix, reload the failed deck (`Frued's Psychoanalytic Theory`) and confirm:
- Pages render
- Page counter shows N / N
- Keyboard arrows scroll page-by-page

## Out of scope
- Re-architecting upload flow (it's working)
- Switching PDF viewer libraries
- Generating thumbnails / page count on upload (separate task)

## Files changed
- `src/lib/pdfWorker.ts` — robust worker URL
- `src/components/PresentationViewer.tsx` — better error surface, disable range/stream, explicit file object
