
-- presentations table
CREATE TABLE public.presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  title text NOT NULL,
  slug text,
  file_path text,
  file_size bigint,
  page_count integer,
  presentation_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own presentations"
  ON public.presentations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view owner presentations"
  ON public.presentations FOR SELECT
  TO anon
  USING (user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid);

CREATE POLICY "Users can insert their own presentations"
  ON public.presentations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presentations"
  ON public.presentations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presentations"
  ON public.presentations FOR DELETE
  USING (auth.uid() = user_id);

-- slug trigger
CREATE OR REPLACE FUNCTION public.set_presentation_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND NEW.title <> OLD.title AND NEW.slug = OLD.slug) THEN
    base := public.slugify(NEW.title);
    candidate := base;
    WHILE EXISTS (
      SELECT 1 FROM public.presentations
      WHERE user_id = NEW.user_id
        AND subject_id = NEW.subject_id
        AND slug = candidate
        AND id <> NEW.id
    ) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_presentation_slug
BEFORE INSERT OR UPDATE ON public.presentations
FOR EACH ROW EXECUTE FUNCTION public.set_presentation_slug();

CREATE TRIGGER trg_presentations_updated_at
BEFORE UPDATE ON public.presentations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_presentations_subject ON public.presentations(subject_id);
CREATE INDEX idx_presentations_user ON public.presentations(user_id);

-- recycle bin support
ALTER TABLE public.deleted_items ADD COLUMN IF NOT EXISTS presentations_data jsonb;

-- storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('presentations', 'presentations', true, 104857600, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 104857600, allowed_mime_types = ARRAY['application/pdf'];

CREATE POLICY "Public read presentations bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'presentations');

CREATE POLICY "Users upload to own folder presentations"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'presentations'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own folder presentations"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'presentations'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own folder presentations"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'presentations'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
