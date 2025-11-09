-- Create topics table
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create blocks table
CREATE TABLE public.blocks (
  id TEXT PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  content TEXT DEFAULT '',
  headings JSONB DEFAULT '[]'::jsonb,
  block_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create summaries table
CREATE TABLE public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(topic_id)
);

-- Create mnemonics table
CREATE TABLE public.mnemonics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(topic_id)
);

-- Create heading_nodes table
CREATE TABLE public.heading_nodes (
  id TEXT PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  parent_id TEXT REFERENCES public.heading_nodes(id) ON DELETE CASCADE,
  node_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mnemonics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heading_nodes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for topics
CREATE POLICY "Users can view their own topics"
  ON public.topics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own topics"
  ON public.topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own topics"
  ON public.topics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own topics"
  ON public.topics FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for blocks
CREATE POLICY "Users can view their own blocks"
  ON public.blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blocks"
  ON public.blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blocks"
  ON public.blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blocks"
  ON public.blocks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for summaries
CREATE POLICY "Users can view their own summaries"
  ON public.summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own summaries"
  ON public.summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summaries"
  ON public.summaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own summaries"
  ON public.summaries FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for mnemonics
CREATE POLICY "Users can view their own mnemonics"
  ON public.mnemonics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mnemonics"
  ON public.mnemonics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mnemonics"
  ON public.mnemonics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mnemonics"
  ON public.mnemonics FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for heading_nodes
CREATE POLICY "Users can view their own heading nodes"
  ON public.heading_nodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own heading nodes"
  ON public.heading_nodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own heading nodes"
  ON public.heading_nodes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own heading nodes"
  ON public.heading_nodes FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_blocks_topic_id ON public.blocks(topic_id);
CREATE INDEX idx_blocks_user_id ON public.blocks(user_id);
CREATE INDEX idx_summaries_topic_id ON public.summaries(topic_id);
CREATE INDEX idx_mnemonics_topic_id ON public.mnemonics(topic_id);
CREATE INDEX idx_heading_nodes_topic_id ON public.heading_nodes(topic_id);
CREATE INDEX idx_heading_nodes_parent_id ON public.heading_nodes(parent_id);

-- Trigger for updating topics updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at
  BEFORE UPDATE ON public.summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mnemonics_updated_at
  BEFORE UPDATE ON public.mnemonics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();