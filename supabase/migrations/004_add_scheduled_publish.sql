-- Add scheduled_publish_at field to packs table
-- This allows admins to schedule when a pack should automatically go live

ALTER TABLE packs
ADD COLUMN scheduled_publish_at TIMESTAMPTZ;

-- Add comment explaining the field
COMMENT ON COLUMN packs.scheduled_publish_at IS 'When set, pack will automatically be published at this time. Null means no scheduling.';

-- Create index for efficient cron job queries
CREATE INDEX idx_packs_scheduled_publish ON packs(scheduled_publish_at)
WHERE scheduled_publish_at IS NOT NULL AND is_published = false;
