ALTER TABLE public.topic_margin_notes
  ADD COLUMN width numeric,
  ADD COLUMN height numeric,
  ADD COLUMN pin_x numeric,
  ADD COLUMN pin_y numeric;

COMMENT ON COLUMN public.topic_margin_notes.width IS 'User-resized card width in px (null = default 390)';
COMMENT ON COLUMN public.topic_margin_notes.height IS 'User-resized card body height in px (null = default)';
COMMENT ON COLUMN public.topic_margin_notes.pin_x IS 'Horizontal fraction of the closed pin badge (null = right margin edge)';
COMMENT ON COLUMN public.topic_margin_notes.pin_y IS 'Vertical page offset of the closed pin badge (null = note y)';