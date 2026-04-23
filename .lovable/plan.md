

## Plan: Make inserted formulas deletable and keep typing usable

The formula rendering is now visually correct, so the next fix is editor behaviour after insertion.

### What is going wrong

Inserted formulas are currently rendered as non-editable KaTeX blocks:

```html
<div class="math-display" contenteditable="false">...</div>
```

That protects the formula from being accidentally corrupted, but it also creates two usability problems in a `contenteditable` editor:

1. The cursor can get stuck before/inside/after the formula block.
2. Browser deletion behaviour around `contenteditable="false"` blocks is inconsistent, so Backspace/Delete may not remove the formula cleanly.
3. After insertion, no editable empty line is guaranteed after the formula, so you cannot immediately continue writing notes.

### Fix 1 — Insert formulas as removable “math blocks”

Update the math renderer so rendered formulas are treated as single editor objects:

- Inline formulas remain inline chips.
- Display formulas remain centered block formulas.
- Both receive clear attributes/classes, for example:

```html
<span class="math-inline math-node" data-latex="..." data-display="false" contenteditable="false">...</span>

<div class="math-display math-node" data-latex="..." data-display="true" contenteditable="false">...</div>
```

This keeps formulas protected visually but makes them easy for the editor logic to identify and remove.

### Fix 2 — Always add an editable line after inserted display formulas

When inserting a display formula from the Math dialog, the editor should insert:

```html
<div class="math-display math-node" ...>formula</div>
<p><br></p>
```

Then move the cursor into the empty paragraph after the formula.

Result:

- Insert formula.
- Cursor automatically appears on the next blank line.
- You can immediately type normal notes/content.
- The formula does not trap the cursor.

For inline formulas, the editor should insert a normal trailing space after the formula so typing can continue naturally.

### Fix 3 — Add reliable keyboard deletion for formulas

Add editor-level keyboard handling in `src/components/RichTextEditor.tsx`:

- If the formula is selected and the user presses Backspace/Delete, remove it.
- If the cursor is immediately after a formula and the user presses Backspace, remove that formula.
- If the cursor is immediately before a formula and the user presses Delete, remove that formula.
- After deleting a display formula, ensure the editor still has a valid editable paragraph so typing can continue.

This makes formulas behave like images or embedded objects in a document editor.

### Fix 4 — Make formulas selectable with one click

Add a simple click handler:

- Clicking a formula selects/highlights the whole formula object.
- Pressing Backspace/Delete removes it.
- Clicking elsewhere returns to normal typing.

This avoids needing to drag-select complex KaTeX output.

### Fix 5 — Keep saved content editable

The database should still store formulas as source text:

```text
$$r = ...$$
```

not raw KaTeX HTML.

So `restoreMathSource()` will continue converting rendered formula nodes back to their original LaTeX before saving.

This means formulas remain portable and can still be re-rendered correctly when reopening the note.

### Fix 6 — Prepare for your exact formula pages

Once you provide the exact pages from the booklet, I will update `src/data/formulaLibrary.ts` with:

- All required formulas from those pages.
- Correct category grouping.
- Clear naming convention matching your paper/booklet.
- Correct LaTeX for each formula.
- Preview-safe formatting for long formulas.

### Files to modify

| File | Change |
|---|---|
| `src/components/RichTextEditor.tsx` | Add smart formula insertion, cursor placement after formulas, click selection, Backspace/Delete handling |
| `src/utils/mathRenderer.ts` | Add stable `math-node` class/attributes for rendered formulas |
| `src/index.css` | Add selected formula styling and improve cursor/selection behaviour around formulas |
| `src/data/formulaLibrary.ts` | Later update with exact formulas once you provide the pages |

### Expected result

After the fix:

1. Pick a formula from the Math dialog.
2. Click Insert.
3. Formula appears correctly.
4. Cursor lands on the next blank line.
5. You can immediately type your explanation/content.
6. Clicking a formula selects it.
7. Pressing Backspace/Delete removes it cleanly.
8. Saved notes still preserve the original formula source.

