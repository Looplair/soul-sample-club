-- ===========================================
-- STORAGE BUCKET SETUP
-- ===========================================
-- Run this in Supabase SQL Editor

-- Create the storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('covers', 'covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('samples', 'samples', false, 104857600, ARRAY['audio/wav', 'audio/x-wav']),
  ('previews', 'previews', false, 10485760, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- COVERS BUCKET POLICIES (Public read)
-- ===========================================

-- Anyone can view cover images
CREATE POLICY "Public can read covers"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'covers');

-- Admins can upload cover images
CREATE POLICY "Admins can upload covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'covers' AND
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

-- Admins can update cover images
CREATE POLICY "Admins can update covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'covers' AND
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

-- Admins can delete cover images
CREATE POLICY "Admins can delete covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'covers' AND
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

-- ===========================================
-- SAMPLES BUCKET POLICIES (Private - signed URLs only)
-- ===========================================

-- Admins can manage sample files
CREATE POLICY "Admins can insert samples storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'samples' AND
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update samples storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'samples' AND
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can delete samples storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'samples' AND
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

-- Service role handles signed URL generation for downloads
-- No direct SELECT policy for samples - must go through API

-- ===========================================
-- PREVIEWS BUCKET POLICIES (Private - signed URLs only)
-- ===========================================

-- Admins can manage preview files
CREATE POLICY "Admins can insert previews storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'previews' AND
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update previews storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'previews' AND
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can delete previews storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'previews' AND
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

-- Authenticated users with subscription can access previews
-- This allows streaming previews for subscribers
CREATE POLICY "Subscribers can read previews"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'previews' AND
    has_active_subscription(auth.uid())
  );
