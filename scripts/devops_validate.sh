#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="docker/docker-compose.yml"

echo "🚀 Booting stack..."
./scripts/devops_up_fast.sh >/dev/null 2>&1

echo "📦 Migrating..."
if ! docker compose -f "$COMPOSE_FILE" exec -T api alembic upgrade head >/dev/null 2>&1; then
  echo "❌ Migration failed"
  exit 1
fi

echo "🌱 Seeding..."
if ! docker compose -f "$COMPOSE_FILE" exec -T -e ENV=development api python apps/api/scripts/reset_dev_data.py >/dev/null 2>&1; then
  echo "❌ Seeding failed"
  exit 1
fi

echo "🔐 Testing auth..."
if ! docker compose -f "$COMPOSE_FILE" exec api bash -c './scripts/test_local_auth.sh' 2>&1; then
  echo "❌ Auth test failed"
  exit 1
fi

echo "✅ All systems ready."
