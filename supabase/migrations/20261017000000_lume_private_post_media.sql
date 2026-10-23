-- Keep unpublished Lume media private; signed URLs are issued only for media
-- attached to a published post or a draft owned by the requesting editor.
UPDATE storage.buckets
SET public = false
WHERE id = 'lume-post-media';

ALTER TABLE public.lume_posts
  ADD COLUMN IF NOT EXISTS artwork_storage_path text,
  DROP CONSTRAINT IF EXISTS lume_posts_artwork_storage_path_check,
  ADD CONSTRAINT lume_posts_artwork_storage_path_check
    CHECK (artwork_storage_path IS NULL OR (length(artwork_storage_path) <= 1024 AND artwork_storage_path !~ '(^/|\.\./)'));

DROP POLICY IF EXISTS lume_post_media_public_read ON storage.objects;
DROP POLICY IF EXISTS lume_post_media_owner_or_published_read ON storage.objects;
CREATE POLICY lume_post_media_owner_or_published_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lume-post-media'
    AND EXISTS (
      SELECT 1 FROM public.lume_posts p
      WHERE p.artwork_storage_path = name
        AND (p.status = 'published' OR p.created_by = auth.uid())
    )
  );
