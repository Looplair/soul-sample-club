-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================
-- Run this AFTER 001_initial_schema.sql

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- PROFILES POLICIES
-- ===========================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (but not is_admin)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from making themselves admin
    (is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid()))
  );

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ===========================================
-- SUBSCRIPTIONS POLICIES
-- ===========================================

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only service role can insert/update subscriptions (via webhooks)
-- No direct user policies for INSERT/UPDATE/DELETE

-- Admins can read all subscriptions
CREATE POLICY "Admins can read all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- ===========================================
-- PACKS POLICIES
-- ===========================================

-- Anyone authenticated can read published packs
CREATE POLICY "Authenticated users can read published packs"
  ON packs FOR SELECT
  TO authenticated
  USING (is_published = TRUE);

-- Admins can read all packs (including unpublished)
CREATE POLICY "Admins can read all packs"
  ON packs FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Admins can insert packs
CREATE POLICY "Admins can insert packs"
  ON packs FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- Admins can update packs
CREATE POLICY "Admins can update packs"
  ON packs FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Admins can delete packs
CREATE POLICY "Admins can delete packs"
  ON packs FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ===========================================
-- SAMPLES POLICIES
-- ===========================================

-- Users can read samples of published packs they can access
CREATE POLICY "Users can read samples of accessible packs"
  ON samples FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM packs
      WHERE packs.id = samples.pack_id
      AND packs.is_published = TRUE
    )
  );

-- Admins can read all samples
CREATE POLICY "Admins can read all samples"
  ON samples FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Admins can insert samples
CREATE POLICY "Admins can insert samples"
  ON samples FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- Admins can update samples
CREATE POLICY "Admins can update samples"
  ON samples FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Admins can delete samples
CREATE POLICY "Admins can delete samples"
  ON samples FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ===========================================
-- DOWNLOADS POLICIES
-- ===========================================

-- Users can read their own download history
CREATE POLICY "Users can read own downloads"
  ON downloads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own downloads
CREATE POLICY "Users can insert own downloads"
  ON downloads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can read all downloads (for analytics)
CREATE POLICY "Admins can read all downloads"
  ON downloads FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- ===========================================
-- STORAGE POLICIES
-- ===========================================
-- Run these in the Supabase Dashboard SQL Editor
-- after creating the storage buckets

-- Covers bucket (public read, admin write)
-- CREATE POLICY "Public can read covers"
--   ON storage.objects FOR SELECT
--   TO public
--   USING (bucket_id = 'covers');

-- CREATE POLICY "Admins can upload covers"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     bucket_id = 'covers' AND
--     is_admin(auth.uid())
--   );

-- CREATE POLICY "Admins can update covers"
--   ON storage.objects FOR UPDATE
--   TO authenticated
--   USING (
--     bucket_id = 'covers' AND
--     is_admin(auth.uid())
--   );

-- CREATE POLICY "Admins can delete covers"
--   ON storage.objects FOR DELETE
--   TO authenticated
--   USING (
--     bucket_id = 'covers' AND
--     is_admin(auth.uid())
--   );

-- Samples bucket (no public access - use signed URLs)
-- CREATE POLICY "Admins can manage samples"
--   ON storage.objects FOR ALL
--   TO authenticated
--   USING (
--     bucket_id = 'samples' AND
--     is_admin(auth.uid())
--   )
--   WITH CHECK (
--     bucket_id = 'samples' AND
--     is_admin(auth.uid())
--   );

-- Previews bucket (no public access - use signed URLs)
-- CREATE POLICY "Admins can manage previews"
--   ON storage.objects FOR ALL
--   TO authenticated
--   USING (
--     bucket_id = 'previews' AND
--     is_admin(auth.uid())
--   )
--   WITH CHECK (
--     bucket_id = 'previews' AND
--     is_admin(auth.uid())
--   );
