-- Persist locally generated post art and reusable Music Room motif references.
ALTER TABLE public.lume_posts
  ADD COLUMN IF NOT EXISTS artwork_svg text,
  ADD COLUMN IF NOT EXISTS music_motif_id text NOT NULL DEFAULT 'threshold';

ALTER TABLE public.lume_posts
  DROP CONSTRAINT IF EXISTS lume_posts_music_motif_id_check,
  ADD CONSTRAINT lume_posts_music_motif_id_check
    CHECK (music_motif_id IN ('threshold', 'return', 'suspended', 'footsteps', 'open-sky', 'spark')),
  DROP CONSTRAINT IF EXISTS lume_posts_artwork_svg_size_check,
  ADD CONSTRAINT lume_posts_artwork_svg_size_check
    CHECK (artwork_svg IS NULL OR octet_length(artwork_svg) <= 200000);

COMMENT ON COLUMN public.lume_posts.artwork_svg IS
  'Locally generated, decorative SVG background saved with the post.';
COMMENT ON COLUMN public.lume_posts.music_motif_id IS
  'Reusable Music Room motif identifier linked from this post.';
