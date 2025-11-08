#!/bin/bash
set -e

echo "🚀 Rebuilding staging environment..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# Verify .env.staging exists
if [ ! -f "docker/env/.env.staging" ]; then
    echo "❌ Error: docker/env/.env.staging not found!"
    echo "   Please create it from docker/env/.env.staging.example"
    exit 1
fi

# Stop and remove containers, volumes, and networks
echo "📦 Stopping and removing existing containers..."
docker compose --env-file docker/env/.env.staging -f docker/docker-compose.staging.yml down -v --remove-orphans

# Build and start services
echo "🔨 Building and starting services..."
docker compose --env-file docker/env/.env.staging -f docker/docker-compose.staging.yml up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Verify environment variables are loaded in api container
echo "🔍 Verifying environment variables in api container..."
docker compose -f docker/docker-compose.staging.yml exec -T api sh -c 'echo "DATABASE_URL: ${DATABASE_URL:0:50}..."' || true

# Run migrations
echo "🔄 Running database migrations..."
docker compose -f docker/docker-compose.staging.yml exec -T api alembic upgrade head

# Check health
echo "🏥 Checking health endpoint..."
sleep 2
curl -f http://localhost/healthz || {
    echo "❌ Health check failed, check docker logs:"
    echo "   docker compose -f docker/docker-compose.staging.yml logs api"
    exit 1
}

echo "✅ Staging environment is ready!"
echo "📊 Health endpoint: http://localhost/healthz"
echo "📈 Metrics endpoint: http://localhost/metrics"

