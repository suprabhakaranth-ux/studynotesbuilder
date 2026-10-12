# Data safety audit and hardening

Goal: your notes can never silently disappear, and there is always an earlier version to go back to.

## Findings so far (from reading the code)

1. **Every save wipes the topic first, then rewrites it.** The notes page is saved by deleting all its text, then inserting it again. If the second step fails (connection drops, session expires), the topic is left empty. The same happens with the Summary outline. This is the biggest risk.
2. **No version history.** A save replaces the old text completely. Nothing keeps earlier versions, so a bad save cannot be undone. That is why the MPCE 021 text could not be recovered.
3. **Recycle Bin may not fully cover deleting a whole subject.** When a subject is deleted, the subject, chapters and topic names are kept, but the notes text, summaries and mnemonics are not clearly stored first. This needs a test, then a fix if confirmed.
4. **Some delete steps ignore errors.** If one step fails partway, data can be left half-deleted with no warning.
5. **Already fixed (preview only, not live):** if notes fail to load, saving is blocked; opening a topic no longer saves anything.

## What we will build

### A. Safe saving (no more wipe-then-write)
- Save the notes page in one step on the server: either everything saves, or nothing changes.
- Refuse to save a blank page over a topic that had text, unless you cleared it yourself.

### B. Automatic version history for every topic
- Before each save, the server keeps a copy of the previous notes, summary and mnemonic.
- Keep the last 50 versions per topic, plus one copy per day for 30 days.
- Add a **History** button in the topic header. It lists versions by date and word count, with Preview and Restore. Restoring also saves the current text as a version first, so a restore can be undone.

### C. Recycle Bin covers everything
- Deleting a subject, chapter or topic stores all its notes, summaries, mnemonics, outlines and margin notes first. If that copy fails, the delete stops.
- Each delete runs in one step, so nothing is left half-deleted.

### D. Off-app backup you control
- A **Backup now** button that downloads everything as one file, which can be restored later.
- A gentle reminder when your last backup is more than 7 days old.

### E. Visible save status
- Header shows "Saved", "Saving…" or "Not saved – retrying" for the notes text, as margin notes already do.
- Warn before closing the tab if changes are not saved yet.

## Verification
- Simulate a connection drop during saving and confirm the old text stays.
- Delete and restore a test subject, then check all its text comes back.
- Restore an old version from History, then undo the restore.
- Remove the test data afterwards.

## About backups of the whole database
Lovable Cloud keeps its own backups of the whole database, but you can't restore a single topic from them yourself. Version history (B) and Backup now (D) give you that control directly.

## Technical details
- New `topic_versions` table (topic_id, user_id, blocks jsonb, summary, mnemonic, heading_nodes jsonb, word_count, created_at). Workspace-scoped RLS like `blocks`, with grants, and no public access.
- `save_topic(topic_id, blocks jsonb, summary, mnemonic, heading_nodes jsonb)` SECURITY DEFINER RPC: checks owner/admin, snapshots the current rows into `topic_versions`, then deletes and re-inserts in one transaction. It rejects an empty payload when the stored content is non-empty unless `allow_empty=true`. A trimming step enforces retention.
- `restore_topic_version(version_id)` and `soft_delete_subject|chapter|topic` RPCs: transactional, capture the full payload into `deleted_items`, and include `topic_margin_notes`.
- TopicEditor `saveAll` calls the RPC. Add a `beforeunload` guard and save-state badge. Writes keep using the workspace owner id.
- Backup: the client exports all workspace tables to JSON, with a matching import that only adds data and never overwrites.
