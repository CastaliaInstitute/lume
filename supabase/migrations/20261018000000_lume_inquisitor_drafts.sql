-- Inquisitor editors may prepare private faculty drafts, but cannot publish.
DROP POLICY IF EXISTS lume_posts_inquisitor_draft_insert ON public.lume_posts;
CREATE POLICY lume_posts_inquisitor_draft_insert ON public.lume_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND 'inquisitor' = ANY(coalesce(p.roles, '{}'))
    )
  );

DROP POLICY IF EXISTS lume_posts_inquisitor_draft_update ON public.lume_posts;
CREATE POLICY lume_posts_inquisitor_draft_update ON public.lume_posts
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    AND status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND 'inquisitor' = ANY(coalesce(p.roles, '{}'))
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND 'inquisitor' = ANY(coalesce(p.roles, '{}'))
    )
  );

DROP POLICY IF EXISTS lume_post_media_faculty_upload ON storage.objects;
CREATE POLICY lume_post_media_editor_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lume-post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          'admin' = ANY(coalesce(p.roles, '{}'))
          OR 'faculty' = ANY(coalesce(p.roles, '{}'))
          OR 'inquisitor' = ANY(coalesce(p.roles, '{}'))
        )
    )
  );
