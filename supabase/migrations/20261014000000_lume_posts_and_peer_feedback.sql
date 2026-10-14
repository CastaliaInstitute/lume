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

ALTER TABLE public.lume_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lume_post_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lume_post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lume_posts_public_read ON public.lume_posts;
CREATE POLICY lume_posts_public_read ON public.lume_posts
  FOR SELECT USING (status = 'published' OR created_by = auth.uid());
DROP POLICY IF EXISTS lume_posts_faculty_insert ON public.lume_posts;
CREATE POLICY lume_posts_faculty_insert ON public.lume_posts
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.lume_caller_is_faculty());
DROP POLICY IF EXISTS lume_posts_faculty_update ON public.lume_posts;
CREATE POLICY lume_posts_faculty_update ON public.lume_posts
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND public.lume_caller_is_faculty())
  WITH CHECK (created_by = auth.uid() AND public.lume_caller_is_faculty());

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
  FOR SELECT USING (true);
DROP POLICY IF EXISTS lume_post_likes_insert ON public.lume_post_likes;
CREATE POLICY lume_post_likes_insert ON public.lume_post_likes
  FOR INSERT TO authenticated WITH CHECK (
    member_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.lume_posts p WHERE p.id = post_id AND p.status = 'published'
    )
  );
DROP POLICY IF EXISTS lume_post_likes_delete ON public.lume_post_likes;
CREATE POLICY lume_post_likes_delete ON public.lume_post_likes
  FOR DELETE TO authenticated USING (member_id = auth.uid());

CREATE OR REPLACE VIEW public.lume_post_like_counts AS
SELECT p.id AS post_id, count(l.member_id)::integer AS like_count
FROM public.lume_posts p LEFT JOIN public.lume_post_likes l ON l.post_id = p.id
WHERE p.status = 'published'
GROUP BY p.id;

COMMENT ON TABLE public.lume_posts IS
  'Short faculty-authored Lume essays/reflections that can combine sourced faculty passages into a video-feed card.';
COMMENT ON TABLE public.lume_post_sources IS
  'Ordered quotations from faculty_quotes that support a faculty-authored Lume post.';
COMMENT ON TABLE public.lume_post_likes IS
  'Peer and member likes on published Lume posts; signals for curation and future generation review.';
