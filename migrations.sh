#!/bin/sh

if [ "$WORKER_MODE" != "worker" ]; then
  echo "Running migrations for $WORKER_MODE"

  # Generate migrations for custom modules
  echo "Generating migrations for brandModuleService..."
  npx medusa db:generate brandModuleService 2>&1 || echo "brandModuleService migration generation completed (may already exist)"

  echo "Generating migrations for colombiaGeoModuleService..."
  npx medusa db:generate colombiaGeoModuleService 2>&1 || echo "colombiaGeoModuleService migration generation completed (may already exist)"

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
