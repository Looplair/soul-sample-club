-- supabase/migrations/011_pack_slugs.sql
-- Readable pack addresses: /packs/<slug>. Set once per pack, never changed on rename.

ALTER TABLE packs ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS packs_slug_key ON packs(slug);
