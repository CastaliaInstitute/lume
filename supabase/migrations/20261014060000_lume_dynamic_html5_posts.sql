-- Lume posts carry their own visual scene and text motion.
ALTER TABLE public.lume_posts
  ADD COLUMN IF NOT EXISTS artwork_svg text,
  ADD COLUMN IF NOT EXISTS music_motif_id text NOT NULL DEFAULT 'threshold',
  ADD COLUMN IF NOT EXISTS artwork_url text,
  ADD COLUMN IF NOT EXISTS artwork_media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS text_animation text NOT NULL DEFAULT 'word-rise',
  ADD COLUMN IF NOT EXISTS source_quote text,
  ADD COLUMN IF NOT EXISTS reflection text,
  ADD COLUMN IF NOT EXISTS question text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS source_title text,
  ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE public.lume_posts
  DROP CONSTRAINT IF EXISTS lume_posts_artwork_media_type_check,
  ADD CONSTRAINT lume_posts_artwork_media_type_check
    CHECK (artwork_media_type IN ('image', 'video')),
  DROP CONSTRAINT IF EXISTS lume_posts_text_animation_check,
  ADD CONSTRAINT lume_posts_text_animation_check
    CHECK (text_animation IN ('word-rise', 'fade-up', 'type-on', 'still')),
  DROP CONSTRAINT IF EXISTS lume_posts_music_motif_id_check,
  ADD CONSTRAINT lume_posts_music_motif_id_check
    CHECK (music_motif_id IN ('threshold', 'return', 'suspended', 'footsteps', 'open-sky', 'spark')),
  DROP CONSTRAINT IF EXISTS lume_posts_artwork_svg_size_check,
  ADD CONSTRAINT lume_posts_artwork_svg_size_check
    CHECK (artwork_svg IS NULL OR octet_length(artwork_svg) <= 200000),
  DROP CONSTRAINT IF EXISTS lume_posts_artwork_url_check,
  ADD CONSTRAINT lume_posts_artwork_url_check
    CHECK (artwork_url IS NULL OR (length(artwork_url) <= 2048 AND artwork_url ~ '^https://'));

COMMENT ON COLUMN public.lume_posts.artwork_url IS
  'HTTPS image or looping video used as this post’s visual background.';
COMMENT ON COLUMN public.lume_posts.artwork_media_type IS
  'The media element used for the post background: image or video.';
COMMENT ON COLUMN public.lume_posts.text_animation IS
  'A constrained HTML/CSS text entrance preset for the post.';
COMMENT ON COLUMN public.lume_posts.source_quote IS
  'Verified source passage displayed in the post, attributed to its faculty author.';

-- Allow clients to refresh published feed cards when a post is published or edited.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lume_posts;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
