CREATE TABLE public.topic_presentation_links (
 topic_id uuid NOT NULL,
 presentation_id uuid NOT NULL,
 user_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (topic_id, presentation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_presentation_links TO authenticated;
GRANT ALL ON public.topic_presentation_links TO service_role;
ALTER TABLE public.topic_presentation_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace topic presentation links" ON public.topic_presentation_links FOR ALL TO authenticated
USING (public.can_edit_workspace(user_id) AND EXISTS (SELECT 1 FROM public.topics t WHERE t.id = topic_id AND t.user_id = topic_presentation_links.user_id))
WITH CHECK (public.can_edit_workspace(user_id) AND EXISTS (SELECT 1 FROM public.topics t JOIN public.presentations p ON p.id = presentation_id AND p.subject_id = t.subject_id AND p.user_id = t.user_id WHERE t.id = topic_id AND t.user_id = topic_presentation_links.user_id));
CREATE INDEX topic_presentation_links_owner_idx ON public.topic_presentation_links(user_id);