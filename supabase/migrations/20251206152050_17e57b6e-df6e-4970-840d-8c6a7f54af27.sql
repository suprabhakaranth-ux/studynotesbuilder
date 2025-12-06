-- Add studied column to chapters table
ALTER TABLE public.chapters ADD COLUMN studied boolean NOT NULL DEFAULT false;