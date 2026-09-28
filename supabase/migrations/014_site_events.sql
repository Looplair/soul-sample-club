-- supabase/migrations/014_site_events.sql
-- Page views and clicks the admin reports on (guide views, the /free funnel).
-- One row per event; bots and admins are filtered out before insert.

CREATE TABLE IF NOT EXISTS site_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event       TEXT NOT NULL,                                   -- 'view' | 'free_cta'
  path        TEXT NOT NULL,                                   -- e.g. '/guides/sample-clearance', '/free'
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL, -- null when logged out
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_events_lookup ON site_events(event, path, created_at);

-- Written and read server-side with the service role only
ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;

-- Totals per page for the admin. security_invoker keeps the table's RLS in
-- force, so only the service role can read it (not the public API).
CREATE OR REPLACE VIEW site_event_counts WITH (security_invoker = true) AS
SELECT
  event,
  path,
  COUNT(*)                                                       AS total,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')  AS last7,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS last30
FROM site_events
GROUP BY event, path;

-- Later steps of the free pack funnel
ALTER TABLE free_pack_claims ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMPTZ;      -- first time they hit Download
ALTER TABLE free_pack_claims ADD COLUMN IF NOT EXISTS offer_checkout_at TIMESTAMPTZ;  -- first time they clicked "Claim my $1.99 offer"
