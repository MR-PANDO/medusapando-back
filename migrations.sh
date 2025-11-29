#!/bin/sh

if [ "$WORKER_MODE" != "worker" ]; then
  echo "Running migrations for $WORKER_MODE"

  # Generate migrations for custom modules if tables don't exist yet
  echo "Generating migrations for custom modules..."
  npx medusa db:generate brandModuleService colombiaGeoModuleService || true

  # Run migrations
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
