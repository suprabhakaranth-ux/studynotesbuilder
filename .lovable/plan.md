## Security Findings — Resolution Plan

Three findings were reported. Here's how each will be handled, given the decision to keep `/library` as a fully public demo.

### 1. XSS via `dangerouslySetInnerHTML` (error) — mark as FIXED

The scanner flagged `PublicTopicViewer.tsx` lines 156/190/207/250. Since then, all four call sites were already migrated to render via the `ArticleProse` component, which runs `sanitizePublicHtml` (DOMPurify-based) before injecting HTML. KaTeX nodes are explicitly preserved.

**Action:** Verify the sanitizer's allowlist is tight (no `<script>`, `<iframe>`, `<form>`, `on*` attributes, no `javascript:` URLs). Tighten if needed. Then mark the finding as resolved with an explanation pointing to `ArticleProse` + `sanitizePublicHtml.ts`.

The two remaining `dangerouslySetInnerHTML` usages in the codebase (`MathInsertDialog`, shadcn `chart.tsx`) render KaTeX/internal CSS strings and are not user-controlled — out of scope.

### 2. Public Routes Expose Owner Content (error) — mark as INTENTIONAL

`/library` is the product demo. Exposing the seed user's subjects/chapters/topics/blocks/headings/summaries/mnemonics is the intended behavior, and the anon-only RLS policies are scoped to that single owner UID.

**Action:**
- Mark this finding as **ignored** with reason: "Intentional public demo content for the seed account; anon SELECT is hard-scoped to one user_id."
- Update `@security-memory` so future scans don't re-flag it. Memory will state:
  - `/library` is a public demo by design.
  - Anon SELECT is allowed only for `user_id = b6dc6569-...` on `subjects`, `chapters`, `topics`, `blocks`, `heading_nodes`, `summaries`, `mnemonics`.
  - All other users' data must remain owner-scoped — never broaden anon policies to other users.
  - Indexing by search engines is desired for this demo.

### 3. Leaked Password Protection Disabled (warn) — ENABLE

Turn on Supabase HIBP check so signup/password-change rejects breached passwords. One-call fix via `configure_auth`.

### Files / Tools touched

- (Maybe) `src/utils/sanitizePublicHtml.ts` — confirm/tighten allowlist.
- `security--manage_security_finding` — mark XSS fixed, ignore public-routes finding.
- `security--update_memory` — record demo intent.
- `supabase--configure_auth` — `password_hibp_enabled: true`.

No app behavior or UI changes for end users.
