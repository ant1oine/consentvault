# ConsentVault

Production-grade consent management API for GCC builders. Handles consent logging, withdrawals, data-rights requests, and audit evidence.

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
- **Rate Limiting**: Redis token bucket per API key (default: 60 req/min)
- **Tenant Isolation**: Row-level scoping by organization_id
- **Audit Hash Chain**: Tamper-evident audit log with SHA-256 chain
- **Field Encryption**: Optional Fernet encryption for sensitive fields
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, etc.
- **Body Size Limits**: Configurable (default: 1MB)

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


