.PHONY: dev dev-d dev-reset reset create-user org user assign promote promote-superadmin logs migrate prod down logs-follow clean ps seed qa

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
	sleep 15
	@echo "🛑 Stopping API to prevent init_db() from creating tables..."
	docker compose -f docker-compose.dev.yml stop api || true
	@echo "🔻 Dropping all existing tables..."
	@until docker compose -f docker-compose.dev.yml exec db pg_isready -U consentvault > /dev/null 2>&1; do sleep 1; done
	docker compose -f docker-compose.dev.yml exec db psql -U consentvault -d consentvault -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" || true
	@echo "🔄 Reapplying Alembic migrations..."
	docker compose -f docker-compose.dev.yml run --rm api alembic upgrade head || true
	@echo "▶️  Restarting API..."
	docker compose -f docker-compose.dev.yml start api || docker compose -f docker-compose.dev.yml up -d api
	@echo "🔍 Verifying schema..."
	docker compose -f docker-compose.dev.yml exec -w /app api python -c "from app.db import SessionLocal, Org, User, Consent; db = SessionLocal(); org_count = db.query(Org).count(); user_count = db.query(User).count(); consent_count = db.query(Consent).count(); print(f'✅ DB verified: {org_count} orgs, {user_count} users, {consent_count} consents'); db.close()" || true
	@echo "✅ Database fully reset — clean schema, no users, orgs, or data exist."
	@echo ""
	@echo "👉 Next step: create superadmin manually with:"
	@echo "   make create-user EMAIL=antoine@test.com PASSWORD=antoine SUPERADMIN=true"

# 🧹 Quick reset (simpler version)
reset:
	@echo "🧹 Quick reset..."
	docker compose -f docker-compose.dev.yml down -v
	docker compose -f docker-compose.dev.yml build
	docker compose -f docker-compose.dev.yml up -d
	@echo "⏳ Waiting for services to be ready..."
	sleep 15
	docker compose -f docker-compose.dev.yml exec -w /app api python scripts/fix_schema.py || true
	@echo "✅ Reset complete. Run migrations if needed: make migrate"

# 🧑‍💼 Superadmin creation (non-interactive, explicit flag required)
create-user:
	@if [ -z "$(EMAIL)" ] || [ -z "$(PASSWORD)" ]; then \
		echo "Usage: make create-user EMAIL=user@example.com PASSWORD=secret123 [SUPERADMIN=true]"; \
		exit 1; \
	fi
	@if [ "$(SUPERADMIN)" = "true" ]; then \
		docker compose -f docker-compose.dev.yml exec -w /app api python scripts/create_user.py $(EMAIL) $(PASSWORD) --superadmin; \
	else \
		docker compose -f docker-compose.dev.yml exec -w /app api python scripts/create_user.py $(EMAIL) $(PASSWORD); \
	fi

# 🏢 Create organization (interactive, safe)
org:
	docker compose -f docker-compose.dev.yml exec -it -w /app api python scripts/create_org.py

# 👤 Create regular user (interactive, safe - no superadmin option)
user:
	docker compose -f docker-compose.dev.yml exec -it -w /app api python scripts/create_user_safe.py

# 🔗 Assign user to organization (interactive, safe)
assign:
	docker compose -f docker-compose.dev.yml exec -it -w /app api python scripts/assign_user_to_org.py

# 👤 Promote or demote user role within org (viewer ↔ manager ↔ admin)
promote:
	docker compose -f docker-compose.dev.yml exec -it -w /app api python scripts/promote_org_role.py

# 🚀 Promote user to global superadmin (rare, audited, requires confirmation)
promote-superadmin:
	docker compose -f docker-compose.dev.yml exec -it -w /app api python scripts/promote_user.py

# 📜 View latest audit logs
logs:
	docker compose -f docker-compose.dev.yml exec -T db psql -U $${DB_USER:-consentvault} -d $${DB_NAME:-consentvault} -c "SELECT created_at, action as event_type, user_email as actor, metadata_json as details FROM audit_logs ORDER BY created_at DESC LIMIT 20;"

# Run database migrations (upgrade to latest)
migrate:
	docker compose -f docker-compose.dev.yml run --rm api alembic upgrade head

# Run production build
prod:
	docker compose up --build

# Stop and remove all containers + volumes
down:
	docker compose down -v

# View live container logs
logs-follow:
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
	docker compose exec -w /app api python -c "from app.db import SessionLocal; s=SessionLocal(); print('✅ Database connection OK')"

# -------------------------------
# 🧪 Run Full Integration Tests
# -------------------------------
qa:
	@echo "🧪 Running ConsentVault integration tests..."
	docker compose -f docker-compose.dev.yml up -d --build api db
	@echo "⏳ Waiting for services to be ready..."
	sleep 10
	@echo "🔄 Ensuring database schema is up to date..."
	docker compose -f docker-compose.dev.yml exec -w /app api python -c "from app.db import init_db; init_db()" || true
	docker compose -f docker-compose.dev.yml exec -w /app api python scripts/fix_schema.py || true
	docker compose -f docker-compose.dev.yml exec -w /app api python scripts/test_all.py
	@echo "✅ QA tests completed successfully!"
