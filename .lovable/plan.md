

## Fix the Math Insert dialog — preview, layout, and picker

Three issues to fix in `src/components/MathInsertDialog.tsx` (and a small CSS tweak):

### Issue 1 — Preview renders broken/flat (no stacked fraction, square root running off)

**Cause:** The preview container uses `flex items-center justify-center overflow-x-auto`. The flex centering collapses KaTeX's `.katex-display` block layout, and `overflow-x-auto` lets the sqrt bar extend beyond the visible width instead of scaling/wrapping. The result is the broken layout in your screenshot.

**Fix:**
- Remove `flex items-center justify-center` from the preview wrapper. KaTeX's `.katex-display` already centers itself.
- Keep `overflow-x: auto` but constrain the inner KaTeX block with a small CSS rule so very wide formulas (Pearson r full) shrink to fit on first view, with horizontal scroll only when truly needed.
- Add a max-width constraint and proper padding so tall stacked fractions get vertical room.

### Issue 2 — Insert button off-screen, horizontal scroll inside dialog

**Cause:** The wide preview content stretches the dialog body horizontally, pushing the footer (Insert/Cancel) out of view. The dialog uses `max-w-3xl max-h-[90vh] overflow-y-auto` — the whole content scrolls, including the footer.

**Fix:**
- Make the dialog body itself the scroll container, and pin `DialogFooter` to the bottom (sticky) so Insert/Cancel are always visible.
- Add `overflow-x: hidden` on the dialog content and let only the preview pane scroll horizontally if needed.
- Increase max width slightly (`max-w-4xl`) and constrain inner sections to `min-w-0` so flex children can shrink.

### Issue 3 — Picker selection clears itself / doesn't stay shown

**Cause:** `handlePickFormula` calls `setTimeout(() => setPickerValue(""), 0)` to reset the dropdown — that's why it snaps back to "Pick a formula…" placeholder even though the LaTeX loaded.

**Fix:**
- Keep `pickerValue` set to the chosen formula so the dropdown shows what's loaded (e.g. "Pearson r (full computational)").
- To allow re-picking the same formula, also re-trigger the load if the user re-selects the same item: track the last loaded value and reset on dialog open only.

### Files to modify

| File | Change |
|------|--------|
| `src/components/MathInsertDialog.tsx` | Preview wrapper (no flex-center), sticky footer, wider dialog, `min-w-0` on flex children, picker keeps selection |
| `src/index.css` | Add `.math-preview .katex-display { margin: 0; }` and ensure `.katex-display` inside the preview can scroll horizontally without stretching the parent |

### What stays the same
- Formula library data (`formulaLibrary.ts`) — unchanged
- Symbol palette, insert modes (Inline/Display/Image), KaTeX renderer, paste handling — all unchanged
- The `$$S_x^2 = \dfrac{\sum x^2}{n} - \left(\dfrac{\sum x}{n}\right)^2$$` and Pearson r formulas you pasted are valid LaTeX and will render correctly once the preview wrapper is fixed.

### Verification after fix
- Open Math (Σ) → pick "Pearson r (full computational)" → dropdown shows the chosen label, preview shows a properly stacked fraction with horizontal sqrt bar correctly sized over the bracketed denominator, Insert button visible without horizontal scroll.
- Insert → note shows the formula as a centered 2D stacked fraction (matching the booklet).
- Re-open dialog and pick a different formula → switches cleanly.

