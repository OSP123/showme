#!/bin/bash
set -e

# Use a subdirectory to avoid lost+found issue with mount points
export PGDATA="/var/lib/postgresql/data/pgdata"

# Initialize PostgreSQL if data directory is empty
if [ ! -s "$PGDATA/PG_VERSION" ]; then
    echo "Initializing PostgreSQL database in $PGDATA..."
    mkdir -p "$PGDATA"
    chown -R postgres:postgres /var/lib/postgresql/data
    su postgres -c "/usr/lib/postgresql/17/bin/initdb -D $PGDATA"
    
    # Start PostgreSQL temporarily to run init scripts
    su postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D $PGDATA -o '-c listen_addresses=localhost' -w start"
    
    # Create database and user
    su postgres -c "psql --command \"CREATE USER $POSTGRES_USER WITH SUPERUSER PASSWORD '$POSTGRES_PASSWORD';\""  
    su postgres -c "createdb -O $POSTGRES_USER $POSTGRES_DB"
    
    # Run migration scripts
    for f in /docker-entrypoint-initdb.d/*.sql; do
        echo "Running $f..."
        su postgres -c "psql -d $POSTGRES_DB -f $f"
    done
    
    # Stop PostgreSQL
    su postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D $PGDATA -m fast -w stop"
    
    echo "PostgreSQL initialization complete!"
fi

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
