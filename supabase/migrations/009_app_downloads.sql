-- supabase/migrations/009_app_downloads.sql
-- One row per click on the desktop app download buttons (/app page)

CREATE TABLE IF NOT EXISTS app_downloads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform    TEXT NOT NULL,                                   -- 'mac' | 'windows'
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL, -- null when logged out
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_downloads_created ON app_downloads(created_at);

-- Written and read server-side with the service role only
ALTER TABLE app_downloads ENABLE ROW LEVEL SECURITY;
