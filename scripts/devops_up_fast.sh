#!/usr/bin/env bash
set -euo pipefail

# Ensure we run from project root
cd "$(dirname "$0")/.."

COMPOSE_FILE="docker/docker-compose.yml"

echo "🧹 Cleaning..."
docker compose -f "$COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true

echo "🚀 Starting stack..."
docker compose -f "$COMPOSE_FILE" up -d db redis api >/dev/null 2>&1

echo "⏳ Waiting for API..."
until curl -s http://localhost:8000/healthz >/dev/null 2>&1; do
  sleep 2
done

echo "✅ API ready at http://localhost:8000"
