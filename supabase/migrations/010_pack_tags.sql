-- supabase/migrations/010_pack_tags.sql
-- Genre and style tags on packs (picked in the admin pack editor)

ALTER TABLE packs
  ADD COLUMN IF NOT EXISTS genres TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS styles TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_packs_genres ON packs USING GIN (genres);
CREATE INDEX IF NOT EXISTS idx_packs_styles ON packs USING GIN (styles);
