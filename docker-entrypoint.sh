#!/bin/bash
set -e

# Use a subdirectory to avoid lost+found issue with mount points
export PGDATA="/var/lib/postgresql/data/pgdata"

# Initialize PostgreSQL if data directory is empty
chown -R postgres:postgres /var/lib/postgresql/data
if [ ! -s "$PGDATA/PG_VERSION" ]; then
    echo "Initializing PostgreSQL database in $PGDATA..."
    mkdir -p "$PGDATA"
    # chown was here, moved up to ensure volume root is accessible every time
    su postgres -c "/usr/lib/postgresql/17/bin/initdb -D $PGDATA"
    
    # Start PostgreSQL temporarily to run init scripts
    su postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D $PGDATA -o '-c listen_addresses=localhost' -w start"
    
    # Create database and user (ignore if exists)
    su postgres -c "psql --command \"CREATE USER $POSTGRES_USER WITH SUPERUSER PASSWORD '$POSTGRES_PASSWORD';\"" || true
    su postgres -c "createdb -O $POSTGRES_USER $POSTGRES_DB" || true
    
    # Run migration scripts
    for f in /docker-entrypoint-initdb.d/*.sql; do
        if [ -f "$f" ]; then
            echo "Running $f..."
            su postgres -c "psql -d $POSTGRES_DB -f $f"
        fi
    done
    
    # Stop PostgreSQL
    su postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D $PGDATA -m fast -w stop"
    
    echo "PostgreSQL initialization complete!"
else
    # Database already exists — run any new migrations
    echo "Running migrations on existing database..."
    su postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D $PGDATA -o '-c listen_addresses=localhost' -w start"
    for f in /docker-entrypoint-initdb.d/*.sql; do
        if [ -f "$f" ]; then
            echo "Running $f..."
            su postgres -c "psql -d $POSTGRES_DB -f $f" || true
        fi
    done
    su postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D $PGDATA -m fast -w stop"
fi

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
