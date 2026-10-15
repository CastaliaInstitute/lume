-- Keep each reader's Inbox to the post rooms they chose to open.
CREATE TABLE IF NOT EXISTS public.lume_discussion_members (
  discussion_id uuid NOT NULL REFERENCES public.lume_discussion_rooms (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  first_opened_at timestamptz NOT NULL DEFAULT now(),
  last_opened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (discussion_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_lume_discussion_members_member_opened
  ON public.lume_discussion_members (member_id, last_opened_at DESC);

ALTER TABLE public.lume_discussion_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lume_discussion_members_own_read ON public.lume_discussion_members;
CREATE POLICY lume_discussion_members_own_read ON public.lume_discussion_members
  FOR SELECT TO authenticated USING (member_id = auth.uid());

GRANT SELECT ON public.lume_discussion_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lume_discussion_members TO service_role;

COMMENT ON TABLE public.lume_discussion_members IS
  'Readers who opened a Lume Matrix room, used to populate each reader’s private Inbox.';
