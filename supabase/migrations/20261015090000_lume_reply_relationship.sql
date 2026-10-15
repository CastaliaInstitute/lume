-- Explicitly connect faculty replies to the Lume post they answer.
ALTER TABLE public.lume_posts
  ADD COLUMN IF NOT EXISTS reply_to_post_id uuid
    REFERENCES public.lume_posts (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lume_posts_reply_to
  ON public.lume_posts (reply_to_post_id)
  WHERE reply_to_post_id IS NOT NULL;

COMMENT ON COLUMN public.lume_posts.reply_to_post_id IS
  'The Lume post this post replies to; enables linked discussion and reply presentation.';
