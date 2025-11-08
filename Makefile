# ============================================
# 🧠 ConsentVault Makefile
# High-performance developer & ops workflow
# ============================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ---------- Core Variables ----------
ENV ?= dev
COMPOSE ?= docker compose
COMPOSE_FILE ?= docker/docker-compose.yml
STACK_SERVICES ?= db redis api
WEB_DIR ?= apps/web
WEB_DEPS_STAMP := $(WEB_DIR)/.pnpm-installed
PNPM ?= pnpm
DB_RETRIES ?= 10
DB_SLEEP ?= 2
QUIET ?= 1

# ---------- Environment-specific Overrides ----------
ifeq ($(ENV),staging)
	COMPOSE_FILE := docker/docker-compose.staging.yml
endif
ifeq ($(ENV),prod)
	COMPOSE_FILE := docker/docker-compose.prod.yml
endif

# ---------- Output Controls ----------
ifeq ($(QUIET),1)
	COMPOSE_STDOUT := >/dev/null
	PNPM_STDOUT := >/dev/null
	PYTEST_ARGS ?= -q --disable-warnings -r none
else
	COMPOSE_STDOUT :=
	PNPM_STDOUT :=
	PYTEST_ARGS ?= -v
endif

# ---------- Color Codes ----------
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[1;34m
CYAN := \033[1;36m
RESET := \033[0m

# ---------- Targets ----------
.PHONY: help up stack-up web-dev down logs logs-api logs-db logs-worker \
	status wait-db wait-api migrate seed reset build rebuild restart \
	backend-test frontend-check lint health test ci shell db-shell

# ---------- Help (default goal) ----------
help:
	@printf "\n${CYAN}╔══════════════════════════════════════════════════════════╗${RESET}\n"
	@printf "  ${GREEN}ConsentVault – Developer & Ops Commands${RESET}\n"
	@printf "${CYAN}╚══════════════════════════════════════════════════════════╝${RESET}\n"
	@printf "  Current environment: ${CYAN}$(ENV)${RESET} (default: dev)\n\n"

	@printf "${GREEN}🌱 Core Workflow${RESET}\n"
	@printf "  ${YELLOW}make up${RESET}         → start Docker stack + Next.js dev server\n"
	@printf "  ${YELLOW}make reset${RESET}      → rebuild containers, migrate, seed, mint API key\n"
	@printf "  ${YELLOW}make test${RESET}       → full backend + frontend + health checks\n"
	@printf "  ${YELLOW}make down${RESET}       → stop Docker stack\n"
	@printf "  ${YELLOW}make ci${RESET}         → CI pipeline (reset + test)\n\n"

	@printf "${GREEN}⚙️  Advanced Ops & Debugging${RESET}\n"
	@printf "  ${YELLOW}make logs${RESET}       → tail logs for all core services\n"
	@printf "  ${YELLOW}make logs-api${RESET}   → API service logs\n"
	@printf "  ${YELLOW}make logs-db${RESET}    → database logs\n"
	@printf "  ${YELLOW}make restart${RESET}    → restart backend containers\n"
	@printf "  ${YELLOW}make shell${RESET}      → open bash shell inside API container\n"
	@printf "  ${YELLOW}make db-shell${RESET}   → connect to Postgres CLI\n"
	@printf "  ${YELLOW}make lint${RESET}       → run backend + frontend linters\n"
	@printf "  ${YELLOW}make migrate${RESET}    → apply Alembic migrations\n"
	@printf "  ${YELLOW}make seed${RESET}       → reseed dev data and mint default admin\n\n"

	@printf "${GREEN}💡 Tips${RESET}\n"
	@printf "  • Use ${YELLOW}ENV=staging${RESET} or ${YELLOW}ENV=prod${RESET} for multi-environment workflows.\n"
	@printf "  • Add ${YELLOW}QUIET=0${RESET} to see verbose Docker + pnpm logs.\n"
	@printf "  • Run ${YELLOW}make help${RESET} anytime — it’s safe and instant.\n\n"

# ---------- Core Workflows ----------
stack-up:
	@printf "${BLUE}🚀 Starting backend stack ($(STACK_SERVICES))...${RESET}\n"
	$(COMPOSE) -f $(COMPOSE_FILE) up -d $(STACK_SERVICES) $(COMPOSE_STDOUT)

web-dev: $(WEB_DEPS_STAMP)
	@printf "${BLUE}🌐 Starting Next.js dev server (Ctrl+C to stop)...${RESET}\n"
	cd $(WEB_DIR) && $(PNPM) dev

up: stack-up
	@$(MAKE) wait-db
	@printf "${GREEN}✅ Backend ready. Launching dashboard...${RESET}\n"
	@$(MAKE) web-dev

down:
	$(COMPOSE) -f $(COMPOSE_FILE) down $(COMPOSE_STDOUT)

build:
	$(COMPOSE) -f $(COMPOSE_FILE) build $(STACK_SERVICES)

rebuild:
	$(COMPOSE) -f $(COMPOSE_FILE) build --no-cache $(STACK_SERVICES)

restart:
	$(COMPOSE) -f $(COMPOSE_FILE) restart $(STACK_SERVICES)

logs:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f --tail=200 $(STACK_SERVICES)

logs-api:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f api

logs-db:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f db

logs-worker:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f worker

status:
	$(COMPOSE) -f $(COMPOSE_FILE) ps

# ---------- Database / Initialization ----------
wait-db:
	@printf "${BLUE}⏳ Waiting for Postgres...${RESET}\n"
	@for i in $$(seq 1 $(DB_RETRIES)); do \
		if $(COMPOSE) -f $(COMPOSE_FILE) exec -T db pg_isready -U consentvault -d consentvault >/dev/null 2>&1; then \
			printf "${GREEN}✅ Database is ready${RESET}\n"; exit 0; \
		fi; \
		printf "   retry $$i/$(DB_RETRIES)...\n"; \
		sleep $(DB_SLEEP); \
	done; \
	printf "${YELLOW}❌ Database never became ready${RESET}\n" >&2; exit 1

wait-api:
	@printf "${BLUE}⏳ Waiting for API health...${RESET}\n"
	@for i in $$(seq 1 10); do \
		if curl -sf http://localhost:8000/healthz >/dev/null; then \
			printf "${GREEN}✅ API healthy${RESET}\n"; exit 0; \
		fi; \
		printf "   retry $$i...\n"; \
		sleep 3; \
	done; \
	printf "${YELLOW}❌ API failed health check${RESET}\n" >&2; exit 1

migrate:
	$(COMPOSE) -f $(COMPOSE_FILE) exec -T api alembic upgrade head $(COMPOSE_STDOUT)

seed:
	@printf "${BLUE}🌱 Resetting tenant data + default admin...${RESET}\n"
	$(COMPOSE) -f $(COMPOSE_FILE) exec -T -e ENV=$(ENV) api python apps/api/scripts/reset_dev_data.py $(COMPOSE_STDOUT)
	@printf "${BLUE}🔐 Creating/rotating default API key...${RESET}\n"
	$(COMPOSE) -f $(COMPOSE_FILE) exec -T api python setup_org.py

reset:
	@printf "${BLUE}🧹 Full stack reset ($(ENV))...${RESET}\n"
	$(COMPOSE) -f $(COMPOSE_FILE) down -v --remove-orphans $(COMPOSE_STDOUT) || true
	$(COMPOSE) -f $(COMPOSE_FILE) up -d --build $(STACK_SERVICES) $(COMPOSE_STDOUT)
	@$(MAKE) wait-db
	@$(MAKE) migrate
	@$(MAKE) seed
	@$(MAKE) wait-api
	@printf "${GREEN}🎉 Fresh environment ready.${RESET}\n"

# ---------- Tests & Validation ----------
backend-test:
	$(COMPOSE) -f $(COMPOSE_FILE) exec -T -e PYTHONPATH=/app api pytest $(PYTEST_ARGS)

frontend-check: $(WEB_DEPS_STAMP)
	cd $(WEB_DIR) && $(PNPM) lint $(PNPM_STDOUT)
	cd $(WEB_DIR) && $(PNPM) exec tsc --noEmit $(PNPM_STDOUT)

lint:
	@printf "${BLUE}🔍 Running lint checks (backend + frontend)...${RESET}\n"
	$(COMPOSE) -f $(COMPOSE_FILE) exec -T api ruff check apps/api || true
	cd $(WEB_DIR) && $(PNPM) lint

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
	@printf "${GREEN}✅ Full stack health checks passed.${RESET}\n"

ci:
	@printf "${BLUE}🚦 CI pipeline start...${RESET}\n"
	@$(MAKE) reset QUIET=1
	@$(MAKE) test QUIET=1
	@printf "${GREEN}✅ CI pipeline passed.${RESET}\n"

# ---------- Utilities ----------
shell:
	$(COMPOSE) -f $(COMPOSE_FILE) exec api bash

db-shell:
	$(COMPOSE) -f $(COMPOSE_FILE) exec db psql -U consentvault -d consentvault

# ---------- Dependency Marker ----------
$(WEB_DEPS_STAMP): $(WEB_DIR)/package.json $(WEB_DIR)/pnpm-lock.yaml
	cd $(WEB_DIR) && $(PNPM) install $(PNPM_STDOUT)
	touch $@
