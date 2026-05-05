## Plan: Hierarchical slug-based URLs (Phase 1 — URL shape only)

Per your decision: build the **full hierarchy** first. Per-topic publish toggle will come in Phase 2 (security).

### New URL shape

Public (read-only library):
```
/library                                              → all subjects
/library/:subjectSlug                                 → chapters in subject
/library/:subjectSlug/:chapterSlug                    → topics in chapter
/library/:subjectSlug/:chapterSlug/:topicSlug         → read-only topic page
/library/topic/:topicId                               → kept as permanent redirect (back-compat)
```

Editor (private):
```
/app                                                  → editor home
/app/t/:topicSlug                                     → editor with that topic open (URL syncs as you click topics)
```

### Database changes (migration)

Add `slug text` to `subjects`, `chapters`, `topics`:

- Backfill from existing `name`/`title` using a slugify function (lowercase, strip diacritics, replace non-alphanumerics with `-`, collapse, trim).
- Uniqueness scope:
  - `subjects.slug` unique per `user_id`
  - `chapters.slug` unique per `(user_id, subject_id)`
  - `topics.slug` unique per `(user_id, chapter_id)` (chapter_id may be null → unique per `(user_id, subject_id, coalesce(chapter_id, '00000000-...'))`)
- A trigger auto-generates a slug on INSERT/UPDATE if missing or if name/title changes, appending `-2`, `-3`, … on collision.
- Partial unique indexes enforce the rules above.

`src/integrations/supabase/types.ts` will regenerate automatically.

### Routing changes (`src/App.tsx`)

Replace the single `/library` and `/library/topic/:topicId` routes with:

```tsx
<Route path="/library" element={<PublicLibrary />} />
<Route path="/library/:subjectSlug" element={<PublicLibrary />} />
<Route path="/library/:subjectSlug/:chapterSlug" element={<PublicLibrary />} />
<Route path="/library/:subjectSlug/:chapterSlug/:topicSlug" element={<PublicTopic />} />
<Route path="/library/topic/:topicId" element={<PublicTopicLegacyRedirect />} />
<Route path="/app" element={<Index />} />
<Route path="/app/t/:topicSlug" element={<Index />} />
```

### Page changes

**`src/pages/PublicLibrary.tsx`**
- Read params; show subjects / chapters / topics list at the matching level.
- Links use the new slug paths.

**`src/pages/PublicTopic.tsx`**
- Look up topic by `(subjectSlug, chapterSlug, topicSlug)` instead of `topicId`.
- Pass canonical URL to `SEOHead`.

**`PublicTopicLegacyRedirect`** (tiny new component)
- Resolves `topicId` → slugs → 301 redirect via `<Navigate replace>`.

**`src/pages/Index.tsx` / `TopicEditor.tsx`**
- When a topic becomes active, `navigate('/app/t/' + topicSlug, { replace: true })`.
- On mount, if `:topicSlug` present, resolve and select that topic.
- Add a "Share" button on the editor toolbar that copies the public URL `/library/<subject>/<chapter>/<topic>` (Phase 2 will hide this when topic isn't published).

**`src/components/SEOHead.tsx`**
- Accept optional `canonicalUrl` and emit `<link rel="canonical">`.

### SEO

- `public/robots.txt`: allow `/library/*`, disallow `/app`, `/auth`, `/ai-chat`.
- New edge function `supabase/functions/sitemap` returns dynamic `sitemap.xml` listing every public topic at its hierarchical URL (filtered to the demo `user_id` for now; Phase 2 will switch to `is_public = true`).

### Files to modify

| File | Change |
|---|---|
| migration | add slug columns + backfill + trigger + indexes |
| `src/App.tsx` | new nested routes + legacy redirect |
| `src/pages/PublicLibrary.tsx` | render by URL level, slug links |
| `src/pages/PublicTopic.tsx` | resolve by slugs, canonical URL |
| `src/pages/Index.tsx` / `TopicEditor.tsx` | URL ↔ active topic sync, Share button |
| `src/components/SEOHead.tsx` | canonical URL support |
| `public/robots.txt` | allow library, disallow app/auth |
| `supabase/functions/sitemap/index.ts` | new dynamic sitemap |

### Result after Phase 1

- Each topic has a clean shareable URL like
  `studynotesbuilder.lovable.app/library/research-methodology/descriptive-statistics/pearson-correlation`.
- Opening it in the editor updates the address bar to `/app/t/pearson-correlation`.
- Old `/library/topic/<uuid>` links keep working via redirect.
- Search engines get a sitemap and clean canonical URLs.

After this lands and looks good, Phase 2 will add the per-topic **Publish** toggle so only completed topics appear in `/library` and the sitemap.