# Running ConsentVault

This guide covers local development, staging, and production basics. All workflows rely on Docker Compose plus the Makefile in the repo root.

## Prerequisites
- Docker 24+ and Docker Compose plugin.
- Python 3.12 (if you want to run scripts directly on the host).
- Node.js 18.18+ and `pnpm` (for dashboard development).
- GNU Make (installed by default on macOS/Linux; use WSL for Windows).

## Local Development

1. **Bootstrap everything**
   ```bash
   make reset
   ```
   This rebuilds containers, runs migrations, resets dev data, prints the default organization + API key, and refreshes the admin user.

2. **Launch the stack + dashboard**
   ```bash
   make up
   ```
   - Backend: http://localhost:8000 (docs at `/docs`).
   - Dashboard: http://localhost:3000 (press Ctrl+C to stop the Next.js dev server; containers keep running).

3. **Run automated checks**
   ```bash
   make test
   ```
   Executes backend pytest suite, frontend lint/TypeScript, health endpoints, and the scripted login test.

4. **Shut everything down**
   ```bash
   make down
   ```

### `.env` Expectations
Place a `.env` in the project root or inject variables via your shell. Minimum local values:
```env
DATABASE_URL=postgresql+psycopg://consentvault:consentvault@db:5432/consentvault
REDIS_URL=redis://redis:6379/0
MASTER_ENCRYPTION_KEY=<output of python generate_key.py>
JWT_SECRET_KEY=dev_secret_key_change_in_production
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
RATE_LIMIT_PER_MIN=60
```
Other useful settings: `ENABLE_HMAC_VERIFICATION`, `API_BODY_MAX_BYTES`, and any custom logging flags. The Docker Compose files reference a similar template under `docker/env/` for non-local deployments.

### CORS Troubleshooting
If the dashboard shows CORS errors, double-check that the API container sees the correct `ALLOWED_ORIGINS` and `CORS_ORIGINS`. You can confirm inside the container:
```bash
docker compose exec api printenv ALLOWED_ORIGINS
docker compose exec api printenv CORS_ORIGINS
```
Restart the API after changes (`docker compose restart api`).

## Staging

1. Copy `docker/docker-compose.staging.yml` to your host or CI runner.
2. Provide the required env vars (see `docker/env` for examples).
3. Build and start:
   ```bash
   docker compose -f docker/docker-compose.staging.yml up -d
   ```
4. Apply migrations and seed data:
   ```bash
   docker compose -f docker/docker-compose.staging.yml exec api alembic upgrade head
   docker compose -f docker/docker-compose.staging.yml exec -e ENV=staging api python apps/api/scripts/reset_dev_data.py
   ```
5. Run [docs/runbook.md](runbook.md) procedures for smoke tests, health checks, and log review.

## Production

Production uses the same compose templates (or equivalent ECS/Kubernetes manifests) with hardened settings:
- **Secrets** come from a vault/KMS, not `.env` files committed to disk.
- **TLS** is terminated at your ingress proxy (Nginx/Traefik/ALB).
- **Scaling** – run multiple API containers connected to the same Postgres/Redis.
- **Backups & monitoring** – follow the Runbook for pg_dump schedules, log forwarding, and alerting.

## Verification Checklist
After any deploy:
1. `curl https://your-domain/healthz`
2. `curl https://your-domain/metrics` and confirm Prometheus scrape succeeds.
3. Run `bash scripts/test_local_auth.sh` (works from CI with the correct base URL).
4. Create a throwaway organization + API key via `python setup_org.py` and hit `/v1/admin/api-keys` to confirm perms.
