-- Safely update item_type constraint to include 'chapter'
-- 1) Drop only check constraints on deleted_items that reference item_type
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'deleted_items'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%item_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.deleted_items DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 2) Add the corrected constraint (backward compatible)
ALTER TABLE public.deleted_items
  ADD CONSTRAINT deleted_items_item_type_check
  CHECK (item_type IN ('subject','topic','chapter'));
