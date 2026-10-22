# Export page: stop the "Failed to load" pop-up (reviewed fix)

## Review of the earlier diagnosis
- Confirmed: the Export page reloads its subject list whenever the sign-in info object changes, and the admin login (ektasudhir) builds a brand-new object on every screen update. So each subject click can fire a fresh reload; any one that fails shows the red pop-up, and the pop-up stays.
- Gap in the earlier fix: when signed in as suprabha.karanth (the owner) that object is usually stable, yet the sign-in info can still change when the login silently refreshes in the background. Fixing only the sign-in helper would leave that path open. The pack error came from the same reload resetting the page mid-generation.

## Best fix (two small, safe layers)
1. **Sign-in helper**: keep the same sign-in object unless the actual person or admin status changes. Nothing else changes — same IDs, same shared-workspace rights. The home screen also benefits (fewer needless reloads); no behaviour change there.
2. **Export page only**:
   - Load the subject list once per signed-in person (based on their ID, not the whole object), so clicks, ticks and background login refreshes never trigger a reload.
   - Ignore any late or duplicate load result so it cannot overwrite the list or interrupt a pack being generated.
   - If a load genuinely fails, keep whatever is already on screen and show the pop-up once with a "Try again" button, instead of wiping the list.

## Not touched
Pack generation, ZIP/PDF/Word/HTML output, the year/subject picker layout, topic editor, backups, PIN, other pages.

## Verification
Signed in as the owner in the preview: toggle subjects on/off repeatedly, select all, generate a pack for a 2nd-year subject and a multi-subject 1st-year pack; confirm no pop-up and that page loads happen once. Read-only — no notes are edited.

## Technical details
- `useAuth.tsx`: `useMemo` for `user` keyed on `authUser?.id` and `isAdmin`.
- `ExportCenter.tsx`: effect deps `[user?.id, authLoading]`; `cancelled` flag in cleanup; on error don't reset state, toast with retry action calling a `load()` callback.
