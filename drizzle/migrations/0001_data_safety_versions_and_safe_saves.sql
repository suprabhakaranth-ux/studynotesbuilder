CREATE OR REPLACE FUNCTION public.can_edit_workspace(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    auth.uid() = _owner
    OR (_owner = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'::uuid AND public.has_role(auth.uid(), 'admin'))
  )
$$;

CREATE TABLE public.topic_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  mnemonic text,
  heading_nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  word_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX topic_versions_topic_idx ON public.topic_versions(topic_id, created_at DESC);
GRANT SELECT ON public.topic_versions TO authenticated;
GRANT ALL ON public.topic_versions TO service_role;
ALTER TABLE public.topic_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace editors can view versions" ON public.topic_versions
  FOR SELECT TO authenticated USING (public.can_edit_workspace(user_id));

CREATE OR REPLACE FUNCTION public.html_word_count(_html text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(array_length(regexp_split_to_array(NULLIF(btrim(regexp_replace(regexp_replace(COALESCE(_html,''), '<[^>]*>', ' ', 'g'), '&nbsp;|\s+', ' ', 'g')), ''), ' '), 1), 0)
$$;

CREATE OR REPLACE FUNCTION public.save_topic(
  _topic_id uuid, _blocks jsonb, _summary text, _mnemonic text, _heading_nodes jsonb, _allow_empty boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _owner uuid;
  cur_blocks jsonb; cur_summary text; cur_mnemonic text; cur_hn jsonb;
  cur_words int; new_words int; cur_has_content boolean; new_has_content boolean;
BEGIN
  SELECT user_id INTO _owner FROM topics WHERE id = _topic_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Topic not found'; END IF;
  IF NOT public.can_edit_workspace(_owner) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'type',type,'content',content,'headings',headings) ORDER BY block_order), '[]'::jsonb)
    INTO cur_blocks FROM blocks WHERE topic_id = _topic_id;
  SELECT content INTO cur_summary FROM summaries WHERE topic_id = _topic_id;
  SELECT content INTO cur_mnemonic FROM mnemonics WHERE topic_id = _topic_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'title',title,'notes',notes,'parent_id',parent_id,'node_order',node_order) ORDER BY created_at, node_order), '[]'::jsonb)
    INTO cur_hn FROM heading_nodes WHERE topic_id = _topic_id;

  SELECT COALESCE(sum(public.html_word_count(b->>'content')) FILTER (WHERE b->>'type' <> 'drawing'), 0)::int,
         bool_or(CASE WHEN b->>'type' = 'drawing' THEN COALESCE(b->>'content','') <> '' ELSE public.html_word_count(b->>'content') > 0 END)
    INTO cur_words, cur_has_content FROM jsonb_array_elements(cur_blocks) b;
  SELECT COALESCE(sum(public.html_word_count(b->>'content')) FILTER (WHERE b->>'type' <> 'drawing'), 0)::int,
         bool_or(CASE WHEN b->>'type' = 'drawing' THEN COALESCE(b->>'content','') <> '' ELSE public.html_word_count(b->>'content') > 0 END)
    INTO new_words, new_has_content FROM jsonb_array_elements(COALESCE(_blocks,'[]'::jsonb)) b;
  cur_has_content := COALESCE(cur_has_content, false) OR public.html_word_count(cur_summary) > 0;
  new_has_content := COALESCE(new_has_content, false) OR public.html_word_count(_summary) > 0;

  IF cur_has_content AND NOT new_has_content AND NOT _allow_empty THEN
    RAISE EXCEPTION 'BLANK_OVERWRITE_BLOCKED: refusing to replace existing notes with an empty page';
  END IF;

  -- Keep a version of the previous content when it changes.
  IF cur_has_content AND (
       cur_blocks IS DISTINCT FROM (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',b->>'id','type',b->>'type','content',b->>'content','headings',COALESCE(b->'headings','[]'::jsonb)) ORDER BY o), '[]'::jsonb) FROM jsonb_array_elements(COALESCE(_blocks,'[]'::jsonb)) WITH ORDINALITY x(b,o))
       OR COALESCE(cur_summary,'') <> COALESCE(_summary,'') OR COALESCE(cur_mnemonic,'') <> COALESCE(_mnemonic,'')) THEN
    INSERT INTO topic_versions(topic_id, user_id, blocks, summary, mnemonic, heading_nodes, word_count)
      VALUES (_topic_id, _owner, cur_blocks, cur_summary, cur_mnemonic, cur_hn, cur_words);
    DELETE FROM topic_versions WHERE topic_id = _topic_id AND id NOT IN (
      SELECT id FROM topic_versions WHERE topic_id = _topic_id ORDER BY created_at DESC LIMIT 2);
  END IF;

  DELETE FROM blocks WHERE topic_id = _topic_id;
  INSERT INTO blocks(id, topic_id, user_id, type, content, headings, block_order)
    SELECT b->>'id', _topic_id, _owner, b->>'type', b->>'content', COALESCE(b->'headings','[]'::jsonb), (o - 1)::int
    FROM jsonb_array_elements(COALESCE(_blocks,'[]'::jsonb)) WITH ORDINALITY x(b,o);

  INSERT INTO summaries(topic_id, user_id, content) VALUES (_topic_id, _owner, _summary)
    ON CONFLICT (topic_id) DO UPDATE SET content = EXCLUDED.content;
  INSERT INTO mnemonics(topic_id, user_id, content) VALUES (_topic_id, _owner, _mnemonic)
    ON CONFLICT (topic_id) DO UPDATE SET content = EXCLUDED.content;

  DELETE FROM heading_nodes WHERE topic_id = _topic_id;
  INSERT INTO heading_nodes(id, topic_id, user_id, title, notes, parent_id, node_order)
    SELECT h->>'id', _topic_id, _owner, h->>'title', h->>'notes', h->>'parent_id', (h->>'node_order')::int
    FROM jsonb_array_elements(COALESCE(_heading_nodes,'[]'::jsonb)) WITH ORDINALITY x(h,o) ORDER BY o;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_topic_version(_version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v topic_versions;
BEGIN
  SELECT * INTO v FROM topic_versions WHERE id = _version_id;
  IF v.id IS NULL THEN RAISE EXCEPTION 'Version not found'; END IF;
  IF NOT public.can_edit_workspace(v.user_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  PERFORM public.save_topic(v.topic_id, v.blocks, v.summary, v.mnemonic, v.heading_nodes, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_topic(_topic_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t topics;
BEGIN
  SELECT * INTO t FROM topics WHERE id = _topic_id;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Topic not found'; END IF;
  IF NOT public.can_edit_workspace(t.user_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO deleted_items(user_id, item_type, item_id, item_name, topic_data, blocks_data, heading_nodes_data, summaries_data, mnemonics_data)
  VALUES (t.user_id, 'topic', t.id, t.title, to_jsonb(t),
    (SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]') FROM blocks b WHERE topic_id = t.id),
    (SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.created_at), '[]') FROM heading_nodes h WHERE topic_id = t.id),
    (SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]') FROM summaries s WHERE topic_id = t.id),
    (SELECT COALESCE(jsonb_agg(to_jsonb(m)), '[]') FROM mnemonics m WHERE topic_id = t.id));
  DELETE FROM heading_nodes WHERE topic_id = t.id AND parent_id IS NOT NULL;
  DELETE FROM heading_nodes WHERE topic_id = t.id;
  DELETE FROM blocks WHERE topic_id = t.id;
  DELETE FROM summaries WHERE topic_id = t.id;
  DELETE FROM mnemonics WHERE topic_id = t.id;
  DELETE FROM topics WHERE id = t.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_subject(_subject_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s subjects; ids uuid[];
BEGIN
  SELECT * INTO s FROM subjects WHERE id = _subject_id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Subject not found'; END IF;
  IF NOT public.can_edit_workspace(s.user_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT COALESCE(array_agg(id), '{}') INTO ids FROM topics WHERE subject_id = s.id;
  INSERT INTO deleted_items(user_id, item_type, item_id, item_name, subject_data, chapters_data, topic_data, blocks_data, heading_nodes_data, summaries_data, mnemonics_data)
  VALUES (s.user_id, 'subject', s.id, s.name, to_jsonb(s),
    (SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]') FROM chapters c WHERE subject_id = s.id),
    (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]') FROM topics t WHERE id = ANY(ids)),
    (SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]') FROM blocks b WHERE topic_id = ANY(ids)),
    (SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.created_at), '[]') FROM heading_nodes h WHERE topic_id = ANY(ids)),
    (SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]') FROM summaries x WHERE topic_id = ANY(ids)),
    (SELECT COALESCE(jsonb_agg(to_jsonb(m)), '[]') FROM mnemonics m WHERE topic_id = ANY(ids)));
  DELETE FROM heading_nodes WHERE topic_id = ANY(ids) AND parent_id IS NOT NULL;
  DELETE FROM heading_nodes WHERE topic_id = ANY(ids);
  DELETE FROM blocks WHERE topic_id = ANY(ids);
  DELETE FROM summaries WHERE topic_id = ANY(ids);
  DELETE FROM mnemonics WHERE topic_id = ANY(ids);
  DELETE FROM topics WHERE id = ANY(ids);
  DELETE FROM chapters WHERE subject_id = s.id;
  DELETE FROM subjects WHERE id = s.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_deleted_item(_deleted_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d deleted_items;
BEGIN
  SELECT * INTO d FROM deleted_items WHERE id = _deleted_id;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF NOT public.can_edit_workspace(d.user_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF d.item_type = 'subject' THEN
    IF EXISTS (SELECT 1 FROM subjects WHERE id = d.item_id) THEN RAISE EXCEPTION 'This subject already exists'; END IF;
    INSERT INTO subjects SELECT * FROM jsonb_populate_record(NULL::subjects, d.subject_data);
    INSERT INTO chapters SELECT * FROM jsonb_populate_recordset(NULL::chapters, COALESCE(d.chapters_data,'[]'));
    INSERT INTO topics SELECT * FROM jsonb_populate_recordset(NULL::topics, COALESCE(d.topic_data,'[]'));
  ELSIF d.item_type = 'topic' THEN
    IF EXISTS (SELECT 1 FROM topics WHERE id = d.item_id) THEN RAISE EXCEPTION 'This topic already exists'; END IF;
    IF NOT EXISTS (SELECT 1 FROM subjects WHERE id = (d.topic_data->>'subject_id')::uuid) THEN
      RAISE EXCEPTION 'Its subject no longer exists. Restore the subject first.'; END IF;
    INSERT INTO topics SELECT * FROM jsonb_populate_record(NULL::topics,
      CASE WHEN (d.topic_data->>'chapter_id') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM chapters WHERE id = (d.topic_data->>'chapter_id')::uuid)
        THEN d.topic_data || '{"chapter_id":null}'::jsonb ELSE d.topic_data END);
  ELSIF d.item_type = 'chapter' THEN
    IF jsonb_typeof(d.chapters_data) = 'object' THEN
      INSERT INTO chapters SELECT * FROM jsonb_populate_record(NULL::chapters, d.chapters_data);
    END IF;
    IF d.topic_data IS NOT NULL AND jsonb_typeof(d.topic_data) = 'array' THEN
      UPDATE topics SET chapter_id = d.item_id WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(d.topic_data) x) AND chapter_id IS NULL;
    END IF;
    DELETE FROM deleted_items WHERE id = d.id;
    RETURN;
  ELSE
    RAISE EXCEPTION 'Unsupported item type';
  END IF;
  INSERT INTO blocks SELECT * FROM jsonb_populate_recordset(NULL::blocks, COALESCE(d.blocks_data,'[]'));
  INSERT INTO heading_nodes SELECT * FROM jsonb_populate_recordset(NULL::heading_nodes, COALESCE(d.heading_nodes_data,'[]')) ORDER BY (parent_id IS NOT NULL);
  INSERT INTO summaries SELECT * FROM jsonb_populate_recordset(NULL::summaries, COALESCE(d.summaries_data,'[]')) ON CONFLICT (topic_id) DO NOTHING;
  INSERT INTO mnemonics SELECT * FROM jsonb_populate_recordset(NULL::mnemonics, COALESCE(d.mnemonics_data,'[]')) ON CONFLICT (topic_id) DO NOTHING;
  DELETE FROM deleted_items WHERE id = d.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_topic(uuid, jsonb, text, text, jsonb, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_topic_version(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_topic(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_subject(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_deleted_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_topic(uuid, jsonb, text, text, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_topic_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_topic(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_subject(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_deleted_item(uuid) TO authenticated;