-- Create chapters table
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL,
  name TEXT NOT NULL,
  chapter_order INTEGER NOT NULL DEFAULT 0,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_chapter_subject 
    FOREIGN KEY (subject_id) 
    REFERENCES public.subjects(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT unique_chapter_per_subject 
    UNIQUE (subject_id, name, user_id)
);

-- Enable RLS
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapters
CREATE POLICY "Users can view their own chapters"
  ON public.chapters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chapters"
  ON public.chapters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chapters"
  ON public.chapters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chapters"
  ON public.chapters FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX idx_chapters_user_id ON public.chapters(user_id);
CREATE INDEX idx_chapters_order ON public.chapters(subject_id, chapter_order);

-- Trigger for updated_at
CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add chapter_id to topics table (nullable for backward compatibility)
ALTER TABLE public.topics 
ADD COLUMN chapter_id UUID;

-- Add foreign key with SET NULL on delete
ALTER TABLE public.topics
ADD CONSTRAINT fk_topic_chapter
  FOREIGN KEY (chapter_id)
  REFERENCES public.chapters(id)
  ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_topics_chapter_id ON public.topics(chapter_id);

-- Add chapters_data to deleted_items table
ALTER TABLE public.deleted_items
ADD COLUMN chapters_data JSONB;