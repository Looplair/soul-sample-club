-- One-time welcome offer shown after the free pack download.
-- The 30-minute window starts the first time a user downloads; it is only
-- ever started once per user, and checkout checks it server-side.
ALTER TABLE free_pack_claims ADD COLUMN IF NOT EXISTS offer_started_at TIMESTAMPTZ;
