CREATE TABLE public.topic_margin_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 topic_id uuid NOT NULL,
 user_id uuid NOT NULL,
 text_content text NOT NULL DEFAULT '',
 drawing_content text NOT NULL DEFAULT '',
 anchor_text text NOT NULL DEFAULT '',
 x double precision NOT NULL DEFAULT 0.65,
 y double precision NOT NULL DEFAULT 40,
 page_tab text NOT NULL DEFAULT 'full' CHECK (page_tab IN ('full', 'summary')),
 deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_margin_notes TO authenticated;
GRANT ALL ON public.topic_margin_notes TO service_role;
ALTER TABLE public.topic_margin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members manage margin notes" ON public.topic_margin_notes FOR ALL TO authenticated
 USING ((auth.uid() = user_id OR (user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid AND public.has_role(auth.uid(), 'admin'))) AND EXISTS (SELECT 1 FROM public.topics t WHERE t.id = topic_id AND t.user_id = topic_margin_notes.user_id))
 WITH CHECK ((auth.uid() = user_id OR (user_id = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid AND public.has_role(auth.uid(), 'admin'))) AND EXISTS (SELECT 1 FROM public.topics t WHERE t.id = topic_id AND t.user_id = topic_margin_notes.user_id));
CREATE INDEX topic_margin_notes_topic_idx ON public.topic_margin_notes(topic_id);
CREATE TRIGGER topic_margin_notes_updated_at BEFORE UPDATE ON public.topic_margin_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();