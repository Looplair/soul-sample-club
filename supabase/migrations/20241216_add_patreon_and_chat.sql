-- Add username to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create patreon_links table
CREATE TABLE IF NOT EXISTS patreon_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patreon_user_id TEXT NOT NULL,
  patreon_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  tier_id TEXT,
  tier_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(patreon_user_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for patreon_links
ALTER TABLE patreon_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own patreon link"
  ON patreon_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patreon link"
  ON patreon_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patreon link"
  ON patreon_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patreon link"
  ON patreon_links FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert their own messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Create index for faster chat queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Function to check if user has active Patreon
CREATE OR REPLACE FUNCTION has_active_patreon(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM patreon_links
    WHERE patreon_links.user_id = $1
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
