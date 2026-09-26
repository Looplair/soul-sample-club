-- supabase/migrations/008_guides.sql
-- SEO guides (/guides), edited from /admin/guides

CREATE TABLE IF NOT EXISTS guides (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug           TEXT NOT NULL UNIQUE,
  cluster        TEXT NOT NULL DEFAULT 'Sample clearance',
  is_pillar      BOOLEAN NOT NULL DEFAULT false,   -- main guide for its cluster
  is_published   BOOLEAN NOT NULL DEFAULT false,
  title          TEXT NOT NULL,
  seo_title      TEXT,                             -- <title> tag, falls back to title
  description    TEXT NOT NULL DEFAULT '',         -- meta description + hub card blurb
  lead           TEXT NOT NULL DEFAULT '',         -- large intro under the headline
  body           TEXT NOT NULL DEFAULT '',         -- Markdown
  key_takeaways  JSONB NOT NULL DEFAULT '[]',      -- ["...", "..."]
  faqs           JSONB NOT NULL DEFAULT '[]',      -- [{"q": "...", "a": "..."}]
  sources        JSONB NOT NULL DEFAULT '[]',      -- [{"label": "...", "url": "..."}]
  related        TEXT[] NOT NULL DEFAULT '{}',     -- slugs of related guides
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guides_published ON guides(is_published);

ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

-- Anyone can read published guides
CREATE POLICY "Published guides are public"
  ON guides FOR SELECT
  USING (is_published = true);

-- Admins can do everything (writes also go through admin server actions)
CREATE POLICY "Admins can manage guides"
  ON guides FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
