.PHONY: dev dev-d dev-reset create-user migrate prod down logs clean ps seed qa

# Run development environment with hot reload
dev:
	docker compose -f docker-compose.dev.yml up

# Run in detached mode
dev-d:
	docker compose -f docker-compose.dev.yml up -d

# Rebuild & restart dev environment cleanly
dev-reset:
	@echo "🧹 Resetting development environment..."
	docker compose -f docker-compose.dev.yml down -v
	docker compose -f docker-compose.dev.yml build
	docker compose -f docker-compose.dev.yml up -d
	@echo "⏳ Waiting for services to be ready..."
	sleep 10
	@echo "🔄 Applying Alembic migrations to initialize schema (empty DB)..."
	docker compose -f docker-compose.dev.yml exec api alembic upgrade head || true
	@echo "🧹 Database fully reset — no users, orgs, or data exist."
	@echo "👉 Use 'make create-user EMAIL=you@example.com PASSWORD=secret123 SUPERADMIN=true' to add a new superadmin manually."

# Create first admin user for local testing
create-user:
	@if [ -z "$(EMAIL)" ] || [ -z "$(PASSWORD)" ]; then \
		echo "Usage: make create-user EMAIL=user@example.com PASSWORD=secret123 [SUPERADMIN=true]"; \
		exit 1; \
	fi
	@if [ "$(SUPERADMIN)" = "true" ]; then \
		docker compose -f docker-compose.dev.yml exec api python scripts/create_user.py $(EMAIL) $(PASSWORD) --superadmin; \
	else \
		docker compose -f docker-compose.dev.yml exec api python scripts/create_user.py $(EMAIL) $(PASSWORD); \
	fi

# Run database migrations (upgrade to latest)
migrate:
	docker compose -f docker-compose.dev.yml run --rm api alembic upgrade head

# Run production build
prod:
	docker compose up --build

# Stop and remove all containers + volumes
down:
	docker compose down -v

# View live logs
logs:
	docker compose -f docker-compose.dev.yml logs -f

# Clean everything and rebuild from scratch
clean:
	docker compose down -v
	docker compose -f docker-compose.dev.yml down -v
	docker system prune -af

# Show running containers
ps:
	docker compose ps

# Test database connection
seed:
	docker compose exec api python -c "from app.db import SessionLocal; s=SessionLocal(); print('✅ Database connection OK')"

# -------------------------------
# 🧪 Run Full Integration Tests
# -------------------------------
qa:
	@echo "🧪 Running ConsentVault integration tests..."
	docker compose -f docker-compose.dev.yml up -d --build api db
	@echo "⏳ Waiting for services to be ready..."
	sleep 10
	@echo "🔄 Ensuring database schema is up to date..."
	docker compose -f docker-compose.dev.yml exec api python -c "from app.db import init_db; init_db()" || true
	docker compose -f docker-compose.dev.yml exec api python /app/scripts/fix_schema.py || true
	docker compose -f docker-compose.dev.yml exec api python /app/scripts/test_all.py
	@echo "✅ QA tests completed successfully!"
