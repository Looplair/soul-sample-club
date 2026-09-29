-- supabase/migrations/015_member_counter.sql
-- Patreon members can't be counted from the site (most never link an account),
-- so the admin enters the total from the Patreon dashboard. The public member
-- counter = active Stripe members + this number.
ALTER TABLE homepage_settings ADD COLUMN IF NOT EXISTS patreon_member_count INTEGER;
