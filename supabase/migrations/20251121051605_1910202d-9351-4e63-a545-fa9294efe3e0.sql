-- Add studied column to topics table
ALTER TABLE public.topics 
ADD COLUMN studied boolean NOT NULL DEFAULT false;

-- Add index on studied for efficient filtering
CREATE INDEX idx_topics_studied ON public.topics(studied);