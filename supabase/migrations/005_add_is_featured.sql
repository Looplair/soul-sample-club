-- Add is_featured field to packs table
-- This allows admins to choose which pack appears as the homepage hero

ALTER TABLE packs
ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;

-- Add comment explaining the field
COMMENT ON COLUMN packs.is_featured IS 'When true, this pack appears as the featured hero on the homepage. Only one should be featured at a time.';

-- Create index for efficient queries
CREATE INDEX idx_packs_featured ON packs(is_featured) WHERE is_featured = true;
