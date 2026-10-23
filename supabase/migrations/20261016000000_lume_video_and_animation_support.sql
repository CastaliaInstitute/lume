-- Give Lume drafts durable background media and make every editor animation
-- available to feed cards after saving.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lume-post-media',
  'lume-post-media',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS lume_post_media_public_read ON storage.objects;
CREATE POLICY lume_post_media_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'lume-post-media');

DROP POLICY IF EXISTS lume_post_media_faculty_upload ON storage.objects;
CREATE POLICY lume_post_media_faculty_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lume-post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND ( 'admin' = ANY(coalesce(p.roles, '{}'))
          OR 'faculty' = ANY(coalesce(p.roles, '{}')) )
    )
  );

DROP POLICY IF EXISTS lume_post_media_faculty_delete ON storage.objects;
CREATE POLICY lume_post_media_faculty_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'lume-post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

ALTER TABLE public.lume_posts
  ADD COLUMN IF NOT EXISTS art_style text NOT NULL DEFAULT 'cinematic',
  DROP CONSTRAINT IF EXISTS lume_posts_art_style_check,
  ADD CONSTRAINT lume_posts_art_style_check
    CHECK (art_style IN ('cinematic', 'photoreal', 'painterly', 'collage', 'illustration', 'symbolic')),
  DROP CONSTRAINT IF EXISTS lume_posts_text_animation_check,
  ADD CONSTRAINT lume_posts_text_animation_check
    CHECK (text_animation IN ('word-rise', 'fade-up', 'type-on', 'blur-in', 'still'));
