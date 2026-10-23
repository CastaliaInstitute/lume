-- Broaden the visual languages available for generated Lume backgrounds.
ALTER TABLE public.lume_posts
  DROP CONSTRAINT IF EXISTS lume_posts_art_style_check,
  ADD CONSTRAINT lume_posts_art_style_check
    CHECK (art_style IN (
      'cinematic', 'photoreal', 'documentary', 'macro', 'painterly',
      'impressionist', 'collage', 'woodcut', 'botanical', 'illustration',
      'dreamlike-3d', 'symbolic'
    ));

COMMENT ON COLUMN public.lume_posts.art_style IS
  'Visual language used to generate this post’s rich image or video background.';
