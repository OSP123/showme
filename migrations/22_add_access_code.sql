-- Add short access code for verbal sharing of private maps
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maps' AND column_name = 'access_code'
  ) THEN
    ALTER TABLE maps ADD COLUMN access_code VARCHAR(6) UNIQUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_maps_access_code ON maps(access_code) WHERE access_code IS NOT NULL;
