#!/bin/sh
# Production container entrypoint for @rotifolk/api.
#
# Runs prisma + node DIRECTLY (no `pnpm run`): the deployed /app bundle still
# carries pnpm-lock.yaml + a workspace:* dep on @rotifolk/shared, so any `pnpm`
# invocation triggers a workspace deps-status check that fails in the pruned
# image. node + the prisma binary sidestep that entirely.
set -e

cd /app

# 1) Schema sync: create/upgrade the SQLite tables on the (persistent) disk.
#    prisma + prisma/config resolve via NODE_PATH=/opt/prisma/node_modules,
#    set in the Dockerfile. db push is used (this repo has no migration history).
echo "[entrypoint] prisma db push -> ${DATABASE_URL}"
prisma db push --schema ./prisma/schema.prisma --accept-data-loss

# 2) Start Nest. tsconfig-paths/register + tsconfig.runtime.json map the
#    @/* and @rotifolk/shared aliases onto the compiled dist/ output.
echo "[entrypoint] starting Rotifolk API"
export TS_NODE_PROJECT=./tsconfig.runtime.json
exec node -r tsconfig-paths/register dist/apps/api/src/main.js
