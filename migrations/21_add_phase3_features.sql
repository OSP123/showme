-- Phase 3: Crisis Features Migration
-- Add pin expiration, type, and fuzzing support

-- Add type column to pins (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pins' AND column_name = 'type'
  ) THEN
    ALTER TABLE pins ADD COLUMN type TEXT;
  END IF;
END $$;

-- Add expires_at column to pins (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pins' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE pins ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add fuzzing_enabled column to maps (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maps' AND column_name = 'fuzzing_enabled'
  ) THEN
    ALTER TABLE maps ADD COLUMN fuzzing_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- Add fuzzing_radius column to maps (meters, default 100m)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maps' AND column_name = 'fuzzing_radius'
  ) THEN
    ALTER TABLE maps ADD COLUMN fuzzing_radius INTEGER NOT NULL DEFAULT 100;
  END IF;
END $$;

-- Create index on expires_at for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_pins_expires_at ON pins(expires_at) WHERE expires_at IS NOT NULL;

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_pins_type ON pins(type) WHERE type IS NOT NULL;

