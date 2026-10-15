-- Lazily provision one Matrix conversation room per published Lume card.
CREATE TABLE IF NOT EXISTS public.lume_discussion_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('post', 'quote')),
  content_id uuid NOT NULL,
  matrix_room_id text NOT NULL UNIQUE,
  matrix_room_alias text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id)
);

ALTER TABLE public.lume_discussion_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lume_discussion_rooms_published_read ON public.lume_discussion_rooms;
CREATE POLICY lume_discussion_rooms_published_read ON public.lume_discussion_rooms
  FOR SELECT USING (
    (content_type = 'post' AND EXISTS (
      SELECT 1 FROM public.lume_posts p
      WHERE p.id = content_id AND p.status = 'published'
    )) OR
    (content_type = 'quote' AND EXISTS (
      SELECT 1 FROM public.faculty_quotes q
      WHERE q.id = content_id AND q.status = 'published'
    ))
  );

GRANT SELECT ON public.lume_discussion_rooms TO anon, authenticated;
COMMENT ON TABLE public.lume_discussion_rooms IS
  'Idempotent mapping from a published Lume card to its lazily-created Matrix discussion room.';
