#!/usr/bin/env bash
set -e

echo "🧹 Cleaning containers..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# Stop and remove containers and volumes
docker compose -f docker/docker-compose.yml down -v --remove-orphans 2>/dev/null || true

echo "🚀 Starting fresh environment..."
docker compose -f docker/docker-compose.yml up -d --build

echo "⏳ Waiting for services to be ready..."
sleep 5

# Wait for database
max_retries=10
retry_delay=2
for i in $(seq 1 $max_retries); do
    if docker compose -f docker/docker-compose.yml exec -T db pg_isready -U consentvault -d consentvault >/dev/null 2>&1; then
        echo "✅ Database is ready"
        break
    fi
    if [ $i -eq $max_retries ]; then
        echo "❌ Database failed to become ready after $max_retries attempts"
        exit 1
    fi
    echo "   Attempt $i/$max_retries: waiting ${retry_delay}s..."
    sleep $retry_delay
done

echo "🔄 Applying Alembic migrations..."
if ! docker compose -f docker/docker-compose.yml exec -T api alembic upgrade head; then
    echo "❌ Migration failed"
    exit 1
fi
echo "✅ Migrations applied successfully"

echo "🌱 Seeding dev data..."
if ! docker compose -f docker/docker-compose.yml exec -T -e ENV=development api python apps/api/scripts/reset_dev_data.py; then
    echo "❌ Data seeding failed"
    exit 1
fi

echo "🧪 Running health checks..."
# Health check
if ! curl -s -f http://localhost:8000/healthz > /dev/null; then
    echo "❌ Health check failed"
    exit 1
fi
echo "✅ Health endpoint responding"

# Metrics check
if ! curl -s -f http://localhost:8000/metrics > /dev/null; then
    echo "❌ Metrics endpoint failed"
    exit 1
fi
echo "✅ Metrics endpoint responding"

echo "🧪 Running auth test..."
# Run auth test from host (API is exposed on localhost:8000)
if ! bash scripts/test_local_auth.sh; then
    echo "❌ Auth test failed"
    exit 1
fi

echo ""
echo "=" | tr -d '\n' | head -c 70
echo ""
echo "🎉 All local systems are healthy."
echo "You're now ready for staging deployment."
echo ""
echo "📋 Quick verification:"
echo "   Health: curl http://localhost:8000/healthz"
echo "   Metrics: curl http://localhost:8000/metrics"
echo "   API Docs: http://localhost:8000/docs"
echo "   Debug Env: curl http://localhost:8000/debug/env"
echo ""

