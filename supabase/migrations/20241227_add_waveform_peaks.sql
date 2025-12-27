-- Add waveform_peaks column to samples table for faster waveform rendering
-- Stores pre-computed peak data as JSONB array of numbers

ALTER TABLE samples
ADD COLUMN IF NOT EXISTS waveform_peaks JSONB;

-- Add comment explaining the column
COMMENT ON COLUMN samples.waveform_peaks IS 'Pre-computed waveform peak data for fast rendering. Array of normalized amplitude values (0-1).';

-- Create index for faster queries when checking if peaks exist
CREATE INDEX IF NOT EXISTS idx_samples_waveform_peaks_null
ON samples ((waveform_peaks IS NULL));
