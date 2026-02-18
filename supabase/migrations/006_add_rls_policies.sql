-- Fix RLS on homepage_settings
-- Public can read (homepage fetches hero image server-side)
-- Only service role can write (admin uses server-side with service key)

ALTER TABLE homepage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read homepage settings"
  ON homepage_settings
  FOR SELECT
  TO public
  USING (true);

-- No INSERT/UPDATE/DELETE policy for anon/authenticated users
-- Writes go through service role (bypasses RLS) from admin server actions


-- Fix RLS on webhook_events
-- This table is internal only - written by Stripe webhook handler via service role
-- No public or authenticated user should access it directly

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon or authenticated users
-- Service role (used by webhook API route) bypasses RLS automatically
