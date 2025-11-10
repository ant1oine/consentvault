.PHONY: dev dev-d dev-reset prod down logs clean ps seed

# Run development environment with hot reload
dev:
	docker compose -f docker-compose.dev.yml up

# Run in detached mode
dev-d:
	docker compose -f docker-compose.dev.yml up -d

# Rebuild & restart dev environment cleanly
dev-reset:
	docker compose -f docker-compose.dev.yml down -v
	docker compose -f docker-compose.dev.yml build
	docker compose -f docker-compose.dev.yml up -d

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

# Create a new user
create-user:
	@echo "Creating user. Usage: make create-user EMAIL=user@example.com PASSWORD=password123"
	@docker compose exec api python /app/scripts/create_user.py $(EMAIL) $(PASSWORD)
