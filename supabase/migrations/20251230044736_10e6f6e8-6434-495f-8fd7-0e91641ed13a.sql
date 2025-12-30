-- Add RLS policies for anonymous public read access to owner's content
-- User ID: b6dc6569-25ba-4ea0-a7bf-607219aa8daf

-- Subjects - allow public read
CREATE POLICY "Public can view owner subjects"
ON public.subjects FOR SELECT
TO anon
USING (user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid);

-- Chapters - allow public read
CREATE POLICY "Public can view owner chapters"
ON public.chapters FOR SELECT
TO anon
USING (user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid);

-- Topics - allow public read
CREATE POLICY "Public can view owner topics"
ON public.topics FOR SELECT
TO anon
USING (user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid);

-- Blocks - allow public read
CREATE POLICY "Public can view owner blocks"
ON public.blocks FOR SELECT
TO anon
USING (user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid);

-- Heading nodes - allow public read
CREATE POLICY "Public can view owner heading nodes"
ON public.heading_nodes FOR SELECT
TO anon
USING (user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid);

-- Summaries - allow public read
CREATE POLICY "Public can view owner summaries"
ON public.summaries FOR SELECT
TO anon
USING (user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid);

-- Mnemonics - allow public read
CREATE POLICY "Public can view owner mnemonics"
ON public.mnemonics FOR SELECT
TO anon
USING (user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid);