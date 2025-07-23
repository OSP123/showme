#!/bin/bash

# Wait for database to be ready
echo "Waiting for database to be ready..."
until docker compose exec db pg_isready -U showme -d showme; do
  sleep 2
done

echo "Setting up ElectricSQL publication..."

# Create the publication and add tables
docker compose exec db psql -U showme -d showme << 'EOF'
-- Drop and recreate the publication to ensure clean state
DROP PUBLICATION IF EXISTS electric_publication_default;
CREATE PUBLICATION electric_publication_default FOR ALL TABLES;

-- Verify the publication was created
\d+ electric_publication_default

-- Check that tables are in the publication
SELECT pubname, schemaname, tablename FROM pg_publication_tables WHERE pubname = 'electric_publication_default';

-- Check replica identity
SELECT schemaname, tablename, 
       CASE WHEN c.relreplident = 'f' THEN 'FULL'
            WHEN c.relreplident = 'd' THEN 'DEFAULT'
            WHEN c.relreplident = 'i' THEN 'INDEX'
            WHEN c.relreplident = 'n' THEN 'NOTHING'
       END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('maps', 'pins', 'subscriptions')
  AND n.nspname = 'public';
EOF

echo "ElectricSQL setup complete!"