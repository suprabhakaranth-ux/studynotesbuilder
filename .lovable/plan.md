# Margin Note Enhancements

Three upgrades to floating margin notes, keeping all existing behavior intact.

## 1. Collate highlighted text into the margin note
- Add a **Highlighter** icon button in the margin note header (next to Draw/Type toggles), tooltip "Collate highlights from note".
- On click: scan the current note's editor content for highlighted text (`<mark>` spans / highlight marks), collect each highlighted fragment in document order, and insert them into the margin note's text area as separate lines.
- Existing margin note text is kept; collated lines are appended below it.
- If no highlights exist in the note, show a gentle message ("No highlighted text found in this note").

## 2. Resizable margin note window
- Add a drag handle at the bottom-right corner of the open margin note window (grip icon).
- Dragging resizes width and height live, like a browser window.
- Constraints: min ~220px wide / 160px tall, max limited to viewport so it never overflows the screen.
- Size is remembered per note (stored with the annotation's position data) so it reopens at the same size.

## 3. Movable pin badges, placed off the text
- Default pin position shifts further into the right margin so it no longer covers note text.
- Pins become draggable: drag to reposition anywhere in the margin area; a quick click still opens the note.
- Pin position is saved with the annotation (same horizontal-fraction + vertical-offset model already used), so it survives reloads and text reflow.

## Technical notes
- All changes stay in the margin-note components and the `topic_margin_notes` position fields — no changes to note HTML, word count, exports, or other screens.
- Positioning keeps the existing responsive horizontal-fraction + vertical page offset model.
- Verified in the preview with a disposable test topic only; no existing study data touched.
