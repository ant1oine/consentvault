#!/usr/bin/env sh

set -e

echo "⏳ Waiting for database at ${DB_HOST:-db}:${DB_PORT:-5432}..."

until nc -z "${DB_HOST:-db}" "${DB_PORT:-5432}"; do
  sleep 1
done

echo "✅ Database is up, starting API..."

exec "$@"

