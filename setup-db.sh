#!/bin/bash
set -e

echo "Waiting for database to be ready..."
sleep 5

echo "Enabling PostGIS extension..."
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;"

echo "Granting REPLICATION privilege..."
psql "$DATABASE_URL" -c "ALTER USER postgres WITH REPLICATION;"

echo "Running migration 20_create_tables.sql..."
psql "$DATABASE_URL" -f /migrations/20_create_tables.sql

echo "Running migration 21_add_phase3_features.sql..."
psql "$DATABASE_URL" -f /migrations/21_add_phase3_features.sql

echo "Database setup complete!"
