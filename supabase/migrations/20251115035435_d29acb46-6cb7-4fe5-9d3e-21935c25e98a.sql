-- Create deleted_items table for soft deletion with full data snapshots
CREATE TABLE public.deleted_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('subject', 'topic')),
  item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- JSONB columns to store complete snapshots for restoration
  subject_data JSONB,
  topic_data JSONB,
  blocks_data JSONB,
  heading_nodes_data JSONB,
  summaries_data JSONB,
  mnemonics_data JSONB,
  
  -- Ensure one entry per item
  UNIQUE(user_id, item_type, item_id)
);

-- Enable RLS
ALTER TABLE public.deleted_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deleted_items
CREATE POLICY "Users can view their own deleted items"
  ON public.deleted_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deleted items"
  ON public.deleted_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deleted items"
  ON public.deleted_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_deleted_items_user_type ON public.deleted_items(user_id, item_type);
CREATE INDEX idx_deleted_items_deleted_at ON public.deleted_items(deleted_at DESC);