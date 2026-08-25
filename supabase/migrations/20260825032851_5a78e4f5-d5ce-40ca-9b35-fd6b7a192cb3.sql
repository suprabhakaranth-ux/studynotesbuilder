ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS year integer NOT NULL DEFAULT 1;
UPDATE public.subjects SET year = 1 WHERE year IS NULL;
CREATE INDEX IF NOT EXISTS idx_subjects_year ON public.subjects(year);