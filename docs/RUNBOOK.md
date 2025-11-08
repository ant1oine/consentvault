# ConsentVault On-Call Runbook

Quick reference for common production operations. For architecture or developer onboarding, see the other files in `docs/`.

## Restart Services

### Staging
```bash
cd docker
docker compose -f docker-compose.staging.yml restart api
```

### Production
```bash
cd docker
docker compose -f docker-compose.prod.yml restart api
```

### Full Restart (all services)
```bash
docker compose -f docker-compose.staging.yml down
docker compose -f docker-compose.staging.yml up -d
```

## View Logs

### Staging
```bash
# All services
docker compose -f docker/docker-compose.staging.yml logs -f

# API only
docker compose -f docker/docker-compose.staging.yml logs -f api

# Last 100 lines
docker compose -f docker/docker-compose.staging.yml logs --tail=100 api
```

### Production
```bash
docker compose -f docker/docker-compose.prod.yml logs -f api
```

Logs are JSON-formatted. Filter with `jq`:
```bash
docker compose -f docker/docker-compose.staging.yml logs api | jq 'select(.level == "error")'
```

## Database Migrations

### Check Current Version
```bash
# Staging
docker compose -f docker/docker-compose.staging.yml exec api alembic current

# Production
docker compose -f docker/docker-compose.prod.yml exec api alembic current
```

### Apply Migrations
```bash
# Staging
docker compose -f docker/docker-compose.staging.yml exec api alembic upgrade head

# Production
docker compose -f docker/docker-compose.prod.yml exec api alembic upgrade head
```

### Rollback (use with caution)
```bash
docker compose -f docker/docker-compose.staging.yml exec api alembic downgrade -1
```

## Health Checks

### Check API Health
```bash
curl http://localhost:8000/healthz
```

Expected response:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "database": "ok",
  "redis": "ok"
}
```

### Check Metrics
```bash
curl http://localhost:8000/metrics
```

## Rotate API Keys & Secrets

### Rotate Master Encryption Key

⚠️ **Warning**: This requires re-encrypting all encrypted fields. Plan a maintenance window.

1. Generate new key:
   ```bash
   python generate_key.py
   ```

2. Update environment variable in `.env.staging` or `.env.prod`

3. Restart services:
   ```bash
   docker compose -f docker/docker-compose.staging.yml restart api
   ```

### Rotate Database Password

1. Update `POSTGRES_PASSWORD` in env file
2. Update `DATABASE_URL` with new password
3. Restart database and API:
   ```bash
   docker compose -f docker/docker-compose.staging.yml restart db api
   ```

### Revoke API Key

Use the API to deactivate:
```bash
curl -X PUT http://localhost:8000/v1/admin/api-keys/{key_id} \
  -H "X-Api-Key: YOUR_ADMIN_KEY" \
  -d '{"active": false}'
```

## Database Operations

### Snapshot Database

```bash
# Staging
docker compose -f docker/docker-compose.staging.yml exec db pg_dump -U consentvault consentvault > backup_$(date +%Y%m%d_%H%M%S).sql

# Production
docker compose -f docker/docker-compose.prod.yml exec db pg_dump -U consentvault consentvault > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

⚠️ **Warning**: This will overwrite existing data.

```bash
# Restore from backup
docker compose -f docker/docker-compose.staging.yml exec -T db psql -U consentvault consentvault < backup_20241108_120000.sql
```

### Connect to Database

```bash
# Staging
docker compose -f docker/docker-compose.staging.yml exec db psql -U consentvault -d consentvault

# Production
docker compose -f docker/docker-compose.prod.yml exec db psql -U consentvault -d consentvault
```

### Check Database Size

```sql
SELECT pg_size_pretty(pg_database_size('consentvault'));
```

## Redis Operations

### Check Redis Status
```bash
docker compose -f docker/docker-compose.staging.yml exec redis redis-cli ping
```

### Clear Rate Limit Data
```bash
docker compose -f docker/docker-compose.staging.yml exec redis redis-cli FLUSHDB
```

⚠️ **Warning**: This clears all Redis data, including rate limit counters.

## Common Issues

### API Not Responding

1. Check health endpoint:
   ```bash
   curl http://localhost:8000/healthz
   ```

2. Check logs:
   ```bash
   docker compose -f docker/docker-compose.staging.yml logs --tail=50 api
   ```

3. Check if container is running:
   ```bash
   docker compose -f docker/docker-compose.staging.yml ps
   ```

### Database Connection Errors

1. Verify database is healthy:
   ```bash
   docker compose -f docker/docker-compose.staging.yml exec db pg_isready -U consentvault
   ```

2. Check DATABASE_URL in env file matches container network

3. Restart API:
   ```bash
   docker compose -f docker/docker-compose.staging.yml restart api
   ```

### Rate Limiting Not Working

1. Verify Redis is running:
   ```bash
   docker compose -f docker/docker-compose.staging.yml exec redis redis-cli ping
   ```

2. Check REDIS_URL in env file

3. Check logs for rate limit errors:
   ```bash
   docker compose -f docker/docker-compose.staging.yml logs api | grep -i "rate"
   ```

### High Memory Usage

1. Check container stats:
   ```bash
   docker stats
   ```

2. Restart services if needed:
   ```bash
   docker compose -f docker/docker-compose.staging.yml restart
   ```

3. Adjust Gunicorn workers in `gunicorn_conf.py` if needed

## Emergency Procedures

### Complete Service Restart

```bash
cd docker
docker compose -f docker-compose.staging.yml down
docker compose -f docker-compose.staging.yml up -d --build
docker compose -f docker-compose.staging.yml exec api alembic upgrade head
```

### Rollback to Previous Version

1. Checkout previous git commit
2. Rebuild image:
   ```bash
   docker compose -f docker/docker-compose.staging.yml build api
   ```
3. Restart:
   ```bash
   docker compose -f docker/docker-compose.staging.yml restart api
   ```

### Database Emergency Restore

1. Stop API:
   ```bash
   docker compose -f docker/docker-compose.staging.yml stop api
   ```

2. Restore database:
   ```bash
   docker compose -f docker/docker-compose.staging.yml exec -T db psql -U consentvault consentvault < backup.sql
   ```

3. Start API:
   ```bash
   docker compose -f docker/docker-compose.staging.yml start api
   ```

## Monitoring

### Key Metrics to Watch

- `/metrics` endpoint: HTTP request rates, error rates, latency
- Health check: Database and Redis connectivity
- Container resource usage: CPU, memory, disk

### Alert Thresholds

- Health check returns 503
- Error rate > 5% of requests
- Response time p95 > 1s
- Database connection pool exhausted

## Contact

For issues not covered here, check:
- Application logs: `docker compose logs api`
- Database logs: `docker compose logs db`
- System logs: `journalctl` or cloud provider logs
