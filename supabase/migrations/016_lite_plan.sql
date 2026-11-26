-- supabase/migrations/016_lite_plan.sql
-- Lite: $3.99 a month, one pack a month.
-- New columns on existing tables, so their current grants and RLS already cover them.

-- Which plan a subscription is. Everything before Lite is the full membership.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'full';
DO $$ BEGIN
  ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check CHECK (plan IN ('full', 'lite'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- The packs Lite members can download (you pick one a month in admin or the uploader)
ALTER TABLE packs ADD COLUMN IF NOT EXISTS is_lite BOOLEAN NOT NULL DEFAULT FALSE;
