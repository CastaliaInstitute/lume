-- Matrix faculty agents may propose Lumes during scheduled sessions.
-- Suggestions stay private until a faculty member/editor saves them as a Lume draft.
ALTER TABLE public.lume_posts
  ADD COLUMN IF NOT EXISTS reply_to_post_id uuid
    REFERENCES public.lume_posts (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lume_posts_reply_to_agent_draft
  ON public.lume_posts (reply_to_post_id)
  WHERE reply_to_post_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lume_agent_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id text NOT NULL REFERENCES public.faculty (id) ON DELETE CASCADE,
  matrix_event_id text NOT NULL CHECK (char_length(matrix_event_id) BETWEEN 1 AND 255),
  kind text NOT NULL CHECK (kind IN ('quote', 'reply')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  reflection text NOT NULL CHECK (char_length(reflection) BETWEEN 1 AND 1200),
  question text CHECK (question IS NULL OR char_length(question) <= 500),
  description text CHECK (description IS NULL OR char_length(description) <= 700),
  source_quote_id uuid REFERENCES public.faculty_quotes (id) ON DELETE CASCADE,
  reply_to_post_id uuid REFERENCES public.lume_posts (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claimed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  post_id uuid REFERENCES public.lume_posts (id) ON DELETE SET NULL,
  CONSTRAINT lume_agent_drafts_kind_target_check CHECK (
    (kind = 'quote' AND source_quote_id IS NOT NULL AND reply_to_post_id IS NULL)
    OR (kind = 'reply' AND source_quote_id IS NULL AND reply_to_post_id IS NOT NULL)
  ),
  CONSTRAINT lume_agent_drafts_session_kind_unique
    UNIQUE (faculty_id, matrix_event_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_lume_agent_drafts_faculty_pending
  ON public.lume_agent_drafts (faculty_id, created_at DESC)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.lume_caller_can_review_agent_draft(p_faculty_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.lume_caller_authorized_for_faculty(p_faculty_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.roles && ARRAY['inquisitor']::text[]
    );
$$;

ALTER TABLE public.lume_agent_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lume_agent_drafts_review_select ON public.lume_agent_drafts;
CREATE POLICY lume_agent_drafts_review_select ON public.lume_agent_drafts
  FOR SELECT TO authenticated
  USING (public.lume_caller_can_review_agent_draft(faculty_id));

DROP POLICY IF EXISTS lume_agent_drafts_review_update ON public.lume_agent_drafts;
CREATE POLICY lume_agent_drafts_review_update ON public.lume_agent_drafts
  FOR UPDATE TO authenticated
  USING (public.lume_caller_can_review_agent_draft(faculty_id))
  WITH CHECK (
    public.lume_caller_can_review_agent_draft(faculty_id)
    AND status IN ('pending', 'claimed', 'dismissed')
  );

-- Allow inquisitor editors to preserve source relationships on their own private drafts.
DROP POLICY IF EXISTS lume_post_sources_inquisitor_draft_manage ON public.lume_post_sources;
CREATE POLICY lume_post_sources_inquisitor_draft_manage ON public.lume_post_sources
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lume_posts post
      JOIN public.profiles profile ON profile.id = auth.uid()
      WHERE post.id = post_id
        AND post.created_by = auth.uid()
        AND post.status = 'draft'
        AND 'inquisitor' = ANY(coalesce(profile.roles, '{}'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lume_posts post
      JOIN public.profiles profile ON profile.id = auth.uid()
      WHERE post.id = post_id
        AND post.created_by = auth.uid()
        AND post.status = 'draft'
        AND 'inquisitor' = ANY(coalesce(profile.roles, '{}'))
    )
  );

GRANT SELECT, UPDATE ON public.lume_agent_drafts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lume_agent_drafts TO service_role;

COMMENT ON TABLE public.lume_agent_drafts IS
  'Private, source-checked suggestions from faculty Matrix agents; reviewed before becoming a Lume post draft.';
