## Sticky editor chrome (MS Word style)

Rework the top of `src/components/TopicEditor.tsx` so the header, formatting ribbon, and tab switcher are all pinned together at the top of the viewport, and only the page content below scrolls — on both the Full Content and Summary & Mnemonics tabs.

## Changes

Single file: `src/components/TopicEditor.tsx`.

1. Wrap the editor in `<Tabs>` at the top level and split the layout into two flex children:
   - **Sticky chrome** (`shrink-0 sticky top-0 z-40 bg-card/95 backdrop-blur border-b shadow-sm`) containing, top to bottom:
     - existing header bar (back button, title, Add Block, Save, Export Word)
     - `<FormattingToolbar />` (only when `!readOnly`)
     - `<TabsList>` with the two triggers
   - **Scroll region** (`flex-1 overflow-y-auto min-h-0`) containing both `<TabsContent>` panels.
2. Remove the old `fixed top-[72px]` positioning on the toolbar and the `h-[52px]` spacer — no more hard-coded offsets.
3. Remove `overflow-y-auto` from each individual `<TabsContent>` — the single parent scroll region handles it uniformly.
4. Read-only mode still hides only the ribbon; header and tab switcher remain sticky.

## Untouched

- `FormattingToolbar` component, data model, autosave, outline generation, exports, public library viewer, mobile behaviour.

## Technical notes

```text
<div h-screen flex flex-col>
  <Tabs flex-1 flex flex-col min-h-0>
    <div shrink-0 sticky top-0 z-40>       ← chrome
      header
      FormattingToolbar (edit only)
      TabsList
    </div>
    <div flex-1 overflow-y-auto min-h-0>   ← scroll region
      <TabsContent value="full">…</TabsContent>
      <TabsContent value="summary">…</TabsContent>
    </div>
  </Tabs>
</div>
```

`min-h-0` on the flex parents prevents flex children from forcing the container taller than the viewport (a common cause of the whole page becoming scrollable instead of just the content region).
