-- Add encryption salt for per-map E2E encryption
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maps' AND column_name = 'encryption_salt'
  ) THEN
    ALTER TABLE maps ADD COLUMN encryption_salt TEXT;
  END IF;
END $$;
