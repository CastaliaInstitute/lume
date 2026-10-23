-- Let the art generator choose a fitting visual language and persist richer text motion.
ALTER TABLE public.lume_posts
  DROP CONSTRAINT IF EXISTS lume_posts_art_style_check,
  ADD CONSTRAINT lume_posts_art_style_check
    CHECK (art_style IN (
      'explore', 'cinematic', 'photoreal', 'documentary', 'macro', 'painterly',
      'impressionist', 'collage', 'woodcut', 'botanical', 'illustration',
      'dreamlike-3d', 'symbolic'
    )),
  ADD COLUMN IF NOT EXISTS video_motion_prompt text,
  DROP CONSTRAINT IF EXISTS lume_posts_text_animation_check,
  ADD CONSTRAINT lume_posts_text_animation_check
    CHECK (text_animation IN (
      'word-rise', 'fade-up', 'type-on', 'blur-in', 'float-in',
      'letter-space', 'pulse', 'still'
    ));

COMMENT ON COLUMN public.lume_posts.art_style IS
  'Chosen or freeform visual language used to generate this post’s image or video background.';
COMMENT ON COLUMN public.lume_posts.text_animation IS
  'Per-post HTML text motion treatment, including reduced-motion-safe still rendering.';

COMMENT ON COLUMN public.lume_posts.video_motion_prompt IS
  'Optional motion direction used when generating this post’s animated background.';
