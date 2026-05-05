
-- Slugify helper
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  s := lower(input);
  s := unaccent(s);
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  IF s = '' OR s IS NULL THEN s := 'item'; END IF;
  RETURN s;
END;
$$;

-- unaccent extension fallback (skip if not available)
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS unaccent;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Re-create slugify without unaccent if extension missing
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  s := lower(input);
  BEGIN
    s := public.unaccent(s);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  IF s = '' OR s IS NULL THEN s := 'item'; END IF;
  RETURN s;
END;
$$;

-- Add columns
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.topics   ADD COLUMN IF NOT EXISTS slug text;

-- Subjects unique slug generator (per user)
CREATE OR REPLACE FUNCTION public.set_subject_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND NEW.name <> OLD.name AND NEW.slug = OLD.slug) THEN
    base := public.slugify(NEW.name);
    candidate := base;
    WHILE EXISTS (
      SELECT 1 FROM public.subjects
      WHERE user_id = NEW.user_id AND slug = candidate AND id <> NEW.id
    ) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subjects_set_slug ON public.subjects;
CREATE TRIGGER subjects_set_slug
BEFORE INSERT OR UPDATE OF name, slug ON public.subjects
FOR EACH ROW EXECUTE FUNCTION public.set_subject_slug();

-- Chapters unique slug generator (per user + subject)
CREATE OR REPLACE FUNCTION public.set_chapter_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND NEW.name <> OLD.name AND NEW.slug = OLD.slug) THEN
    base := public.slugify(NEW.name);
    candidate := base;
    WHILE EXISTS (
      SELECT 1 FROM public.chapters
      WHERE user_id = NEW.user_id AND subject_id = NEW.subject_id AND slug = candidate AND id <> NEW.id
    ) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chapters_set_slug ON public.chapters;
CREATE TRIGGER chapters_set_slug
BEFORE INSERT OR UPDATE OF name, slug ON public.chapters
FOR EACH ROW EXECUTE FUNCTION public.set_chapter_slug();

-- Topics unique slug generator (per user + subject + chapter)
CREATE OR REPLACE FUNCTION public.set_topic_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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
      SELECT 1 FROM public.topics
      WHERE user_id = NEW.user_id
        AND COALESCE(subject_id::text,'-') = COALESCE(NEW.subject_id::text,'-')
        AND COALESCE(chapter_id::text,'-') = COALESCE(NEW.chapter_id::text,'-')
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

DROP TRIGGER IF EXISTS topics_set_slug ON public.topics;
CREATE TRIGGER topics_set_slug
BEFORE INSERT OR UPDATE OF title, slug ON public.topics
FOR EACH ROW EXECUTE FUNCTION public.set_topic_slug();

-- Backfill existing rows (trigger fires because slug is null)
UPDATE public.subjects SET slug = NULL WHERE slug IS NULL;
UPDATE public.subjects SET name = name WHERE slug IS NULL OR slug = '';
UPDATE public.chapters SET name = name WHERE slug IS NULL OR slug = '';
UPDATE public.topics   SET title = title WHERE slug IS NULL OR slug = '';

-- Indexes for fast slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS subjects_user_slug_uniq
  ON public.subjects(user_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS chapters_user_subject_slug_uniq
  ON public.chapters(user_id, subject_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS topics_user_scope_slug_uniq
  ON public.topics(user_id, COALESCE(subject_id::text,'-'), COALESCE(chapter_id::text,'-'), slug);
