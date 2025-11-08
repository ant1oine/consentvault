#!/usr/bin/env bash
set -e

echo "🚀 Rebuilding local dev environment..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# Step 1: Stop and remove containers and volumes
echo "📦 Stopping and removing containers..."
docker compose down -v --remove-orphans 2>/dev/null || true

# Step 2: Build and start services
echo "🔨 Building and starting services..."
docker compose up -d --build

# Step 3: Wait for database to be ready (with retry logic)
echo "⏳ Waiting for database to be ready..."
max_retries=10
retry_delay=2
for i in $(seq 1 $max_retries); do
    if docker compose exec -T db pg_isready -U consentvault -d consentvault >/dev/null 2>&1; then
        echo "✅ Database is ready"
        break
    fi
    if [ $i -eq $max_retries ]; then
        echo "❌ Database failed to become ready after $max_retries attempts"
        echo "   Check logs with: docker compose logs db"
        exit 1
    fi
    echo "   Attempt $i/$max_retries: waiting ${retry_delay}s..."
    sleep $retry_delay
done

# Step 4: Apply migrations
echo "🔄 Applying migrations..."
if ! docker compose exec -T api alembic upgrade head; then
    echo "❌ Migration failed. Check logs with: docker compose logs api"
    exit 1
fi
echo "✅ Migrations applied successfully"

# Step 5: Reset development data
echo "🌱 Resetting development data..."
if ! docker compose exec -T -e ENV=development api python apps/api/scripts/reset_dev_data.py; then
    echo "❌ Data reset failed. Check logs with: docker compose logs api"
    exit 1
fi

# Step 6: Verification
echo ""
echo "🎉 Local environment ready!"
echo ""
echo "📋 Verification commands:"
echo "   Check migration version:"
echo "   docker compose exec api alembic current"
echo ""
echo "   Check organizations:"
echo "   docker compose exec api psql -U consentvault -d consentvault -c \"SELECT * FROM organizations;\""
echo ""
echo "   Check users:"
echo "   docker compose exec api psql -U consentvault -d consentvault -c \"SELECT id, email, role, active FROM users;\""
echo ""
echo "   Check API keys:"
echo "   docker compose exec api psql -U consentvault -d consentvault -c \"SELECT id, name, organization_id, active FROM api_keys;\""
echo ""

