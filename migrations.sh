#!/bin/bash

if [ "$WORKER_MODE" != "worker" ]; then
  echo "Running migrations for $WORKER_MODE"
  yarn run predeploy

  # Seed Colombia geo data if SEED_COLOMBIA_GEO is set
  if [ "$SEED_COLOMBIA_GEO" = "true" ]; then
    echo "Seeding Colombia geo data..."
    yarn medusa exec ./src/scripts/seed-colombia-geo.js
  fi
else
  echo "Skipping migrations because WORKER_MODE=worker"
fi

exec "$@"
