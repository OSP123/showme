#!/bin/bash
set -e

# Initialize PostgreSQL if data directory is empty
if [ ! -s "/var/lib/postgresql/data/PG_VERSION" ]; then
    echo "Initializing PostgreSQL database..."
    chown -R postgres:postgres /var/lib/postgresql/data
    su - postgres -c "/usr/lib/postgresql/17/bin/initdb -D /var/lib/postgresql/data"
    
    # Start PostgreSQL temporarily to run init scripts
    su - postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D /var/lib/postgresql/data -o '-c listen_addresses=localhost' -w start"
    
    # Create database and user
    su - postgres -c "psql --command \"CREATE USER $POSTGRES_USER WITH SUPERUSER PASSWORD '$POSTGRES_PASSWORD';\""  
    su - postgres -c "createdb -O $POSTGRES_USER $POSTGRES_DB"
    
    # Run migration scripts
    for f in /docker-entrypoint-initdb.d/*.sql; do
        echo "Running $f..."
        su - postgres -c "psql -d $POSTGRES_DB -f $f"
    done
    
    # Stop PostgreSQL
    su - postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D /var/lib/postgresql/data -m fast -w stop"
    
    echo "PostgreSQL initialization complete!"
fi

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
