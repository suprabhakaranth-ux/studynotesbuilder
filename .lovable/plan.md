## Root cause

The failure is happening in the PDF viewer worker setup, not in upload or storage.

`react-pdf@10.4.1` imports `pdfjs-dist@5.4.296` internally, so the runtime PDF API version is `5.4.296`.

The app also has a direct dependency on `pdfjs-dist@5.7.284`, and `src/lib/pdfWorker.ts` points the worker at that root package:

```ts
new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)
```

That creates this exact mismatch:

```text
API version:    5.4.296  // used by react-pdf
Worker version: 5.7.284  // loaded by our workerSrc
```

## Plan

1. **Pin the app-level `pdfjs-dist` dependency to React PDF’s exact version**
   - Change `package.json` from `pdfjs-dist: ^5.7.284` to `pdfjs-dist: 5.4.296`.
   - Refresh the lockfile so there is no root `5.7.284` worker available for Vite to pick up.

2. **Keep the worker setup pattern, but make it resolve to the aligned version**
   - Leave `src/lib/pdfWorker.ts` using the Vite `new URL(..., import.meta.url)` worker pattern.
   - After dependency alignment, that path will resolve to `pdfjs-dist@5.4.296`, matching `react-pdf`.

3. **Verify the actual installed versions before calling it fixed**
   - Check that root `pdfjs-dist` and `react-pdf`’s internal `pdfjs-dist` both resolve to `5.4.296`.
   - Reload the viewer and confirm the mismatch error disappears.

4. **Only if the package manager still keeps two mismatched copies**
   - Add a Vite alias so `pdfjs-dist` always resolves to the same physical package used by `react-pdf`.
   - This is the fallback, not the first choice, because dependency alignment is cleaner.