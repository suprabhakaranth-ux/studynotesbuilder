## Diagnosis

The Export Center page is rendering, but the selection checkboxes are visually invisible/illegible in your theme. Two concrete reasons:

1. **Default shadcn `Checkbox`** uses a 16×16 empty box with only a `border-primary` outline. Against the `bg-card` rows in the tree, that thin border blends in and looks like "no control is there".
2. **Indeterminate state has no glyph.** The current `Checkbox` only renders a `<Check/>` when fully checked. When a subject is partially selected (`"indeterminate"`), nothing visible appears — reinforcing the impression that there's no control.

Secondary friction:
- The "Generate Study Pack" button lives only in the right-hand sticky card. On narrower scrolled views it can fall below the fold, so users don't realise an action exists.
- Only the tiny 16px checkbox is clickable for selection — the row label/title isn't, so misclicks feel like "nothing happens".

No data, fetch, or zip code is broken — purely a selection-UX visibility fix in the Export Center UI.

## Fix plan (UI-only, scoped to Export Center)

### 1. `src/components/export/ExportTree.tsx`
- Replace the bare `<Checkbox>` usages with a larger, higher-contrast selector:
  - 20×20, `border-2`, `border-foreground/40`, `bg-background`, rounded-sm.
  - Checked: filled `bg-primary` with white `Check` icon.
  - Indeterminate: filled `bg-primary` with `Minus` icon (currently invisible).
- Make the **entire row** (subject / chapter / topic) a clickable selection target — clicking the name toggles selection; the chevron stays a separate button for expand/collapse.
- Add a subtle background tint on rows whose state is `all` or `some` so selected items are obvious at a glance.
- Hover state on every row.

### 2. `src/pages/ExportCenter.tsx`
- Add a **sticky action bar at the top of the left card** that mirrors the right-panel summary: shows `X topics selected` + a prominent `Generate Study Pack` button. This guarantees the user always sees both the selection count and the action, even on small/scrolled viewports.
- Keep the existing right-hand options/summary card unchanged (paper size, include outline/summary/mnemonic toggles, full summary).
- Tighten the empty-state message when nothing is selected ("Select at least one topic to enable export").

### 3. No changes to
- `fetchStudyData.ts`, `renderTopicHtml.ts`, `buildArchive*.ts`, `zipStudyPack.ts` — export pipeline is unaffected.
- The global `src/components/ui/checkbox.tsx` — to avoid changing checkbox styling everywhere else in the app, the new selector is a local component inside `ExportTree.tsx`.
- The existing per-topic Word export (`wordExport.ts`, `TopicEditor.exportToWord`).
- Routes, Sidebar entry, or auth.

## Expected result

Opening **Export Center** from the sidebar will show:
- Clearly visible square selectors next to every subject, chapter, and topic.
- Tri-state visuals: empty / minus (partial) / check (full).
- Clicking anywhere on a row toggles its selection.
- A sticky top bar with `N topics selected` and a big `Generate Study Pack` button — always reachable.
- Right-side panel still shows detailed counts, paper size, and content toggles.
