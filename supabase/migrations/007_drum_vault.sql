-- supabase/migrations/007_drum_vault.sql

-- ── drum_breaks ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drum_breaks (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  bpm            INTEGER,
  file_path      TEXT,          -- Supabase Storage path in 'samples' bucket (drum-breaks/...)
  preview_path   TEXT,          -- lower-quality preview path (mp3 preferred)
  waveform_peaks JSONB,         -- array of numbers 0–1, e.g. [0.2, 0.8, 0.5, ...]
  is_published   BOOLEAN NOT NULL DEFAULT false,
  is_exclusive   BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── break_collections ────────────────────────────────────────────────────────
-- Records which users have collected which breaks (permanent, subscription-independent)
CREATE TABLE IF NOT EXISTS break_collections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  break_id     UUID NOT NULL REFERENCES drum_breaks(id) ON DELETE CASCADE,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, break_id)
);

-- ── vault_last_visited on profiles ───────────────────────────────────────────
-- Used to determine "New since your last visit" badge
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vault_last_visited TIMESTAMPTZ;

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_drum_breaks_published ON drum_breaks(is_published);
CREATE INDEX IF NOT EXISTS idx_break_collections_user ON break_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_break_collections_break ON break_collections(break_id);

-- ── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE drum_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_collections ENABLE ROW LEVEL SECURITY;

-- drum_breaks: any authenticated user can read published breaks
-- (API layer enforces subscription check before returning file URLs)
CREATE POLICY "Published drum breaks are viewable by authenticated users"
  ON drum_breaks FOR SELECT
  TO authenticated
  USING (is_published = true);

-- drum_breaks: admins can do everything
CREATE POLICY "Admins can manage drum_breaks"
  ON drum_breaks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- break_collections: users can only read their own collections
CREATE POLICY "Users can view own collections"
  ON break_collections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- break_collections: users can insert their own collections (API enforces subscription check)
CREATE POLICY "Users can insert own collections"
  ON break_collections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE on break_collections (ownership is permanent)
