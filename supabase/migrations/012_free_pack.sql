-- supabase/migrations/012_free_pack.sql
-- Free pack funnel (/free): which pack is free, and who has claimed it

ALTER TABLE homepage_settings
  ADD COLUMN IF NOT EXISTS free_pack_id UUID REFERENCES packs(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS free_pack_claims (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pack_id     UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_free_pack_claims_created ON free_pack_claims(created_at);

-- Written and read server-side with the service role only
ALTER TABLE free_pack_claims ENABLE ROW LEVEL SECURITY;
