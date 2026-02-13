-- Add hero_image_url field to packs table
-- This allows admins to set a custom hero image for the homepage (different from pack cover)

ALTER TABLE packs
ADD COLUMN hero_image_url TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN packs.hero_image_url IS 'Optional custom hero image for homepage. If null, uses cover_image_url.';
