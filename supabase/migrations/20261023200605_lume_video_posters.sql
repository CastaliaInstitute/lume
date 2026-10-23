-- Preserve the generated still that anchors a post's animated background.
ALTER TABLE public.lume_posts
  ADD COLUMN IF NOT EXISTS artwork_poster_storage_path text,
  DROP CONSTRAINT IF EXISTS lume_posts_artwork_poster_storage_path_check,
  ADD CONSTRAINT lume_posts_artwork_poster_storage_path_check
    CHECK (
      artwork_poster_storage_path IS NULL
      OR (length(artwork_poster_storage_path) <= 1024 AND artwork_poster_storage_path !~ '(^/|\.\./)')
    );

DROP POLICY IF EXISTS lume_post_media_owner_or_published_read ON storage.objects;
CREATE POLICY lume_post_media_owner_or_published_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lume-post-media'
    AND EXISTS (
      SELECT 1 FROM public.lume_posts p
      WHERE (p.artwork_storage_path = name OR p.artwork_poster_storage_path = name)
        AND (p.status = 'published' OR p.created_by = auth.uid())
    )
  );
