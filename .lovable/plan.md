## Goal

Keep the study-app shell (sidebar, subject/topic cards, tabs, navigation, overall layout) exactly as it is. Only the **note body rendering area** inside `PublicTopicViewer` gets upgraded to a clean, sans-serif, web-article reading experience. Sanitization runs at render time on public pages — stored content is never mutated.

## Scope (what changes)

- `src/components/PublicTopicViewer.tsx` — keep Tabs + Cards + heading tree; swap the inner `dangerouslySetInnerHTML` div for a new `<ArticleProse />` component.
- `src/pages/PublicTopic.tsx` — wrap the topic body in `<article>` semantics; pass extra fields to SEO. Layout, header, breadcrumbs, footer untouched.
- `src/components/SEOHead.tsx` — upgrade JSON-LD to `Article`, add robots / dates / author meta.
- `src/index.css` — add a scoped `.article-prose` typography layer.
- New: `src/utils/sanitizePublicHtml.ts`, `src/components/ArticleProse.tsx`.
- `package.json` — add `dompurify` + `@types/dompurify`.

## Out of scope (untouched)

Editor (`/app`), DB, RLS, stored content, sidebar, subject/chapter/topic cards, `PublicLibrary.tsx` listing layout, Word export, Tiptap extensions, KaTeX setup.

## 1. Article typography layer (sans-serif, scoped)

Add `.article-prose` to `src/index.css` using `:where()` selectors so specificity stays low and KaTeX/math rules continue to win:

- **Font**: inherit project sans (`Inter, system-ui, -apple-system, "Segoe UI", sans-serif`). No serif.
- **Content width**: `max-width: 72ch; margin-inline: auto;` — sits inside the existing Card, so the card's width still controls the page frame.
- **Body**: `font-size: 1.0625rem; line-height: 1.75; color: hsl(var(--foreground));`
- **Headings**:
  - `h1` (rare in body) `text-3xl font-bold mt-0 mb-4 leading-tight`
  - `h2` `text-2xl font-semibold mt-10 mb-3 leading-snug`
  - `h3` `text-xl font-semibold mt-8 mb-2`
  - `h4` `text-lg font-semibold mt-6 mb-2`
- **Paragraph**: `margin: 0 0 1.1em;`
- **Lists**: `ul` disc, `ol` decimal, `padding-inline-start: 1.5rem;` `li { margin-block: 0.35em; }` nested lists keep indent.
- **Blockquote**: left border `3px solid hsl(var(--primary)/0.4)`, italic, muted, `padding-left: 1rem`.
- **Code**: inline `bg-muted px-1.5 rounded text-[0.95em]`; block `pre` `bg-muted p-4 rounded-md overflow-x-auto`.
- **Links**: `color: hsl(var(--primary)); text-decoration: underline; text-underline-offset: 2px;`
- **Images**: `max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1.25em auto;`
- **hr**: subtle `border-color: hsl(var(--border)); margin: 2em 0;`
- **KaTeX**: explicitly **not** restyled here. Existing `.math-inline` / `.math-display` / `.katex` rules remain authoritative.

## 2. Sanitization + normalization (`sanitizePublicHtml.ts`)

Render-time pipeline using **DOMPurify** + a lightweight DOM walk. Order:

1. **DOMPurify** — allow tags `p, h1–h6, ul, ol, li, blockquote, strong, em, b, i, u, s, code, pre, a, img, br, hr, table, thead, tbody, tr, th, td, span, div, sub, sup, figure, figcaption`. Allow attrs `href, src, alt, title, colspan, rowspan, class, style, data-latex, data-math-inline, data-math-display, data-display`. Force `rel="noopener noreferrer nofollow"` + `target="_blank"` on external `<a>`.
2. **Class allowlist** (not aggressive — preserve editor extensibility):
  - Always keep: anything matching `^katex`, `^math-`, `^ProseMirror`, `^tiptap-`, `^editor-`, plus `data-*` attributes on math nodes.
  - Drop only known-junk: `MsoNormal`, `Mso*`, `gmail_*`, `gmail-*`, `docs-internal-guid-*`, empty `class=""`.
3. **Inline style filtering** — keep semantic styles, drop noise. Allowed style props: `color, background-color, text-align, font-weight, font-style, text-decoration` on inline elements; `text-align` on block elements. Drop everything else (`font-family`, `font-size`, `margin-*`, `padding-*`, `line-height`, `mso-*`, `letter-spacing`). Keeps emphasis/colors users intentionally applied; removes spacing chaos from Word/Docs.
4. **Structural normalization** (DOM walk):
  - **Collapse `<br>` runs**: 2+ consecutive `<br>` → single paragraph break (split parent `<p>` into two `<p>`s). 3+ at top level → `<hr>` skipped — just break paragraphs.
  - **Remove empty paragraphs**: `<p>` whose `textContent.trim()` is empty AND no `<img>`, no math node, no `<br>` count > 0 → remove.
  - **Flatten redundant wrappers**: `<span>` / `<div>` with no attributes (after class/style filtering) and a single child → unwrap. Repeat until stable.
  - **Promote bare `<div>`s** containing only inline text/inline elements → `<p>`. `<div>`s containing block-level children stay as `<div>`.
  - **Demote stray `<h1>` inside body** → `<h2>` (the page already owns the only `<h1>` = topic title). Preserve relative hierarchy of subsequent headings.
  - **Trim NBSP runs**: `\u00A0{2,}` → single space, leading/trailing NBSP in paragraphs trimmed.
  - **Empty list items**: `<li>` with no content → removed. Empty `<ul>`/`<ol>` after that → removed.
5. **Math preservation** — never touch nodes matching `[data-latex]`, `[data-math-inline]`, `[data-math-display]`, `.katex`, `.math-inline`, `.math-display`, `.math-node`. The walker skips into them as opaque subtrees.
6. **Optional KaTeX render pass** — if a `[data-math-inline]` / `[data-math-display]` node has no `.katex` child (i.e. stored as raw LaTeX), call `katex.renderToString` on its `data-latex` / attribute value and inject. Guarantees public pages render math whether stored snapshot is pre-rendered or not.

Result is memoized per HTML string via `useMemo` in `ArticleProse` so we don't re-parse on every render.

## 3. `ArticleProse` component

```tsx
// src/components/ArticleProse.tsx
export const ArticleProse = ({ html }: { html: string }) => {
  const clean = useMemo(() => sanitizePublicHtml(html), [html]);
  return (
    <div
      className="article-prose"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
};
```

## 4. `PublicTopicViewer.tsx` — minimal surgical change

Keep the Tabs ("Full Content" / "Summary"), keep the Cards, keep `HeadingTreeView`, keep all icons and structure. Only change: every place that currently does

```tsx
<div className="prose prose-sm max-w-none dark:prose-invert"
     dangerouslySetInnerHTML={{ __html: ... }} />
```

becomes

```tsx
<ArticleProse html={...} />
```

Applied to: each block in Full Content, Summary Notes card, Mnemonics card, and `HeadingNodeView` notes.

Also: when there are multiple blocks in "Full Content", drop the per-block Card chrome **only if** Question 1 = "merge blocks". Default = keep current Card-per-block to preserve study-app feel.

Do not use Tailwind Typography `prose`) classes in the article renderer. Use only the custom `.article-prose` layer for styling.

## 5. `PublicTopic.tsx` — semantics + meta strip

- Wrap `<PublicTopicViewer />` inside `<article itemScope itemType="https://schema.org/Article">`.
- Below the H1, add a small meta strip: `subject • chapter • ~N min read` (computed from total word count of blocks/summary). Pure presentation, uses existing tokens.
- Header, breadcrumbs, footer, navigation unchanged.

## 6. SEO upgrades per slug

`SEOHead.tsx` extended with optional props: `publishedTime`, `modifiedTime`, `section`, `keywords`, `author`. When `type="article"`:

- `<meta name="robots" content="index,follow,max-image-preview:large" />`
- `<meta name="author" content="..." />`
- `<meta property="article:published_time" />` / `article:modified_time` / `article:section`
- JSON-LD switches from `LearningResource` to `Article`:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "...",
    "description": "...",
    "datePublished": "...",
    "dateModified": "...",
    "author": { "@type": "Person", "name": "..." },
    "publisher": { "@type": "Organization", "name": "Study Notes Library" },
    "mainEntityOfPage": canonicalUrl,
    "articleSection": subjectName,
    "keywords": [subjectName, chapterName].filter(Boolean).join(", ")
  }
  ```

`PublicTopic.tsx` already loads topic + subject + chapter + summary — pass `topic.created_at` / `updated_at` / `subject.name` / `chapter?.name` into `SEOHead`.

Description fallback chain: stored summary → first block stripped text → topic title. Capped at 155 chars.

## Acceptance checks

- Open a topic with messy Word-pasted content → renders as clean article (consistent font, spacing, lists), no font-size jitter, no stray empty paragraphs.
- Open a math-heavy topic → all `$...$` and `$$...$$` render via KaTeX exactly as today.
- Sidebar, breadcrumbs, tabs, cards, "Sign In" button, footer all unchanged in look and behavior.
- View page source → single `<h1>`, semantic `<h2>`/`<h3>` for sections, valid `Article` JSON-LD with dates.
- Editor (`/app`) and stored DB content unchanged. Closing a public topic without editing leaves `updated_at` untouched.
- Lighthouse SEO on a topic page improves (proper meta description, robots, structured data).

## Open questions

Asking 3 small choices below before coding.