## Problem

`ERR_BLOCKED_BY_CLIENT` on "View online" is Chrome reporting that an extension (ad blocker / privacy extension) or popup blocker killed the new tab opened via `window.open(blobUrl, "_blank")`. Blob URLs opened as popups are a common false-positive for uBlock/Adblock/Brave shields, and there's nothing we can change server-side to whitelist it.

## Fix

Stop relying on `window.open` for "View online". Instead, render the generated pack inside the app in a full-screen dialog with an `<iframe>` pointing at the blob URL. This keeps the view fully in-app (no new tab, no popup, no extension interference) and preserves the continuous-scroll reading experience the user wanted.

Keep a small fallback: a "Open in new tab" link inside that dialog for users who do want a separate tab — implemented as a plain `<a href={blobUrl} target="_blank" rel="noopener">` triggered by their click (anchor clicks are far less likely to be blocked than programmatic `window.open`).

No changes to generation, formats, or the rest of the Export Center UI.

## Changes

**`src/pages/ExportCenter.tsx`**
- Add state: `viewerOpen: boolean`, `viewerUrl: string | null`, `viewerTitle: string`.
- Replace current `onView` implementation:
  - If format isn't viewable (docx/zip) → same toast as today.
  - Otherwise: create `URL.createObjectURL(blob)`, store it in `viewerUrl`, set `viewerOpen=true`. Do **not** call `window.open`.
- On dialog close: `URL.revokeObjectURL(viewerUrl)` and clear state.
- Also revoke on unmount and when a new pack is generated (invalidate old URL).
- Render a new `<Dialog>` at the bottom of the page:
  - `DialogContent` sized to near-fullscreen (`max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col`).
  - Header row: title (`StudyPack — PDF` / `StudyPack — HTML`), an `<a href={viewerUrl} target="_blank" rel="noopener noreferrer">Open in new tab</a>` (anchor, not `window.open`), and a Close button.
  - Body: `<iframe src={viewerUrl} className="flex-1 w-full h-full border-0" title="Study Pack preview" />`.
- The iframe renders PDFs via Chrome's built-in viewer and HTML natively — both keep the continuous-scroll behaviour.

No other files change. No changes to build logic, exports, or backend.

## Why this dodges `ERR_BLOCKED_BY_CLIENT`

- No `window.open` call → no popup heuristic tripped.
- Blob URL loaded as a same-origin iframe, not a top-level cross-context navigation → ad blockers don't treat it as a tracker/ad frame.
- The optional "Open in new tab" anchor is a direct user-gesture navigation; if an aggressive extension still blocks it, the in-app iframe still works.
