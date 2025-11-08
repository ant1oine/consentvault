# ===========================================
# ConsentVault Makefile (production-safe)
# ===========================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# --- Core Variables ---
COMPOSE ?= docker compose
COMPOSE_FILE ?= docker/docker-compose.yml
STACK_SERVICES ?= db redis api
WEB_DIR ?= apps/web
WEB_DEPS_STAMP := $(WEB_DIR)/.pnpm-installed
PNPM ?= pnpm
DB_RETRIES ?= 10
DB_SLEEP ?= 2
QUIET ?= 1
ENV ?= development

# --- Output Colors ---
RESET=\033[0m
BOLD=\033[1m
BLUE=\033[0;34m
YELLOW=\033[1;33m
GREEN=\033[0;32m
RED=\033[0;31m

# --- Environment-based Compose Selection ---
ifeq ($(ENV),staging)
	COMPOSE_FILE := docker/docker-compose.staging.yml
endif
ifeq ($(ENV),production)
	COMPOSE_FILE := docker/docker-compose.prod.yml
endif

# --- Safety Guard: block destructive ops in production ---
ifeq ($(ENV),production)
ifneq ($(findstring reset,$(MAKECMDGOALS)),)
$(error ❌ "make reset" (and related destructive commands) are disabled in production. Use 'make migrate' instead.)
endif
ifneq ($(findstring dev-reset,$(MAKECMDGOALS)),)
$(error ❌ "make dev-reset" cannot be run in production. Use 'make migrate' instead.)
endif
endif

# --- Quiet mode toggle ---
ifeq ($(QUIET),1)
	COMPOSE_STDOUT := >/dev/null
	PNPM_STDOUT := >/dev/null
	PYTEST_ARGS ?= -q --disable-warnings -r none
else
	COMPOSE_STDOUT :=
	PNPM_STDOUT :=
	PYTEST_ARGS ?= -v
endif

# ===========================================
# 📚 HELP
# ===========================================
help:
	@printf "${GREEN}ConsentVault Developer Targets${RESET}\n"
	@printf "  ${YELLOW}make up${RESET}         → start Docker stack + Next.js dev server\n"
	@printf "  ${YELLOW}make reset${RESET}      → rebuild containers, migrate, seed (🚫 disabled in production)\n"
	@printf "  ${YELLOW}make test${RESET}       → run backend + frontend + health checks\n"
	@printf "  ${YELLOW}make down${RESET}       → stop Docker stack\n"
	@printf "  ${YELLOW}make ci${RESET}         → full CI pipeline (reset + test)\n\n"
	@printf "${GREEN}Debug & Ops${RESET}\n"
	@printf "  make logs / logs-api / logs-db / logs-worker\n"
	@printf "  make shell / db-shell / restart / rebuild / status\n"
	@printf "  Current environment: ${BOLD}$(ENV)${RESET}\n"

# ===========================================
# 🧩 CORE TARGETS
# ===========================================
stack-up:
	@echo "🚀 Starting backend stack ($(STACK_SERVICES))..."
	$(COMPOSE) -f $(COMPOSE_FILE) up -d $(STACK_SERVICES) $(COMPOSE_STDOUT)

web-dev: $(WEB_DEPS_STAMP)
	@echo "🌐 Starting Next.js dev server (Ctrl+C to stop; backend stays up)..."
	cd $(WEB_DIR) && $(PNPM) dev

up: stack-up
	@$(MAKE) wait-db
	@echo "✅ Backend ready. Launching dashboard..."
	@$(MAKE) web-dev

down:
	$(COMPOSE) -f $(COMPOSE_FILE) down $(COMPOSE_STDOUT)

logs:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f --tail=200 $(STACK_SERVICES)

status:
	$(COMPOSE) -f $(COMPOSE_FILE) ps

wait-db:
	@echo "⏳ Waiting for Postgres..."
	@for i in $$(seq 1 $(DB_RETRIES)); do \
		if $(COMPOSE) -f $(COMPOSE_FILE) exec -T db pg_isready -U consentvault -d consentvault >/dev/null 2>&1; then \
			echo "✅ Database is ready"; exit 0; \
		fi; \
		echo "   retry $$i/$(DB_RETRIES)..."; \
		sleep $(DB_SLEEP); \
	done; \
	echo "❌ Database never became ready" >&2; exit 1

migrate:
	@echo "🚀 Applying migrations..."
	$(COMPOSE) -f $(COMPOSE_FILE) exec -T api alembic upgrade head

seed:
	@echo "🌱 Resetting tenant data + default admin..."
	$(COMPOSE) -f $(COMPOSE_FILE) exec -T -e ENV=$(ENV) api python apps/api/scripts/reset_dev_data.py $(COMPOSE_STDOUT)
	@echo "🔐 Creating/rotating default API key..."
	$(COMPOSE) -f $(COMPOSE_FILE) exec -T api python setup_org.py

reset:
	@echo "🧹 Full stack reset (allowed only in non-prod envs)..."
	$(COMPOSE) -f $(COMPOSE_FILE) down -v --remove-orphans $(COMPOSE_STDOUT) || true
	$(COMPOSE) -f $(COMPOSE_FILE) up -d --build $(STACK_SERVICES) $(COMPOSE_STDOUT)
	@$(MAKE) wait-db
	@$(MAKE) migrate
	@$(MAKE) seed
	@echo "🎉 Fresh environment ready."

backend-test:
	$(COMPOSE) -f $(COMPOSE_FILE) exec -T -e PYTHONPATH=/app api pytest $(PYTEST_ARGS)

frontend-check: $(WEB_DEPS_STAMP)
	cd $(WEB_DIR) && $(PNPM) lint $(PNPM_STDOUT)
	cd $(WEB_DIR) && $(PNPM) exec tsc --noEmit $(PNPM_STDOUT)

health:
	curl -sf http://localhost:8000/healthz >/dev/null
	curl -sf http://localhost:8000/metrics >/dev/null
	bash scripts/test_local_auth.sh

test:
	@$(MAKE) stack-up
	@$(MAKE) wait-db
	@$(MAKE) migrate
	@$(MAKE) backend-test
	@$(MAKE) frontend-check
	@$(MAKE) health
	@echo "✅ Full stack health checks passed."

$(WEB_DEPS_STAMP): $(WEB_DIR)/package.json $(WEB_DIR)/pnpm-lock.yaml
	cd $(WEB_DIR) && $(PNPM) install $(PNPM_STDOUT)
	touch $@
