-- supabase/migrations/015_announcement_popups.sql
-- Any announcement can also show as a small popup to signed-in members.
-- New columns on an existing table, so its current grants and RLS already cover them.
-- The site reads these with the service role, server-side only.

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS show_as_popup     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS popup_starts_at   TIMESTAMPTZ;  -- empty: from when it's published
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS popup_ends_at     TIMESTAMPTZ;  -- empty: for as long as it's published
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS popup_button_text TEXT;         -- empty: "Read more"
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS popup_button_url  TEXT;         -- empty: the announcement's own page
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS popup_image_url   TEXT;         -- empty: no picture

CREATE INDEX IF NOT EXISTS idx_announcements_popup ON announcements(published_at DESC) WHERE show_as_popup AND is_published;
