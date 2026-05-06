## Plan: Tiptap migration — addressing your critical points

Same overall approach as before (Tiptap v2 + custom Math nodes, same prop contract on `RichTextEditor`, no DB migration). This revision spells out exactly how each of your 4 requirements is enforced.

---

### 1. Robust math parsing (nested HTML, no duplication, lossless round‑trip)

**Where parsing happens:** at HTML→ProseMirror load time only, via a Tiptap `parseHTML` rule on the `MathInline` / `MathDisplay` node specs **plus** a pre‑parse text‑node walker (so `$..$` inside `<b>`, `<span>`, `<li>`, `<p>`, lists, etc. is caught).

**Algorithm (reused tokenizer from `mathRenderer.ts`):**
1. Walk only **text nodes** of the incoming HTML (skip elements that already are math: `.math-node`, `[data-latex]`, `.katex`).
2. Tokenize each text node with the existing battle‑tested tokenizer (handles `$$..$$`, `$..$`, `\[..\]`, `\(..\)`, escaped `\$`, ignores empty `$$`).
3. Replace each math token in‑place with a placeholder `<span data-math-inline="...latex..."></span>` or `<div data-math-display="...latex..."></div>` — **inside whatever ancestor it was found in**, so surrounding `<b>`, `<li>`, etc. is preserved.
4. Tiptap's `MathInline.parseHTML` matches `span[data-math-inline]` and `div[data-math-display]` and creates atom nodes with `latex` attr.
5. Pre‑rendered KaTeX HTML coming from old saves (e.g. `<span class="math-inline" data-latex="...">…katex…</span>`) is **also matched** by a second `parseHTML` rule reading `data-latex`, so the inner KaTeX markup is discarded and only the source LaTeX is kept. This prevents "duplicate render" bugs.

**Save path (renderHTML):**
- `MathInline` → `<span data-math-inline="LATEX">$LATEX$</span>` then a final post‑serializer pass strips the wrapper and emits the plain `$LATEX$` text into the HTML string. Result: stored HTML stays in **today's exact format** (`...text $latex$ text...`), so `wordExport.ts` and the public viewer don't change.
- `MathDisplay` → `$$LATEX$$` on its own line.

**Round‑trip guarantees:**
- `latex` is the single source of truth, stored verbatim in node attrs and re‑emitted byte‑for‑byte.
- No KaTeX HTML is ever serialized back to the DB — only delimited LaTeX.
- Unit/dev test: load a fixture HTML containing math inside `<b>`, `<li>`, `<span style>`, mixed inline + display, escaped `\$`, run `parse → serialize`, assert string equality (with whitespace tolerance).

---

### 2. HTML compatibility (no formatting loss)

**Extensions enabled** (covers everything currently used in your notes):
- StarterKit (paragraph, heading, bold, italic, strike, code, blockquote, hr, bulletList, orderedList, listItem, hardBreak, history)
- Underline, TextStyle, Color, Highlight, FontFamily
- TextAlign (left/center/right)
- Link (autolink off, keepOnSplit on)
- Image (extended → `FormulaImage` to keep `data-latex` for PNG fallback)
- Placeholder
- Custom: `MathInline`, `MathDisplay`
- Custom: `InlineStylePreserver` — a low‑priority mark that captures `style="font-size:..px; margin-left:..px; background-color:..."` from spans/paragraphs that StarterKit would otherwise drop, and re‑emits them on save. This is what keeps your **font sizes, indent margins, custom highlights** intact across load→save.

**What's preserved end‑to‑end:** `<p>`, `<br>`, `<strong>/<b>`, `<em>/<i>`, `<u>`, `<s>`, `<ul>/<ol>/<li>` (incl. nested), `<a href>`, `<span style="color/background/font-family/font-size">`, `<p style="margin-left">` (your indent system), `<img src data-latex>`, headings.

**Fallback for unknown HTML:** Tiptap's default behavior drops unknown attrs. We override this with a global `parseHTML` hook on TextStyle to keep `style` intact, and we add a permissive `Div` block extension only for legacy notes that wrapped content in `<div>` (rendered as paragraph on save).

**Reversibility test (shipped as a dev script, not in prod):** sample N existing rows from `blocks` / `summaries` / `mnemonics` / `heading_nodes`, run `html → tiptap → html`, diff. Acceptance = no semantic diff (whitespace and attribute order normalized).

---

### 3. Paste pipeline (3 modes, no Word/Docs span soup)

Bound to the editor's `handlePaste` ProseMirror plugin and to the existing toolbar Paste Special menu.

| Mode | Trigger | Behavior |
|---|---|---|
| **Preserve formatting** | Default Ctrl/Cmd+V, or "Paste (source)" menu | Use `text/html`. Run through `sanitizeSourceFormatting` (existing helper) → strip scripts/handlers → pass through a **Word/Docs cleaner**: drop `<o:p>`, `mso-*` styles, `class="MsoNormal"`, Google Docs `<b style="font-weight:normal">` wrappers, empty spans, conditional comments. Keep semantic tags + safe inline styles. Then `editor.commands.insertContent(html, { parseOptions: { preserveWhitespace: 'full' } })`. Math delimiters in the pasted HTML go through the same parser as load, so pasted formulas become real Math nodes. |
| **Clean formatting (destination)** | "Paste (destination)" menu | Use existing `sanitizeToDestinationStyle` → semantic HTML only (b/i/u/s/p/ul/ol/li/a/br) → insert. Result inherits the editor's own font/size/color. |
| **Plain text** | "Paste as text" menu, or Ctrl+Shift+V | `extractPlainText` → `textToHtml` → insert. No styles, no tags except `<br>`. |

**Word/Docs hardening (built into the source‑preserving pipeline):**
- Strip `class`, `id`, `lang`, `xml:*`, `mso-*` style props, `o:*` and `w:*` namespaced tags.
- Unwrap Google Docs' `<b style="font-weight:normal">` (the well‑known "everything is bold" bug).
- Collapse repeated identical nested spans (`<span style="x"><span style="x">…`).
- Convert `<font>` to `<span style>`.
- Run a final pass that drops `<span>` with no attributes.

**Math in pasted text:** the same tokenizer runs on the cleaned HTML before insertion, so `$\frac{a}{b}$` pasted from anywhere becomes a real Math node. Invalid LaTeX still triggers the existing PNG fallback dialog.

---

### 4. No data mutation on load

- Notes are loaded into Tiptap **in memory**. The editor's `onUpdate` callback only fires on actual user edits.
- `onChange` (which writes to Supabase) is wired to `onUpdate`, never to `onCreate` / `setContent` / load events.
- `setContent(html, false /* emitUpdate */)` is used for the initial load so it cannot trigger a save.
- Re‑opening a note you didn't touch leaves `updated_at` unchanged. (Verifiable in DB after rollout.)

---

### Files (unchanged from prior plan, recap)

**New:** `src/components/editor/TiptapEditor.tsx`, `extensions/MathInline.ts`, `extensions/MathDisplay.ts`, `extensions/FormulaImage.ts`, `extensions/InlineStylePreserver.ts`, `extensions/parseMathFromHtml.ts`, `extensions/wordPasteCleaner.ts`.

**Modified:** `src/components/RichTextEditor.tsx` (thin re‑export, same props), `FormattingToolbar.tsx` (handlers → Tiptap commands, UI unchanged), `FloatingToolbar.tsx`, `MathInsertDialog.tsx` (calls `insertMath` command), `src/index.css` (add `.ProseMirror` focus styles, keep all existing `.math-*` styles), `package.json` (add Tiptap deps).

**Untouched:** DB schema, RLS, `wordExport.ts`, `formulaToImage.ts`, `formulaLibrary.ts`, KaTeX, routing, public/library pages, `pasteSpecial.ts` core helpers (reused as‑is).

---

### Acceptance gate (will run before declaring done)

1. Math nested in `<b><li>` round‑trips byte‑identical.
2. Bold + italic + colored span + indent + bullet list + heading round‑trips.
3. Paste from MS Word in each mode produces clean HTML (manual + asserted no `mso-` / `<o:p>` survives).
4. Opening a math‑heavy note then closing without edits → `updated_at` unchanged.
5. Existing `/library` read‑only render unchanged.
6. Word export of a re‑saved note matches a pre‑migration export of the same note.

Approve and I'll execute end‑to‑end and report on each acceptance item.