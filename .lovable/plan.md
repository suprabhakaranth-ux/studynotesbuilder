# One-Click "Paste with Source Formatting" Button

## Goal
The user's most frequent action while creating notes is Paste Special → Keep Source Formatting (two clicks: open the dropdown, then click the item). Add a single, larger button next to the existing Paste Special button that does both clicks in one.

## What to build

In `src/components/FormattingToolbar.tsx` (the fixed formatting ribbon in the topic editor):

1. **New button, placed immediately to the right of the existing Paste Special dropdown button.** No other button is changed, moved, or removed.
2. **Action:** clicking it runs the exact same code path as the existing "Keep Source Formatting" dropdown item — i.e. calls the existing `handlePasteSpecial("source")` handler (reads the clipboard, cleans/normalizes the HTML, inserts it at the cursor, shows the "Pasted with source formatting" toast). No new paste logic is written; it reuses the existing handler.
3. **Size (~2x the other buttons):** other ribbon buttons are small icon squares (h-8 w-8). The new button will be roughly twice their area: a taller/wider button (h-12) with a larger icon plus a short visible label ("Paste + Format"), using the primary color style so it stands out as the main paste action.
4. **Tooltip:** "Paste with source formatting (one click)".

## Details
- File touched: `src/components/FormattingToolbar.tsx` only.
- Uses the existing `ClipboardPaste` icon (or a checkmark variant of it) — no new dependencies.
- The existing Paste Special dropdown keeps all four options (Keep Source Formatting / Match Destination Style / Keep Text Only / Standardize Selection) unchanged.

## Verification
- Build passes with no errors.
- Playwright check: open the topic editor in the preview, confirm the new larger button renders next to Paste Special, and clicking it pastes clipboard content with formatting preserved (toasts "Pasted with source formatting").
