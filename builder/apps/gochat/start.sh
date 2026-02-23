#!/bin/sh
set -e

echo "=== GO4IT App Startup ==="
mkdir -p /data 2>/dev/null || true

# --- Schema sync (skip if unchanged) ---
SCHEMA_HASH=$(md5sum prisma/schema.prisma | cut -d' ' -f1)
if [ ! -f "/data/.schema-$SCHEMA_HASH" ]; then
  echo "Running database setup..."
  npx prisma db push --accept-data-loss 2>&1 || echo "Warning: prisma db push had issues"
  rm -f /data/.schema-* 2>/dev/null
  touch "/data/.schema-$SCHEMA_HASH"
else
  echo "Schema unchanged, skipping db push."
fi

# --- Team provisioning (skip if unchanged) ---
if [ -n "$GO4IT_TEAM_MEMBERS" ]; then
  TEAM_HASH=$(echo "$GO4IT_TEAM_MEMBERS" | md5sum | cut -d' ' -f1)
  if [ ! -f "/data/.team-$TEAM_HASH" ]; then
    echo "Provisioning team members..."
    if [ -f "prisma/provision-users.js" ]; then
      node prisma/provision-users.js 2>&1 || echo "Warning: user provisioning had issues"
    elif [ -f "prisma/provision-users.ts" ]; then
      npx tsx prisma/provision-users.ts 2>&1 || echo "Warning: user provisioning had issues"
    fi
    rm -f /data/.team-* 2>/dev/null
    touch "/data/.team-$TEAM_HASH"
  else
    echo "Team unchanged, skipping provisioning."
  fi
fi

echo "Starting application..."
exec node server.js
