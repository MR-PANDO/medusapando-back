#!/bin/sh

if [ "$WORKER_MODE" != "worker" ]; then
  echo "Running migrations for $WORKER_MODE"

  # Create custom module tables directly via SQL
  # This is needed because db:generate doesn't work in production without pre-existing migrations
  echo "Creating custom module tables if they don't exist..."
  if [ -f "./init-tables.sql" ]; then
    # Extract database connection info from DATABASE_URL and run SQL
    node -e "
      const url = new URL(process.env.DATABASE_URL);
      const fs = require('fs');
      const { Client } = require('pg');

      const client = new Client({
        host: url.hostname,
        port: url.port || 5432,
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        ssl: url.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : false
      });

      async function run() {
        try {
          await client.connect();
          const sql = fs.readFileSync('./init-tables.sql', 'utf8');
          await client.query(sql);
          console.log('Custom tables created/verified successfully');
        } catch (err) {
          console.error('Error creating tables:', err.message);
        } finally {
          await client.end();
        }
      }
      run();
    "
  else
    echo "init-tables.sql not found, skipping direct table creation"
  fi

  # Run migrations
  echo "Running database migrations..."
  npm run predeploy

  # Seed Colombia geo data if SEED_COLOMBIA_GEO is set
  if [ "$SEED_COLOMBIA_GEO" = "true" ]; then
    echo "Seeding Colombia geo data..."
    npx medusa exec ./src/scripts/seed-colombia-geo.js
  fi
else
  echo "Skipping migrations because WORKER_MODE=worker"
fi

exec "$@"
