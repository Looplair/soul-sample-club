-- Create a simple settings table for homepage hero image
-- This allows admin to set any image as the homepage hero, independent of packs

CREATE TABLE IF NOT EXISTS homepage_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  hero_image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT singleton_check CHECK (id = 'singleton')
);

-- Insert default row
INSERT INTO homepage_settings (id) VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

-- Add comment
COMMENT ON TABLE homepage_settings IS 'Global homepage settings. Only one row (singleton pattern).';
COMMENT ON COLUMN homepage_settings.hero_image_url IS 'Custom hero image for homepage. If null, uses latest pack cover.';
