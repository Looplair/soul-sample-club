-- supabase/migrations/017_notification_schedule.sql
-- Notifications can be scheduled: members only see one once show_at has passed.
-- Empty show_at = shown straight away (every notification before this, and the automatic ones).
-- A new column on an existing table, so its current grants and RLS already cover it.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS show_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_notifications_show_at ON notifications(show_at) WHERE show_at IS NOT NULL;
