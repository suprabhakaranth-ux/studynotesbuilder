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

### B. Previous versions as a safety net
- Before each save, the server keeps a copy of the previous notes, summary and mnemonic.
- Only the **last 2 versions** per topic are kept. Older copies are removed automatically.
- To keep it out of the way, there is no button in the topic header. Instead:
  - Open the **Recycle Bin** and go to a new **"Restore previous version"** section. Pick a topic there.
  - You see the 2 saved versions with date, time and word count, plus a read-only preview.
  - Restoring asks you to confirm by typing the word **RESTORE**. Only signed-in owners and admins can do this, never public visitors.
  - Before restoring, the current text is saved as a version, so a restore can be undone.

### D. Off-app backup you control
- **Where the button is:** a **"Backup all notes"** button at the top of the Export page, next to the Study Pack export.
- **Where it is saved:** your browser downloads it to your Mac's **Downloads** folder as one file named like `study-notes-backup-2026-10-12.json`. It contains every year, subject, chapter, topic, summary, mnemonic, outline, margin note and presentation link. For extra safety, copy it to iCloud Drive or Google Drive.
- **Restore from backup:** on the same page. It only adds back topics that are missing and never overwrites existing notes.
- A small reminder appears on the home screen when your last backup is more than 7 days old.

### E. Visible save status
- Header shows "Saved", "Saving…" or "Not saved – retrying" for the notes text, as margin notes already do.
- Warn before closing the tab if changes are not saved yet.

## Verification (test data only)
- Create a new test subject, "ZZ Test – delete me", with one test chapter and one test topic. No existing subject, chapter or topic is opened, edited or deleted during testing.
- On the test topic: simulate a connection drop during saving and confirm the old text stays. Save twice, then restore the previous version and undo the restore.
- Delete and restore the test subject, then check all its text comes back.
- Download a backup and confirm the file includes the test topic.
- Permanently remove the test subject and its contents at the end.

## About backups of the whole database
Lovable Cloud keeps its own backups of the whole database, but you can't restore a single topic from them yourself. Version history (B) and Backup now (D) give you that control directly.

## Technical details
- New `topic_versions` table (topic_id, user_id, blocks jsonb, summary, mnemonic, heading_nodes jsonb, word_count, created_at). Workspace-scoped RLS like `blocks`, with grants, and no public access.
- `save_topic(topic_id, blocks jsonb, summary, mnemonic, heading_nodes jsonb)` SECURITY DEFINER RPC: checks owner/admin, snapshots the current rows into `topic_versions`, then deletes and re-inserts in one transaction. It rejects an empty payload when the stored content is non-empty unless `allow_empty=true`. It keeps only the newest 2 versions per topic. Versions are written only when the content has changed, so autosaves don't push useful versions out.
- `restore_topic_version(version_id)` and `soft_delete_subject|chapter|topic` RPCs: transactional, capture the full payload into `deleted_items`, and include `topic_margin_notes`.
- TopicEditor `saveAll` calls the RPC. Add a `beforeunload` guard and save-state badge. Writes keep using the workspace owner id.
- Backup: the client exports all workspace tables to JSON, with a matching import that only adds data and never overwrites.
