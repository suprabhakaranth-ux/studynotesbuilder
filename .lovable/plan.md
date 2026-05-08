
# Presentations (PDF Decks) per Subject

Add a new "Presentations" feature so each Subject can hold multiple PDF decks. Admins can upload, rename, reorder, and delete. Anyone can view at a public URL using a clean, full-width vertical scrolling PDF viewer.

## 1. Backend (Lovable Cloud)

### New table: `presentations`
- `id` uuid PK
- `user_id` uuid (owner)
- `subject_id` uuid
- `title` text
- `slug` text (unique per subject, auto-generated via trigger like topics)
- `file_path` text (storage object path)
- `file_size` bigint
- `page_count` int (nullable; filled after first render)
- `presentation_order` int default 0
- `created_at`, `updated_at`

RLS:
- Owner full CRUD via `auth.uid() = user_id`
- Anon SELECT scoped to seed UID `b6dc6569-25ba-4ea0-a7bf-607219aa8daf` (matches existing public demo pattern)

Auto-slug trigger mirroring `set_topic_slug`.

Soft-delete: extend `deleted_items` with `presentations_data jsonb` so deletes go to Recycle Bin (matches existing pattern).

### Storage bucket: `presentations` (public)
- Public read
- Authenticated insert/update/delete scoped to `auth.uid()::text = (storage.foldername(name))[1]` (path: `{user_id}/{presentation_id}.pdf`)

## 2. PDF Viewer Library

Use **react-pdf** (`react-pdf` + `pdfjs-dist`). It is the standard choice for in-browser PDF rendering: uses pdf.js under the hood, supports virtualization-friendly per-page rendering, text layer, and works well for vertical continuous scroll.

Worker loaded via Vite-friendly URL import:
```ts
import { pdfjs } from 'react-pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
```

For smooth large-deck scroll: render pages on-demand using `react-intersection-observer` (only mount `<Page>` when near viewport).

## 3. Routes

Add to `src/App.tsx`:
- `/library/:subjectSlug/presentations/:presentationSlug` → `PublicPresentation` (read-only viewer)
- `/app` Subject view gains a "Presentations" tab (admin manage)

No sidebar changes — sidebar stays exactly as-is. Presentations live as a new tab on the subject detail view next to existing Chapters/Topics tabs.

## 4. Components & Files

New:
- `src/pages/PublicPresentation.tsx` — public viewer page
- `src/components/PresentationViewer.tsx` — react-pdf continuous scroll component (used by public + admin preview)
- `src/components/PresentationsTab.tsx` — admin management UI (upload, list, rename, reorder, delete) shown inside subject view
- `src/components/PresentationUploadDialog.tsx` — drag-drop + file picker, progress
- `src/hooks/usePresentations.ts` — CRUD hooks against Supabase

Modified:
- `src/App.tsx` — add public route
- `src/pages/Index.tsx` — add Presentations tab on subject view
- `src/pages/PublicLibrary.tsx` — show Presentations list on subject page
- `src/components/SubjectCard.tsx` (optional) — small badge "N decks"
- `supabase/functions/sitemap/index.ts` — include presentation slugs

## 5. Public Viewer Layout

`PublicPresentation` uses an alternate layout (no sidebar, no editor chrome):

```
┌────────────────────────────────────────────────┐
│  [back to subject]   Title           [download]│  sticky header (slim)
├────────────────────────────────────────────────┤
│                                                │
│        ┌──────────────────────────┐            │
│        │   Page 1 (landscape)     │            │  centered, max-w ~1100px
│        └──────────────────────────┘            │  bg-muted around pages
│        ┌──────────────────────────┐            │  white page surface w/ shadow
│        │   Page 2                 │            │  ~24px gap between pages
│        └──────────────────────────┘            │
│                                                │
└────────────────────────────────────────────────┘
   Floating page indicator (e.g. "3 / 24")  ↑↓ keys
```

Behaviour:
- Pages render at container width, capped at ~1100px so they never stretch
- `width` prop on `<Page>` = `min(containerWidth, 1100)` — no aspect distortion
- Background `bg-background`, page surface white with subtle shadow
- Keyboard arrows scroll page-by-page; mouse wheel = native smooth scroll
- Floating bottom-right pill: current page / total + download button
- Mobile: full width with 16px side padding
- SEO: `SEOHead` with title, description ("PDF deck — Subject • N pages"), JSON-LD as `PresentationDigitalDocument`

Read-only — no upload/edit controls on public page.

## 6. Admin Tab (`PresentationsTab`)

Inside `/app` subject view:
- "Upload PDF" button → dialog: drag-drop, validates `application/pdf`, max ~50 MB
- List shows: drag handle, thumbnail (first-page render), title (inline edit), page count, file size, "View public" link, delete
- Reorder via `@dnd-kit/sortable` (already used elsewhere if present, else add) updating `presentation_order`
- Delete → Recycle Bin (insert into `deleted_items`, then delete row + storage object on permanent delete)

## 7. Upload flow

```ts
// 1. Insert row → get id + slug
// 2. Upload file to `presentations/{user_id}/{id}.pdf`
// 3. Update row with file_path
// 4. Optionally render first page client-side to count pages, save page_count
```

## 8. Memory updates

After implementation, save:
- `mem://features/presentations` — describes table, bucket, viewer library, public URL pattern, and that admin tab is the only management surface (sidebar untouched)
- Update `mem://index.md` Core to note `/library/:subject/presentations/:slug` route

## Out of scope

- Slide-by-slide horizontal mode (user chose vertical scroll)
- AI summaries of decks
- Annotations / highlights
- Search inside PDFs (text layer is enabled though, so Ctrl+F works)

## Technical notes (for engineers)

- `pdfjs-dist` worker must be served as static asset; using `?url` import keeps it bundler-friendly with Vite
- Lazy `<Page>` mount via IntersectionObserver prevents memory bloat on 100+ page decks
- Set `renderTextLayer={true}`, `renderAnnotationLayer={false}` for clean look + selectable text
- Public bucket means file URL is directly fetchable; pass `file={publicUrl}` to `<Document>`
- Add `presentations_data jsonb` column to `deleted_items` in same migration
