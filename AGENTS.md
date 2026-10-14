 # Architecture rules

- Keep topic navigation inside the existing Tabs root in the sticky header; use a nonwrapping, horizontally scrollable formatting ribbon so narrow screens never obscure controls or add ribbon rows.
- Store floating annotations independently in topic_margin_notes with workspace-authenticated access and reversible soft deletion; this isolates revision marks from note HTML, word counts, exports and public demos.
- Position annotations in the scrolling page layer using a responsive horizontal fraction and vertical page offset; this preserves document width and allows manual repositioning after text reflows.- Topic saves, topic/subject deletes and Recycle Bin restores go through transactional server functions (save_topic, soft_delete_*, restore_deleted_item) that snapshot prior content; this prevents partial wipes and keeps a recoverable previous version.
