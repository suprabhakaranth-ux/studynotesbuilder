

## Strategy: One-click formula library + lightweight symbol palette

Based on your booklet, you have **~17 fixed formulas** you'll use repeatedly. The simplest, most reliable approach:

### 1. Pre-built Formula Library (the main solution — covers 95% of your needs)

In the Math (Σ) dialog, add a categorised dropdown/grid of **every formula from your booklet**, ready to insert with one click. You never type LaTeX. You just pick "Pearson r" → it inserts the fully-formatted 2D fraction → done.

**Categories & formulas (exactly as in your booklet):**

| Category | Formulas |
|----------|----------|
| **Standard Deviation** | SD master formula |
| **Correlation** | Pearson r (short form via Cov), Pearson r (full computational form) |
| **Regression** | Sₓ², Sy², Covₓy, Y = a + bX (with b, a), X = a + bY (with b, a) |
| **One-Way ANOVA** | SSB, SSW, SST, MSB, MSW, F-ratio |
| **Spearman ρ** | Untied ranks, Tied ranks |
| **Kendall τ** | tau formula |
| **Mann-Whitney** | U, U′, U + U′ identity |
| **Chi-Square** | χ², Expected Frequency |

Click any → fully rendered stacked fraction inserted into the note.

### 2. Symbol Palette (for the rare custom case)

A small grid above the LaTeX textarea — click to insert at cursor with caret pre-positioned inside the first `{}`:

- **Structure:** `a/b` (frac), `√` (sqrt), `x²` (sup), `xₙ` (sub), `( )` (auto-paren)
- **Operators:** Σ, ∏, ∫, ±, ×, ÷, ≤, ≥, ≠, ≈, ∞
- **Greek:** α β μ σ ρ χ τ π θ λ

This is the fallback for when you need to tweak a formula or build something not in the booklet.

### 3. Live preview (already exists)

You see the stacked 2D output as you build, exactly like the booklet.

## Workflow you'll experience

**Common case (95%):** Open Math dialog → click "Pearson r (full)" → see the perfect stacked fraction → click Insert. **3 clicks, zero typing.**

**Custom case (5%):** Open Math dialog → click `a/b` button → type numerator → Tab → type denominator → Insert.

## Files to modify

| File | Change |
|------|--------|
| `src/data/formulaLibrary.ts` | **NEW** — all 17 booklet formulas as `{label, latex, category}` |
| `src/components/MathInsertDialog.tsx` | Add categorised formula picker + symbol palette + smart cursor insert |

That's it — 1 new file + 1 modified file. The existing renderer, image fallback, and paste handling all stay as-is.

## Why this is the simplest path
- **No new dependencies** — uses what we already built
- **No keyboard remapping** — works with your normal keyboard
- **No learning curve** — pick from a list, see the result
- **Booklet-aligned** — every formula you'll ever need for this paper is one click away
- **Extensible** — when your professor adds a new formula, I add one line to `formulaLibrary.ts`

## Out of scope
- Always-visible floating math keyboard in the editor (clutters the writing surface; the dialog is one click away)
- Click-to-edit an inserted formula (still: delete + reinsert via dialog)
- OCR/handwriting input

Approve this plan and I'll build it.

