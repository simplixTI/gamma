-- Migration: create ad-images storage bucket for admin ad banners
-- Only admins (authenticated users in admin_users table) can upload.
-- Everyone can read (public CDN URLs).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-images',
  'ad-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "ad_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-images');

-- Admin upload: authenticated user must exist in admin_users
CREATE POLICY "ad_images_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ad-images'
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "ad_images_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ad-images'
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "ad_images_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ad-images'
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
