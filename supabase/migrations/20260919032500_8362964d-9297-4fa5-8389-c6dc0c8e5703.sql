DROP POLICY IF EXISTS "Public can view owner subjects" ON public.subjects;
CREATE POLICY "Public can view owner first year subjects"
ON public.subjects FOR SELECT TO anon
USING (user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid AND COALESCE(year, 1) = 1);

DROP POLICY IF EXISTS "Public can view owner chapters" ON public.chapters;
CREATE POLICY "Public can view owner first year chapters"
ON public.chapters FOR SELECT TO anon
USING (
  user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
  AND EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = chapters.subject_id
      AND s.user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
      AND COALESCE(s.year, 1) = 1
  )
);

DROP POLICY IF EXISTS "Public can view owner topics" ON public.topics;
CREATE POLICY "Public can view owner first year topics"
ON public.topics FOR SELECT TO anon
USING (
  user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
  AND EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = topics.subject_id
      AND s.user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
      AND COALESCE(s.year, 1) = 1
  )
);

DROP POLICY IF EXISTS "Public can view owner blocks" ON public.blocks;
CREATE POLICY "Public can view owner first year blocks"
ON public.blocks FOR SELECT TO anon
USING (
  user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
  AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.subjects s ON s.id = t.subject_id
    WHERE t.id = blocks.topic_id
      AND s.user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
      AND COALESCE(s.year, 1) = 1
  )
);

DROP POLICY IF EXISTS "Public can view owner heading nodes" ON public.heading_nodes;
CREATE POLICY "Public can view owner first year heading nodes"
ON public.heading_nodes FOR SELECT TO anon
USING (
  user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
  AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.subjects s ON s.id = t.subject_id
    WHERE t.id = heading_nodes.topic_id
      AND s.user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
      AND COALESCE(s.year, 1) = 1
  )
);

DROP POLICY IF EXISTS "Public can view owner summaries" ON public.summaries;
CREATE POLICY "Public can view owner first year summaries"
ON public.summaries FOR SELECT TO anon
USING (
  user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
  AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.subjects s ON s.id = t.subject_id
    WHERE t.id = summaries.topic_id
      AND s.user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
      AND COALESCE(s.year, 1) = 1
  )
);

DROP POLICY IF EXISTS "Public can view owner mnemonics" ON public.mnemonics;
CREATE POLICY "Public can view owner first year mnemonics"
ON public.mnemonics FOR SELECT TO anon
USING (
  user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
  AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.subjects s ON s.id = t.subject_id
    WHERE t.id = mnemonics.topic_id
      AND s.user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
      AND COALESCE(s.year, 1) = 1
  )
);

DROP POLICY IF EXISTS "Public can view owner presentations" ON public.presentations;
CREATE POLICY "Public can view owner first year presentations"
ON public.presentations FOR SELECT TO anon
USING (
  user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
  AND EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = presentations.subject_id
      AND s.user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid
      AND COALESCE(s.year, 1) = 1
  )
);