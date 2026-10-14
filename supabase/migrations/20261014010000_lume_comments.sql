-- Reader comments on published quote cards and faculty-authored Lume posts.
CREATE TABLE IF NOT EXISTS public.lume_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.faculty_quotes (id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.lume_posts (id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Castalia member',
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((quote_id IS NULL) <> (post_id IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_lume_comments_quote_created
  ON public.lume_comments (quote_id, created_at DESC) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lume_comments_post_created
  ON public.lume_comments (post_id, created_at DESC) WHERE post_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.lume_set_comment_author_name()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.author_id := auth.uid();
  NEW.author_name := coalesce(
    (SELECT nullif(btrim(p.display_name), '') FROM public.profiles p WHERE p.id = auth.uid()),
    'Castalia member'
  );
  NEW.body := btrim(NEW.body);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lume_comments_set_author ON public.lume_comments;
CREATE TRIGGER lume_comments_set_author
  BEFORE INSERT ON public.lume_comments
  FOR EACH ROW EXECUTE FUNCTION public.lume_set_comment_author_name();

ALTER TABLE public.lume_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lume_comments_public_read ON public.lume_comments;
CREATE POLICY lume_comments_public_read ON public.lume_comments
  FOR SELECT USING (
    (quote_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.faculty_quotes q WHERE q.id = quote_id AND q.status = 'published'
    )) OR
    (post_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lume_posts p WHERE p.id = post_id AND p.status = 'published'
    ))
  );

DROP POLICY IF EXISTS lume_comments_member_insert ON public.lume_comments;
CREATE POLICY lume_comments_member_insert ON public.lume_comments
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid() AND (
      (quote_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.faculty_quotes q WHERE q.id = quote_id AND q.status = 'published'
      )) OR
      (post_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.lume_posts p WHERE p.id = post_id AND p.status = 'published'
      ))
    )
  );

DROP POLICY IF EXISTS lume_comments_author_delete ON public.lume_comments;
CREATE POLICY lume_comments_author_delete ON public.lume_comments
  FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE OR REPLACE VIEW public.lume_comment_counts
WITH (security_invoker = true)
AS
SELECT quote_id, post_id, count(*)::integer AS comment_count
FROM public.lume_comments
GROUP BY quote_id, post_id;

GRANT SELECT ON public.lume_comments, public.lume_comment_counts TO anon, authenticated;
GRANT INSERT, DELETE ON public.lume_comments TO authenticated;

COMMENT ON TABLE public.lume_comments IS
  'Authenticated reader comments on published quote cards and faculty-authored Lume posts.';
