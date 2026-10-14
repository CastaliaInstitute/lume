-- Faculty-authored Lume posts, their source passages, and peer review signals.
-- Apply to the Castalia Supabase project before enabling authenticated publishing.
CREATE TABLE IF NOT EXISTS public.lume_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id text NOT NULL REFERENCES public.faculty (id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text,
  body text NOT NULL,
  visual_prompt text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_lume_posts_published
  ON public.lume_posts (published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_lume_posts_faculty
  ON public.lume_posts (faculty_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.lume_post_sources (
  post_id uuid NOT NULL REFERENCES public.lume_posts (id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.faculty_quotes (id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, quote_id)
);

CREATE TABLE IF NOT EXISTS public.lume_post_likes (
  post_id uuid NOT NULL REFERENCES public.lume_posts (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.lume_peer_reviews (
  post_id uuid NOT NULL REFERENCES public.lume_posts (id) ON DELETE CASCADE,
  faculty_member_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  liked boolean NOT NULL DEFAULT false,
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, faculty_member_id),
  CHECK (review IS NULL OR char_length(review) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_lume_post_likes_post_id
  ON public.lume_post_likes (post_id);

CREATE OR REPLACE FUNCTION public.lume_caller_is_faculty()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.roles && ARRAY['faculty', 'admin']::text[]
  );
$$;

CREATE OR REPLACE FUNCTION public.lume_caller_authorized_for_faculty(p_faculty_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND 'admin' = ANY(coalesce(p.roles, '{}'))
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.faculty f ON lower(btrim(f.name)) = lower(btrim(p.display_name))
    WHERE p.id = auth.uid()
      AND f.id = p_faculty_id
      AND 'faculty' = ANY(coalesce(p.roles, '{}'))
  );
$$;

CREATE OR REPLACE FUNCTION public.lume_caller_matches_faculty(p_faculty_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.faculty f ON lower(btrim(f.name)) = lower(btrim(p.display_name))
    WHERE p.id = auth.uid() AND f.id = p_faculty_id
      AND 'faculty' = ANY(coalesce(p.roles, '{}'))
  );
$$;

ALTER TABLE public.lume_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lume_post_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lume_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lume_peer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lume_posts_public_read ON public.lume_posts;
CREATE POLICY lume_posts_public_read ON public.lume_posts
  FOR SELECT USING (status = 'published' OR created_by = auth.uid());
DROP POLICY IF EXISTS lume_posts_faculty_insert ON public.lume_posts;
CREATE POLICY lume_posts_faculty_insert ON public.lume_posts
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.lume_caller_authorized_for_faculty(faculty_id));
DROP POLICY IF EXISTS lume_posts_faculty_update ON public.lume_posts;
CREATE POLICY lume_posts_faculty_update ON public.lume_posts
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND public.lume_caller_authorized_for_faculty(faculty_id))
  WITH CHECK (created_by = auth.uid() AND public.lume_caller_authorized_for_faculty(faculty_id));

CREATE TABLE IF NOT EXISTS public.lume_quote_likes (
  quote_id uuid NOT NULL REFERENCES public.faculty_quotes (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (quote_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.lume_reader_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.faculty_quotes (id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.lume_posts (id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'impression', 'dwell', 'complete', 'skip', 'like', 'unlike', 'save',
    'unsave', 'share', 'source_open', 'not_interested'
  )),
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((quote_id IS NULL) <> (post_id IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_lume_reader_events_member_created
  ON public.lume_reader_events (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lume_reader_events_tags
  ON public.lume_reader_events USING GIN (tags);

CREATE TABLE IF NOT EXISTS public.lume_quote_peer_reviews (
  quote_id uuid NOT NULL REFERENCES public.faculty_quotes (id) ON DELETE CASCADE,
  faculty_member_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  liked boolean NOT NULL DEFAULT false,
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (quote_id, faculty_member_id),
  CHECK (review IS NULL OR char_length(review) <= 2000)
);

ALTER TABLE public.lume_quote_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lume_reader_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lume_quote_peer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lume_quote_likes_select_own ON public.lume_quote_likes;
CREATE POLICY lume_quote_likes_select_own ON public.lume_quote_likes
  FOR SELECT TO authenticated USING (member_id = auth.uid());
DROP POLICY IF EXISTS lume_quote_likes_insert_own ON public.lume_quote_likes;
CREATE POLICY lume_quote_likes_insert_own ON public.lume_quote_likes
  FOR INSERT TO authenticated WITH CHECK (
    member_id = auth.uid() AND NOT public.lume_caller_is_faculty()
  );
DROP POLICY IF EXISTS lume_quote_likes_delete_own ON public.lume_quote_likes;
CREATE POLICY lume_quote_likes_delete_own ON public.lume_quote_likes
  FOR DELETE TO authenticated USING (member_id = auth.uid());

DROP POLICY IF EXISTS lume_reader_events_select_own ON public.lume_reader_events;
CREATE POLICY lume_reader_events_select_own ON public.lume_reader_events
  FOR SELECT TO authenticated USING (member_id = auth.uid());
DROP POLICY IF EXISTS lume_reader_events_insert_own ON public.lume_reader_events;
CREATE POLICY lume_reader_events_insert_own ON public.lume_reader_events
  FOR INSERT TO authenticated WITH CHECK (member_id = auth.uid());
DROP POLICY IF EXISTS lume_reader_events_delete_own ON public.lume_reader_events;
CREATE POLICY lume_reader_events_delete_own ON public.lume_reader_events
  FOR DELETE TO authenticated USING (member_id = auth.uid());

DROP POLICY IF EXISTS lume_quote_peer_reviews_select_faculty ON public.lume_quote_peer_reviews;
CREATE POLICY lume_quote_peer_reviews_select_faculty ON public.lume_quote_peer_reviews
  FOR SELECT TO authenticated USING (public.lume_caller_is_faculty());
DROP POLICY IF EXISTS lume_quote_peer_reviews_insert_faculty ON public.lume_quote_peer_reviews;
CREATE POLICY lume_quote_peer_reviews_insert_faculty ON public.lume_quote_peer_reviews
  FOR INSERT TO authenticated WITH CHECK (
    faculty_member_id = auth.uid() AND public.lume_caller_is_faculty() AND EXISTS (
      SELECT 1 FROM public.faculty_quotes q
      WHERE q.id = quote_id AND NOT public.lume_caller_matches_faculty(q.faculty_id)
    )
  );
DROP POLICY IF EXISTS lume_quote_peer_reviews_update_faculty ON public.lume_quote_peer_reviews;
CREATE POLICY lume_quote_peer_reviews_update_faculty ON public.lume_quote_peer_reviews
  FOR UPDATE TO authenticated USING (
    faculty_member_id = auth.uid() AND public.lume_caller_is_faculty() AND EXISTS (
      SELECT 1 FROM public.faculty_quotes q
      WHERE q.id = quote_id AND NOT public.lume_caller_matches_faculty(q.faculty_id)
    )
  ) WITH CHECK (
    faculty_member_id = auth.uid() AND public.lume_caller_is_faculty() AND EXISTS (
      SELECT 1 FROM public.faculty_quotes q
      WHERE q.id = quote_id AND NOT public.lume_caller_matches_faculty(q.faculty_id)
    )
  );

CREATE OR REPLACE VIEW public.lume_quote_like_counts AS
SELECT q.id AS quote_id, count(l.member_id)::integer AS like_count
FROM public.faculty_quotes q LEFT JOIN public.lume_quote_likes l ON l.quote_id = q.id
WHERE q.status = 'published'
GROUP BY q.id;
GRANT SELECT ON public.lume_quote_like_counts TO anon, authenticated;

DROP POLICY IF EXISTS lume_post_sources_public_read ON public.lume_post_sources;
CREATE POLICY lume_post_sources_public_read ON public.lume_post_sources
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.lume_posts p WHERE p.id = post_id AND p.status = 'published'
  ));
DROP POLICY IF EXISTS lume_post_sources_faculty_manage ON public.lume_post_sources;
CREATE POLICY lume_post_sources_faculty_manage ON public.lume_post_sources
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lume_posts p WHERE p.id = post_id AND p.created_by = auth.uid() AND public.lume_caller_is_faculty()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lume_posts p WHERE p.id = post_id AND p.created_by = auth.uid() AND public.lume_caller_is_faculty()));

DROP POLICY IF EXISTS lume_post_likes_read ON public.lume_post_likes;
CREATE POLICY lume_post_likes_read ON public.lume_post_likes
  FOR SELECT TO authenticated USING (member_id = auth.uid());
DROP POLICY IF EXISTS lume_post_likes_insert ON public.lume_post_likes;
CREATE POLICY lume_post_likes_insert ON public.lume_post_likes
  FOR INSERT TO authenticated WITH CHECK (
    member_id = auth.uid() AND NOT public.lume_caller_is_faculty() AND EXISTS (
      SELECT 1 FROM public.lume_posts p WHERE p.id = post_id AND p.status = 'published'
    )
  );
DROP POLICY IF EXISTS lume_post_likes_delete ON public.lume_post_likes;
CREATE POLICY lume_post_likes_delete ON public.lume_post_likes
  FOR DELETE TO authenticated USING (member_id = auth.uid());

DROP POLICY IF EXISTS lume_peer_reviews_read ON public.lume_peer_reviews;
CREATE POLICY lume_peer_reviews_read ON public.lume_peer_reviews
  FOR SELECT USING (public.lume_caller_is_faculty());
DROP POLICY IF EXISTS lume_peer_reviews_write ON public.lume_peer_reviews;
CREATE POLICY lume_peer_reviews_write ON public.lume_peer_reviews
  FOR INSERT TO authenticated WITH CHECK (
    faculty_member_id = auth.uid() AND public.lume_caller_is_faculty() AND EXISTS (
      SELECT 1 FROM public.lume_posts p WHERE p.id = post_id AND p.status = 'published' AND p.created_by <> auth.uid()
    )
  );
DROP POLICY IF EXISTS lume_peer_reviews_update ON public.lume_peer_reviews;
CREATE POLICY lume_peer_reviews_update ON public.lume_peer_reviews
  FOR UPDATE TO authenticated USING (
    faculty_member_id = auth.uid() AND public.lume_caller_is_faculty() AND EXISTS (
      SELECT 1 FROM public.lume_posts p WHERE p.id = post_id AND p.status = 'published' AND p.created_by <> auth.uid()
    )
  ) WITH CHECK (
    faculty_member_id = auth.uid() AND public.lume_caller_is_faculty() AND EXISTS (
      SELECT 1 FROM public.lume_posts p WHERE p.id = post_id AND p.status = 'published' AND p.created_by <> auth.uid()
    )
  );
DROP POLICY IF EXISTS lume_peer_reviews_delete ON public.lume_peer_reviews;
CREATE POLICY lume_peer_reviews_delete ON public.lume_peer_reviews
  FOR DELETE TO authenticated USING (
    faculty_member_id = auth.uid() AND public.lume_caller_is_faculty() AND EXISTS (
      SELECT 1 FROM public.lume_posts p WHERE p.id = post_id AND p.created_by <> auth.uid()
    )
  );

CREATE OR REPLACE VIEW public.lume_post_like_counts AS
SELECT p.id AS post_id, count(l.member_id)::integer AS like_count
FROM public.lume_posts p LEFT JOIN public.lume_post_likes l ON l.post_id = p.id
WHERE p.status = 'published'
GROUP BY p.id;
GRANT SELECT ON public.lume_post_like_counts TO anon, authenticated;
GRANT SELECT ON public.lume_posts, public.lume_post_sources TO anon, authenticated;
GRANT INSERT, UPDATE ON public.lume_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lume_post_sources TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.lume_post_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lume_peer_reviews TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.lume_reader_events TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.lume_quote_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lume_quote_peer_reviews TO authenticated;

COMMENT ON TABLE public.lume_posts IS
  'Short faculty-authored Lume essays/reflections that can combine sourced faculty passages into a video-feed card.';
COMMENT ON TABLE public.lume_post_sources IS
  'Ordered quotations from faculty_quotes that support a faculty-authored Lume post.';
COMMENT ON TABLE public.lume_post_likes IS
  'Authenticated reader likes on published Lume posts; member preference signal for personalization.';
COMMENT ON TABLE public.lume_peer_reviews IS
  'Separate faculty-only likes and written reviews on colleagues’ published Lume posts; editorial signal, not member-preference training data.';
COMMENT ON TABLE public.lume_reader_events IS
  'Authenticated member reading and preference signals. Faculty peer reviews are stored separately and never enter this table.';
COMMENT ON TABLE public.lume_quote_peer_reviews IS
  'Faculty-only peer likes and review notes on quote-based Lume cards; excluded from reader recommendation signals.';
