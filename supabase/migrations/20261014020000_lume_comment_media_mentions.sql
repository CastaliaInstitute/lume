-- Photo attachments and faculty mentions for Lume conversations.
ALTER TABLE public.lume_comments
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mentions text[] NOT NULL DEFAULT '{}'::text[];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lume-comment-images', 'lume-comment-images', true, 8388608,
        ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS lume_comment_images_public_read ON storage.objects;
CREATE POLICY lume_comment_images_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'lume-comment-images');

DROP POLICY IF EXISTS lume_comment_images_member_upload ON storage.objects;
CREATE POLICY lume_comment_images_member_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lume-comment-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS lume_comment_images_owner_delete ON storage.objects;
CREATE POLICY lume_comment_images_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'lume-comment-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
