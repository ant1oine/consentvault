# Makefile Guide

The Makefile wraps the most common workflows so you do not have to memorize long Docker commands. All targets accept `QUIET=0` if you want verbose logs.

| Target | Description |
|--------|-------------|
| `make up` | Starts Postgres, Redis, and the API, waits for readiness, then launches the Next.js dev server. |
| `make down` | Stops all Compose services. |
| `make status` | Shows running containers from `docker/docker-compose.yml`. |
| `make logs` | Tails API/DB/Redis logs (follow mode, last 200 lines). |
| `make wait-db` | Blocks until Postgres responds to `pg_isready`. Used internally, but callable. |
| `make migrate` | Runs `alembic upgrade head` inside the API container. |
| `make seed` | Resets dev data and mints a fresh organization + API key (output is always shown). |
| `make reset` | Full rebuild: down + volumes, build, up, migrate, seed. Ideal for onboarding. |
| `make backend-test` | Executes pytest inside the API container (`PYTHONPATH=/app`). |
| `make frontend-check` | Runs `pnpm lint` (via ESLint CLI) and `pnpm exec tsc --noEmit`. |
| `make health` | Hits `/healthz`, `/metrics`, and runs `scripts/test_local_auth.sh`. |
| `make test` | Orchestrates `stack-up → wait-db → migrate → backend-test → frontend-check → health`. |

## Verbose vs Quiet Mode
- Default (`QUIET=1`): Docker and pnpm output are suppressed unless an error occurs. Critical scripts such as `setup_org.py` always stream their results.
- Verbose: `QUIET=0 make test` (or any target) re-enables full command output and switches pytest back to `-v`.

## Customizing
You can override most variables inline:
```bash
STACK_SERVICES="db redis api worker" make up
PNPM=npm make frontend-check
```

See the Makefile itself for additional knobs (`COMPOSE_FILE`, `WEB_DIR`, etc.).
