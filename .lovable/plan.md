

## Plan: Add "Paste as Image" Fallback for Formulas

### Goal
When pasted LaTeX/formula content fails to render properly (or the user prefers an image), provide a one-click fallback that converts the formula to an image and inserts it into the notes.

### Approach
Two complementary mechanisms:

**1. Manual fallback (always available)**
In the Math Insert Dialog (already planned), add an "Insert as Image" toggle alongside the existing "Inline / Display" toggle. When chosen, KaTeX renders the LaTeX → we convert the rendered DOM to a PNG via `html-to-image` (already a lightweight option) → insert as an `<img>` block.

**2. Automatic fallback on paste**
When the editor detects a `$...$` or `$$...$$` paste and KaTeX throws a parse error (invalid LaTeX), instead of showing the error, we:
- Show a small inline prompt: *"Couldn't render this formula. Insert as image instead?"*
- On confirm: render whatever we can (or the raw text in a styled box) → snapshot to PNG → insert as image

### Implementation Details

**New dependency:** `html-to-image` (~15KB, no canvas/server needed)

**New file: `src/utils/formulaToImage.ts`**
- `latexToImage(latex, displayMode)`: renders LaTeX into a hidden offscreen div with KaTeX → uses `html-to-image` `toPng()` → returns a base64 PNG data URL
- Handles styling (white background, padding, 2x scale for retina sharpness)

**Modify `src/components/MathInsertDialog.tsx`** (the planned new dialog)
- Add a third option in the insert mode: **Inline / Display / Image**
- "Image" mode shows the same live preview but inserts as `<img src="data:image/png;...">` instead of `$...$`

**Modify `src/components/RichTextEditor.tsx`**
- When paste contains `$...$`/`$$...$$` and KaTeX render throws → show toast: *"Formula couldn't be rendered. [Insert as image] [Cancel]"*
- "Insert as image" calls `latexToImage()` and inserts the resulting `<img>` at cursor

**Modify `src/utils/wordExport.ts`**
- Already handles `<img>` tags → no changes needed; image-mode formulas export to Word natively

### Files to Create / Modify

| File | Change |
|------|--------|
| `package.json` | Add `html-to-image` dependency |
| `src/utils/formulaToImage.ts` | **NEW** — LaTeX → PNG data URL |
| `src/components/MathInsertDialog.tsx` | Add "Image" insert mode (alongside Inline/Display) |
| `src/components/RichTextEditor.tsx` | Auto-fallback prompt when KaTeX parse fails on paste |

### When to use which mode
- **Text mode (`$...$`)** — default, editable, lightweight, scales with font size
- **Image mode** — use when: formula is very complex, you want pixel-perfect appearance, or LaTeX can't be parsed

### Out of scope
- Editing the formula after it's inserted as an image (you'd delete + reinsert)
- Server-side rendering (everything happens in-browser)

