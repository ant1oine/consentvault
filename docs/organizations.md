# Organization & Access Management

ConsentVault is multi-tenant: every API key, user, consent, and webhook belongs to an organization. This guide explains how to create orgs, rotate keys, and manage default admins.

## Default Development Org
`make reset` runs two scripts:
1. `apps/api/scripts/reset_dev_data.py` – wipes tenant data, creates/keeps a “Default Organization,” and seeds `admin@example.com`.
2. `setup_org.py` – prints a brand-new API key and HMAC secret tied to that org.

Copy the printed values into the dashboard (lock screen) or your API client. The admin email currently accepts any password in dev; production deployments should wire a proper identity provider or password strategy.

## Creating a New Organization (CLI)
```bash
# Inside the API container or repo root with virtualenv activated
python setup_org.py
```
The script will:
- Check if “Default Organization” exists or create one.
- Generate an API key (`cv_...`) and encrypted HMAC secret.
- Print the org ID, name, region, API key, and HMAC secret.

Run it multiple times to issue additional keys for the same org.

## Creating via API
1. Authenticate with an existing admin API key.
2. Call `POST /v1/admin/organizations`:
   ```bash
   curl -X POST http://localhost:8000/v1/admin/organizations \
     -H "X-Api-Key: YOUR_ADMIN_KEY" \
     -H "Content-Type: application/json" \
     -d '{"name": "Partner Co", "data_region": "KSA"}'
   ```
3. The response includes the new organization payload. Use `POST /v1/admin/api-keys` to mint additional keys.

## Managing API Keys
- List keys: `GET /v1/admin/api-keys`
- Create key: `POST /v1/admin/api-keys {"name": "Integration Key"}`
- Deactivate: `PUT /v1/admin/api-keys/{id}` (set `active=false`).

All key responses mask the secret; only the creation response returns the plaintext value, so store it securely.

## Admin Users
- Seeded user: `admin@example.com` (role: ADMIN, active).
- Create more via `POST /v1/admin/users` with headers `X-Api-Key` and optional `X-Organization-ID`.
- Roles: `ADMIN`, `AUDITOR`, `VIEWER`. APIs enforce org scoping automatically.

## HMAC Secrets & Webhooks
Every API key has an encrypted HMAC secret used for webhook signature verification. Retrieve it from the database only if you have direct DB access. When creating webhooks via `POST /v1/admin/webhooks`, provide your own webhook-level secret; the system stores it encrypted using `MASTER_ENCRYPTION_KEY`.

Refer to [makefile.md](makefile.md) for automation and [runbook.md](runbook.md) for operational procedures (rotations, incident response).
