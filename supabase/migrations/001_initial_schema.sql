-- ===========================================
-- SOUL SAMPLE CLUB - DATABASE SCHEMA
-- ===========================================
-- Run this in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- ENUM TYPES
-- ===========================================

CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'unpaid',
  'paused'
);

-- ===========================================
-- PROFILES TABLE
-- ===========================================
-- Extends Supabase auth.users with app-specific data

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_profiles_email ON profiles(email);

-- ===========================================
-- SUBSCRIPTIONS TABLE
-- ===========================================
-- Tracks Stripe subscription status

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  status subscription_status NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ===========================================
-- PACKS TABLE
-- ===========================================
-- Sample pack metadata

CREATE TABLE packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_image_url TEXT,
  release_date DATE NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for browsing
CREATE INDEX idx_packs_release_date ON packs(release_date DESC);
CREATE INDEX idx_packs_is_published ON packs(is_published);

-- ===========================================
-- SAMPLES TABLE
-- ===========================================
-- Individual audio files within packs

CREATE TABLE samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,        -- Path in Supabase storage (samples bucket)
  preview_path TEXT,               -- Path to shortened preview clip
  file_size INTEGER NOT NULL,      -- Size in bytes
  duration REAL NOT NULL,          -- Duration in seconds
  bpm INTEGER,                     -- Beats per minute (optional)
  key TEXT,                        -- Musical key (optional, e.g., "Am", "C#m")
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_samples_pack_id ON samples(pack_id);
CREATE INDEX idx_samples_order ON samples(pack_id, order_index);

-- ===========================================
-- DOWNLOADS TABLE
-- ===========================================
-- Track download history for analytics

CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_downloads_user_id ON downloads(user_id);
CREATE INDEX idx_downloads_sample_id ON downloads(sample_id);
CREATE INDEX idx_downloads_downloaded_at ON downloads(downloaded_at);

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Check if user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has an active subscription (active or trialing)
CREATE OR REPLACE FUNCTION has_active_subscription(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE subscriptions.user_id = has_active_subscription.user_id
    AND status IN ('active', 'trialing')
    AND current_period_end > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access a specific pack (within 3-month rolling window)
CREATE OR REPLACE FUNCTION can_access_pack(user_id UUID, pack_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  pack_release DATE;
  sub_start TIMESTAMPTZ;
BEGIN
  -- Admins can access everything
  IF is_admin(user_id) THEN
    RETURN TRUE;
  END IF;

  -- Must have active subscription
  IF NOT has_active_subscription(user_id) THEN
    RETURN FALSE;
  END IF;

  -- Get pack release date
  SELECT release_date INTO pack_release
  FROM packs WHERE id = pack_id AND is_published = TRUE;

  IF pack_release IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Pack must be within 3 months of today
  -- This ensures only recent packs are accessible
  RETURN pack_release >= (CURRENT_DATE - INTERVAL '3 months');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER packs_updated_at
  BEFORE UPDATE ON packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===========================================
-- STORAGE BUCKETS
-- ===========================================
-- Run these in the Supabase dashboard Storage section
-- Or use the API to create them

-- Note: You'll need to create these buckets in Supabase Dashboard:
-- 1. "samples" - Private bucket for full WAV files
-- 2. "previews" - Private bucket for shortened preview clips
-- 3. "covers" - Public bucket for pack cover images

-- Sample bucket policies will be handled via signed URLs
-- Cover images can be public for easy display
