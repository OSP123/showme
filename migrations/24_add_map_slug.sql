-- Add slug column to maps for human-readable share links
ALTER TABLE maps ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_maps_slug ON maps(slug);
