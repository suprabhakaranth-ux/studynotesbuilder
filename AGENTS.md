 # Architecture rules

- Load topic slide links and PDF rendering only when the + menu opens the slides window; keep associations in a separate workspace-protected table without deletion cascades so main notes and Recycle Bin restores remain independent.
- Capture a mapped ProseMirror selection bookmark before image picking and insert uploads in the same live editor; this preserves cursor placement without overwriting intervening edits or another topic.
- Handle uploaded block images through an async Word-export adapter while leaving the existing text parser and topic export unchanged; this adds image embedding without changing numbering or leaf/container traversal.

- Persist only navigation IDs in account-scoped sessionStorage; restore them after a successful hierarchy load and prioritize direct topic URLs, so reloads cannot restore stale note content or redirect while data is pending.

- Keep topic navigation inside the existing Tabs root in the sticky header; use a nonwrapping, horizontally scrollable formatting ribbon so narrow screens never obscure controls or add ribbon rows.
- LLM point formatting uses a single undoable ProseMirror transaction on matching paragraphs, keeping body and blank paragraphs inside their original list items; this preserves inline marks, list numbering and unrelated content without rebuilding stored HTML.
- Store floating annotations independently in topic_margin_notes with workspace-authenticated access and reversible soft deletion; this isolates revision marks from note HTML, word counts, exports and public demos.
- Position annotations in the scrolling page layer using a responsive horizontal fraction and vertical page offset; this preserves document width and allows manual repositioning after text reflows.- Topic saves, topic/subject deletes and Recycle Bin restores go through transactional server functions (save_topic, soft_delete_*, restore_deleted_item) that snapshot prior content; this prevents partial wipes and keeps a recoverable previous version.
