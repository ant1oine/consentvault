# ConsentVault

Production-grade consent management API for GCC builders. Handles consent logging, withdrawals, data-rights requests, and audit evidence.

## Environments

ConsentVault supports three deployment environments:

1. **Local**: Docker Compose for development
2. **Staging**: Docker Compose for pre-production testing
3. **Production**: AWS ECS Fargate in me-central-1 (Riyadh) for PDPL compliance

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.12+ (for local development)

### Running Locally

1. **Build and start services:**
   ```bash
   cd docker
   docker compose build api
   docker compose up -d
   ```

2. **Database Setup:**
   ```bash
   # Apply migrations
   docker compose exec api alembic upgrade head
   
   # Create first organization and API key
   docker compose exec api python setup_org.py
   ```
   
   This will create your first organization and display the API key (save it - shown only once).

3. **Access API docs:**
   - OpenAPI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## API Usage Examples

### Create Purpose

```bash
curl -X POST http://localhost:8000/v1/admin/purposes \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "marketing",
    "description": "Marketing communications"
  }'
```

### Grant Consent

```bash
curl -X POST http://localhost:8000/v1/consents \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "external_user_id": "user123",
    "purpose_code": "marketing",
    "status": "granted",
    "method": "checkbox",
    "source": "web"
  }'
```

### Withdraw Consent

```bash
curl -X POST http://localhost:8000/v1/consents/user123/withdraw \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "purpose_code": "marketing"
  }'
```

### Get Latest Consent

```bash
curl "http://localhost:8000/v1/consents/latest?external_user_id=user123&purpose_code=marketing" \
  -H "X-Api-Key: YOUR_API_KEY"
```

### Open Data Rights Request

```bash
curl -X POST http://localhost:8000/v1/rights \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "external_user_id": "user123",
    "right": "access",
    "reason": "User requested data access"
  }'
```

### Complete Data Rights Request

```bash
curl -X POST http://localhost:8000/v1/rights/REQUEST_ID/complete \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "evidence_ref": "evidence_123"
  }'
```

## Webhook Signature Verification

Webhooks are signed with HMAC-SHA256. Verify signatures in your webhook handler:

```python
import hmac
import hashlib
import time

def verify_webhook_signature(body: bytes, signature: str, timestamp: str, secret: str) -> bool:
    """Verify webhook signature."""
    # Check timestamp (5 minute window)
    if abs(int(time.time()) - int(timestamp)) > 300:
        return False
    
    message = body + timestamp.encode()
    expected = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

# Example usage
signature = request.headers.get("X-ConsentVault-Signature")
timestamp = request.headers.get("X-Timestamp")
body = await request.body()

if not verify_webhook_signature(body, signature, timestamp, webhook_secret):
    return {"error": "Invalid signature"}, 401
```

## Security Features

- **API Key Authentication**: Argon2 hashed keys, shown plaintext only once
- **HMAC Verification**: Optional request signing with clock-skew protection (5 min)
- **Rate Limiting**: Redis-based rate limiting via fastapi-limiter (60 req/min per IP on admin routes)
- **Tenant Isolation**: Row-level scoping by organization_id
- **Audit Hash Chain**: Tamper-evident audit log with SHA-256 chain
- **Field Encryption**: Optional Fernet encryption for sensitive fields
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **HTTPS Redirect**: Automatic redirect in staging/production environments
- **Trusted Host**: Host validation middleware
- **Body Size Limits**: Configurable (default: 1MB)

## Production Launch

### Staging Deployment

1. **Configure environment variables:**
   ```bash
   cd docker
   # Copy the example file and edit with your values:
   cp env/.env.staging.example env/.env.staging
   # Edit env/.env.staging with your values:
   # - ALLOWED_HOSTS: your staging domain
   # - CORS_ORIGINS: your frontend URL
   # - POSTGRES_PASSWORD: strong password
   # - MASTER_ENCRYPTION_KEY: 32-byte base64 key (use generate_key.py)
   ```

2. **Quick reset and deploy (recommended):**
   ```bash
   # From project root
   ./scripts/devops_reset_staging.sh
   ```
   
   This script will:
   - Stop and remove existing containers and volumes
   - Rebuild and start all services
   - Run database migrations
   - Verify health endpoint

3. **Manual deployment (alternative):**
   ```bash
   # Build and start staging
   docker compose -f docker/docker-compose.staging.yml up -d --build
   
   # Run migrations
   docker compose -f docker/docker-compose.staging.yml exec api alembic upgrade head
   
   # Verify deployment
   curl http://localhost/healthz
   ```

4. **Verify deployment:**
   ```bash
   # Health check
   curl http://localhost/healthz
   
   # Metrics endpoint
   curl http://localhost/metrics | head -n 20
   ```

**Troubleshooting:**

If you see `"POSTGRES_PASSWORD variable is not set"`, `"db unhealthy"`, or `"password authentication failed for user 'consentvault'"`:

1. **Verify `.env.staging` exists and has correct values:**
   ```bash
   cat docker/env/.env.staging
   ```
   
   Ensure it contains:
   ```ini
   POSTGRES_USER=consentvault
   POSTGRES_PASSWORD=supersecretpassword
   POSTGRES_DB=consentvault
   DATABASE_URL=postgresql+psycopg://consentvault:supersecretpassword@db:5432/consentvault
   ```
   
   **Important:** The password in `DATABASE_URL` must match `POSTGRES_PASSWORD`.

2. **Check that `docker-compose.staging.yml` includes `env_file` for both services:**
   ```yaml
   services:
     db:
       env_file:
         - ./env/.env.staging
       environment:
         POSTGRES_USER: ${POSTGRES_USER}
         POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
         POSTGRES_DB: ${POSTGRES_DB}
     
     api:
       env_file:
         - ./env/.env.staging
   ```

3. **Use the reset script which includes `--env-file` flag:**
   ```bash
   ./scripts/devops_reset_staging.sh
   ```
   
   The script uses `--env-file docker/env/.env.staging` to ensure Docker Compose loads variables for substitution.

4. **Verify environment variables are loaded in containers:**
   ```bash
   # Check api container
   docker compose -f docker/docker-compose.staging.yml exec api env | grep -E "(POSTGRES|DATABASE_URL)"
   
   # Check db container
   docker compose -f docker/docker-compose.staging.yml exec db env | grep POSTGRES
   ```
   
   They should match exactly.

5. **If issues persist, check container logs:**
   ```bash
   docker compose -f docker/docker-compose.staging.yml logs db
   docker compose -f docker/docker-compose.staging.yml logs api
   ```

### Production Deployment (AWS Riyadh / PDPL)

Production infrastructure is deployed to AWS in the `me-central-1` (Riyadh) region for PDPL compliance. All resources (compute, storage, logs, backups) remain in KSA.

**Architecture:**
- **ECS Fargate**: API tasks in private subnets
- **RDS PostgreSQL**: Multi-AZ, encrypted at rest
- **ElastiCache Redis**: Multi-AZ, TLS required
- **ALB**: Application Load Balancer with ACM certificate
- **Secrets Manager**: Encrypted secrets (KMS)
- **CloudWatch Logs**: Centralized logging in me-central-1

**Prerequisites:**
1. AWS account with access to me-central-1
2. Route 53 hosted zone for your domain
3. Terraform >= 1.5.0
4. GitHub repository configured with OIDC

**Initial Deployment:**

1. **Deploy Infrastructure:**
   ```bash
   cd infra/terraform
   terraform init
   terraform apply -var="domain_name=yourdomain.sa"
   ```

2. **Push Docker Image:**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region me-central-1 | \
     docker login --username AWS --password-stdin \
     $(terraform output -raw ecr_repository_url | cut -d'/' -f1)
   
   # Build and push
   docker build -f api.Dockerfile.prod -t consentvault/api:latest .
   docker tag consentvault/api:latest $(terraform output -raw ecr_repository_url):latest
   docker push $(terraform output -raw ecr_repository_url):latest
   ```

3. **Update ECS Service:**
   ```bash
   aws ecs update-service \
     --cluster consentvault-prod \
     --service consentvault-prod-api-service \
     --force-new-deployment \
     --region me-central-1
   ```

4. **Run Migrations:**
   Migrations are automatically run by the CI/CD pipeline. To run manually:
   ```bash
   # Get VPC info
   VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=consentvault-prod-vpc" --region me-central-1 --query 'Vpcs[0].VpcId' --output text)
   SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Type,Values=private" --region me-central-1 --query 'Subnets[*].SubnetId' --output text | tr '\t' ',')
   SG=$(aws ec2 describe-security-groups --filters "Name=tag:Name,Values=consentvault-prod-api-sg" --region me-central-1 --query 'SecurityGroups[0].GroupId' --output text)
   
   # Run migration task
   aws ecs run-task \
     --cluster consentvault-prod \
     --task-definition consentvault-prod-api \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=DISABLED}" \
     --overrides '{"containerOverrides":[{"name":"api","command":["alembic","upgrade","head"]}]}' \
     --region me-central-1
   ```

**CI/CD Deployment:**

The GitHub Actions workflow (`.github/workflows/prod.yml`) automates:
1. Building and pushing Docker images to ECR
2. Deploying infrastructure changes (Terraform)
3. Updating ECS service with new image
4. Running database migrations
5. Smoke tests

**Trigger deployment:**
- Push a tag starting with `v*` (e.g., `v1.0.0`)
- Or manually trigger from GitHub Actions UI

**Required GitHub Secrets:**
- `AWS_ROLE_ARN`: IAM role ARN for GitHub Actions (from Terraform output)
- `AWS_ACCOUNT_ID`: Your AWS account ID
- `AWS_REGION`: `me-central-1`
- `PROD_DOMAIN`: Your domain (e.g., `yourdomain.sa`)
- `PROD_SUBDOMAIN`: `api`

**Secrets Management:**

All secrets are stored in AWS Secrets Manager:
- `consentvault/prod/app-secrets`: DATABASE_URL, REDIS_URL, MASTER_ENCRYPTION_KEY, etc.
- `consentvault/prod/db-password`: RDS password
- `consentvault/prod/redis-password`: Redis auth token

ECS tasks automatically inject secrets as environment variables.

**Monitoring:**

- **CloudWatch Logs**: `/ecs/consentvault-prod-api` (90 day retention)
- **ECS Service**: Monitor task health via AWS Console
- **ALB**: Health checks on `/healthz` endpoint
- **RDS/Redis**: CloudWatch metrics

**PDPL Compliance:**

✅ All resources in `me-central-1` (Riyadh)  
✅ No cross-border data transfer  
✅ Encryption at rest (KMS) and in transit (TLS)  
✅ All logs and backups remain in KSA  
✅ No global services or cross-region endpoints  

**For detailed infrastructure documentation, see [`infra/terraform/README.md`](infra/terraform/README.md)**

### HTTPS Setup

The staging/production compose files include Nginx as a reverse proxy. For HTTPS:

- **Option 1**: Use Cloudflare or similar CDN in front (recommended)
- **Option 2**: Add Caddy or certbot to the Nginx container
- **Option 3**: Use a load balancer with TLS termination

Update `docker/nginx/nginx.staging.conf` and `docker/nginx/nginx.prod.conf` to add SSL configuration when ready.

## Observability

### Metrics

Prometheus metrics are exposed at `/metrics`:

```bash
curl http://localhost:8000/metrics
```

Key metrics include:
- HTTP request counts by method, status code, and endpoint
- Request duration histograms
- Active connections

### Logging

Structured JSON logs via `structlog`:

```bash
# View logs
docker compose -f docker/docker-compose.staging.yml logs -f api
```

Logs are JSON-formatted for easy ingestion into log aggregation systems (Datadog, ELK, etc.).

### Health Checks

The `/healthz` endpoint checks:
- Database connectivity
- Redis connectivity

Returns `200` if healthy, `503` if degraded.

## Data Model

- **Organization**: Multi-tenant root entity with data region (KSA/UAE)
- **ApiKey**: Hashed keys with encrypted HMAC secrets
- **Purpose**: Consent purposes (marketing, analytics, etc.)
- **ConsentAggregate**: Current consent state per user+purpose
- **ConsentEvent**: Append-only event log with hash chain
- **DataRightRequest**: Access, erasure, portability requests
- **Policy**: Retention policies (purpose → retention_days)
- **WebhookEndpoint**: Per-org webhook URLs with encrypted secrets
- **WebhookDelivery**: Delivery tracking with retry logic
- **AuditLog**: Tamper-evident audit trail

## Database Setup

All database migrations run inside the Docker container to ensure consistency with the deployed environment.

### Initial Setup

1. **Build the API image:**
   ```bash
   cd docker
   docker compose build api
   ```

2. **Start services:**
   ```bash
   docker compose up -d
   ```

3. **Apply migrations:**
   ```bash
   docker compose exec api alembic upgrade head
   ```
   
   This connects to PostgreSQL in the `db` container and applies all migrations.

4. **Create first organization:**
   ```bash
   docker compose exec api python setup_org.py
   ```
   
   This creates your first organization and API key. **Save the API key** - it's shown only once.

### Running Migrations

All Alembic commands run inside the container:

```bash
# Check current migration version
docker compose exec api alembic current

# Apply all pending migrations
docker compose exec api alembic upgrade head

# Create a new migration
docker compose exec api alembic revision --autogenerate -m "description"

# Rollback one migration
docker compose exec api alembic downgrade -1
```

**Note:** No local Python dependencies required. All migrations, Alembic, and psycopg run inside the container environment.

Alembic migrations now rely on SQLAlchemy's inline enum creation. Manual `.create()` calls have been removed to prevent duplicate DDL execution.

### Database Migrations & RBAC Enum Safety

ConsentVault uses Alembic + SQLAlchemy for schema versioning. The migration system has been hardened for enum safety, dev resets, and RBAC evolution.

#### 1. Running Migrations

Run migrations inside Docker:

```bash
# Apply all migrations
docker compose exec api alembic upgrade head

# Check current migration version
docker compose exec api alembic current

# Roll back to base
docker compose exec api alembic downgrade base
```

Migrations automatically run a pre-flight enum cleanup before applying changes:

```
🔍 Checking for stale enums before migration...
✅ Enum cleanup complete.
```

This ensures your schema never fails with `psycopg.errors.DuplicateObject: type "userrole_enum" already exists`.

#### 2. RBAC Roles & Enum Storage

ConsentVault enforces Role-Based Access Control (RBAC) with three roles:

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full access to organizations, users, and data |
| **AUDITOR** | Read-only access to compliance and audit logs |
| **VIEWER** | Restricted, minimal access to dashboards only |

**Storage Strategy:**

Roles are stored as `VARCHAR(7)` for maximum migration stability.

Validation occurs at the ORM + API level via the `require_role()` dependency.

This prevents PostgreSQL enum duplication issues during migration.

- ✅ **Recommended:** keep roles as VARCHAR.
- ❗ **Optional:** convert to native Postgres enum later if desired.

To convert later (optional):

```sql
CREATE TYPE userrole_enum AS ENUM ('ADMIN', 'AUDITOR', 'VIEWER');
ALTER TABLE users
  ALTER COLUMN role TYPE userrole_enum
  USING role::userrole_enum;
```

#### 3. Development Data Reset

A safe, dev-only reset script is included to restore a clean state for local testing.

```bash
docker compose exec -e ENV=development api python apps/api/scripts/reset_dev_data.py
```

If you accidentally run it outside dev mode, you'll see:

```
❌ This script can only run in development mode.
```

**What it does:**

- Auto-creates a default organization if none exist
- Keeps the most recent organization (or the newly created one)
- Reassigns all API keys to that org
- Clears audit logs, consents, and other non-critical data
- Seeds a default admin user `admin@example.com` (role=ADMIN)

#### 4. Local Verification Commands

```bash
# Check the schema
docker compose exec db psql -U consentvault -d consentvault -c "\d users"

# See applied migrations
docker compose exec api alembic history

# Check current head
docker compose exec api alembic current
```

Expected result for the users table:

```
role | character varying(7) | not null | default 'VIEWER'::character varying
```

#### 5. CI/CD Recommendation

In your CI pipeline:

```bash
docker compose exec api alembic upgrade head
docker compose exec api alembic current
```

This ensures schema alignment before deploy. No manual cleanup or enum handling is ever required.

**Summary:**

- ✅ Migrations are idempotent and safe to rerun.
- ✅ Enum cleanup runs automatically pre-migration.
- ✅ RBAC uses a simple and flexible VARCHAR schema.
- ✅ Dev reset is isolated and secure.
- ✅ Production migrations are deterministic and CI-ready.

## Testing

```bash
# Run tests
docker compose exec api pytest tests/ -v

# With coverage
docker compose exec api pytest tests/ --cov=apps.api --cov-report=html
```

## Environment Variables

See `.env.example` for configuration:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `MASTER_ENCRYPTION_KEY`: 32-byte base64 key for Fernet encryption
- `RATE_LIMIT_PER_MIN`: Requests per minute (default: 60)
- `ALLOWED_ORIGINS`: Comma-separated CORS origins (empty = disabled)
- `API_BODY_MAX_BYTES`: Max request body size (default: 1MB)
- `ENABLE_HMAC_VERIFICATION`: Enable HMAC signature verification (default: true)

## Deployment Notes

- **Encryption**: Master key stored in env; replace with KMS in production
- **Database**: AES-256 at rest handled by DB/volume encryption
- **TLS**: Assumed at proxy (nginx/traefik)
- **Regions**: Data region flag (KSA/UAE) for deployment routing
- **Scaling**: Single node ready; can move to K8s later

## Development

### 🔄 Resetting Development Data

To fully reset your local database (organizations, users, API keys, and sample data):

```bash
docker compose exec -e ENV=development api python apps/api/scripts/reset_dev_data.py
```

The script will:
- Auto-create a default organization if none exist
- Seed a default admin user (`admin@example.com` / role=ADMIN)
- Reassign and clean related tables

⚠️ **Do not run in production.** The script only runs when `ENV=development`.

**What it does:**
- Keeps the latest organization (by `created_at`) or creates one if none exist
- Reassigns all API keys and users to that organization
- Deletes all other organizations
- Clears all tenant data tables (users, consents, rights, audit_logs, webhooks, purposes, etc.)
- Resets all ID sequences to start from 1
- Seeds a default admin user: `admin@example.com` (role: ADMIN)

**Note:** The script uses isolated transactions to safely recover from partial failures. Each operation is committed independently, so a single failure won't abort the entire script.

### RBAC & User Management

ConsentVault now includes an organization-scoped user system with roles:
- **ADMIN**: Full access to all features
- **AUDITOR**: Read-only access with audit capabilities
- **VIEWER**: Read-only access

Run migrations to apply this:

```bash
docker compose exec api alembic upgrade head
```

In development, you can reset and reseed users using:

```bash
docker compose exec -e ENV=development api python apps/api/scripts/reset_dev_data.py
```

### Enum Type Safety

All Alembic migrations now include a pre-flight enum cleanup.

If a migration previously failed due to `DuplicateObject: type already exists`,
it will automatically drop and recreate the enum type before continuing.

This makes migrations idempotent and safe to reapply.

Alembic now runs a pre-migration cleanup step that automatically drops stale enum types (like `userrole_enum`) before any migrations begin. This ensures a clean state and prevents duplicate enum errors.

**Note:** The migration cleanup logic now automatically skips system schemas (`pg_catalog`, `information_schema`) to avoid internal PostgreSQL types.

**Implementation:** Enums are now cleaned and committed before migration runs. This guarantees idempotent migrations and removes the "userrole_enum already exists" error completely.

Migrations are now idempotent. Enum creation uses safe `DROP IF EXISTS` and `checkfirst=True` to prevent 'type already exists' errors on re-apply.

**Safety:** This cleanup is only run inside Alembic — it does not modify production data outside of migrations. It's safe for development and staging environments. For production, ensure backups are taken before any migration (as usual).

### Code Quality

```bash
# Format code
ruff check --fix .
black .

# Type check
mypy apps/api

# Pre-commit hooks
pre-commit install
```

## License

Proprietary


