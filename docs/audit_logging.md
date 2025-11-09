# Audit Logging & Verification

ConsentVault provides regulator-grade audit logging with cryptographic integrity verification. Every API request and response is logged with SHA-256 hashes, creating an immutable, tamper-evident audit trail that meets PDPL, GDPR, and ISO27001 compliance requirements.

## Overview

The audit logging system automatically captures:
- **Request metadata**: Method, path, IP address, organization, API key
- **Response metadata**: Status code, timestamp
- **Cryptographic hashes**: SHA-256 digests of request and response bodies
- **Verification tracking**: Who verified what and when

This creates a complete audit trail that can prove data integrity to regulators without storing PII in the logs.

## How It Works

### Automatic Logging

Every API call (except health checks and metrics) is automatically logged by the `AuditLogMiddleware`:

1. **Request capture**: The middleware intercepts the request and computes a SHA-256 hash of the request body
2. **Response capture**: After processing, it captures the response body and computes its SHA-256 hash
3. **Database storage**: Both hashes, along with metadata, are stored in the `api_audit_logs` table

### Cryptographic Integrity

- **SHA-256 hashing**: All request and response bodies are hashed using SHA-256
- **Immutable logs**: Once created, audit log entries cannot be modified or deleted
- **Hash verification**: You can verify any payload's authenticity by comparing its hash against stored audit logs

### Verification Tracking

When a payload is verified:
- `verified_at`: Timestamp of when verification occurred
- `verifier_api_key_id`: ID of the API key that performed the verification

This creates a "proof-of-verification" ledger showing who verified what and when.

## API Endpoints

### List Audit Logs

**GET** `/v1/admin/audit/`

Returns recent audit logs with verification status.

**Authentication**: Requires API key with ADMIN or SUPERADMIN role

**Response**:
```json
[
  {
    "id": 8,
    "organization_id": 1,
    "api_key_id": 3,
    "method": "GET",
    "path": "/v1/admin/organizations",
    "status_code": 200,
    "ip_address": "172.18.0.1",
    "request_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "response_hash": "4ff7866631f88b37212b373d93528d6538ecd894d89505a579d2b3aed2bba423",
    "created_at": "2025-11-09T05:49:45.869532+00:00",
    "verified_at": "2025-11-09T06:03:16.449475+00:00",
    "verifier_api_key_id": 3
  }
]
```

**Access Control**:
- **SUPERADMIN**: Sees all audit logs across all organizations
- **ADMIN/AUDITOR**: Sees only their organization's audit logs

**Example**:
```bash
curl -X GET http://localhost:8000/v1/admin/audit/ \
  -H "X-Api-Key: cv_your_api_key_here"
```

### Verify Payload Hash

**POST** `/v1/admin/audit/verify`

Computes the SHA-256 hash of a provided payload and checks if it exists in the audit logs. If a match is found, the entry is permanently marked as verified.

**Authentication**: Requires API key with ADMIN or SUPERADMIN role

**Request Body**:
```json
{
  "payload": {
    "id": 1,
    "name": "Example Organization",
    "data_region": "KSA",
    "status": "active"
  }
}
```

Or with a JSON string:
```json
{
  "payload": "[{\"id\":1,\"name\":\"Example\"}]"
}
```

**Response (Match Found)**:
```json
{
  "hash": "4ff7866631f88b37212b373d93528d6538ecd894d89505a579d2b3aed2bba423",
  "matches": true,
  "matched_entry_id": 8,
  "method": "GET",
  "path": "/v1/admin/organizations",
  "created_at": "2025-11-09T05:49:45.869532+00:00",
  "verified_at": "2025-11-09T06:03:16.449475+00:00",
  "verifier_api_key_id": 3
}
```

**Response (No Match)**:
```json
{
  "hash": "abc123...",
  "matches": false,
  "matched_entry_id": null,
  "method": null,
  "path": null,
  "created_at": null,
  "verified_at": null,
  "verifier_api_key_id": null
}
```

**Behavior**:
- If a match is found and the entry hasn't been verified yet, it's automatically marked as verified
- `verified_at` is set to the current UTC timestamp
- `verifier_api_key_id` is set to the API key that performed the verification
- If the entry was already verified, the existing verification data is returned (append-only)

**Example**:
```bash
# Using jq to format the payload
PAYLOAD=$(cat response.json | jq -c '.')
curl -X POST http://localhost:8000/v1/admin/audit/verify \
  -H "X-Api-Key: cv_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d "$(jq -nc --arg payload "$PAYLOAD" '{payload: $payload}')"
```

### Compute Hash Only

**POST** `/v1/admin/audit/hash`

Computes the SHA-256 hash of a payload without checking against audit logs. Useful for generating cryptographic evidence locally.

**Authentication**: Not required (public endpoint)

**Request Body**:
```json
{
  "payload": {
    "foo": "bar"
  }
}
```

**Response**:
```json
{
  "hash": "7a38bf81f383f69433ad6e900d35b3e2385593f76a7b7ab5d4355b8ba41ee24b"
}
```

**Example**:
```bash
curl -X POST http://localhost:8000/v1/admin/audit/hash \
  -H "Content-Type: application/json" \
  -d '{"payload": {"foo": "bar"}}'
```

### Export Audit Logs

**GET** `/v1/admin/audit/export`

Exports audit logs in CSV or JSON format for compliance reporting and archival.

**Authentication**: Requires API key with SUPERADMIN role

**Query Parameters**:
- `format` (optional): Export format - `csv` or `json` (default: `csv`)

**Response**: Streaming response with the export file

**Example**:
```bash
# Export as CSV
curl -X GET "http://localhost:8000/v1/admin/audit/export?format=csv" \
  -H "X-Api-Key: cv_your_superadmin_key" \
  -o audit_logs.csv

# Export as JSON
curl -X GET "http://localhost:8000/v1/admin/audit/export?format=json" \
  -H "X-Api-Key: cv_your_superadmin_key" \
  -o audit_logs.json
```

### Export Audit Logs with Cryptographic Signature

**GET** `/v1/admin/audit/export/signed`

Exports audit logs with a cryptographic signature for tamper-proof verification. Each export includes a detached `.sig` file generated using SHA-256 + Ed25519 digital signatures.

**Authentication**: Requires API key with SUPERADMIN role

**Query Parameters**:
- `format` (optional): Export format - `csv` or `json` (default: `csv`)

**Response**:
```json
{
  "data": "base64-encoded-export-data",
  "data_filename": "audit_logs_2025-01-15T120000.csv",
  "signature": "base64-encoded-signature",
  "signature_filename": "audit_logs_2025-01-15T120000.csv.sig",
  "format": "csv",
  "timestamp": "2025-01-15T120000"
}
```

**Example**:
```bash
# Get signed export
curl -X GET "http://localhost:8000/v1/admin/audit/export/signed?format=csv" \
  -H "X-Api-Key: cv_your_superadmin_key" \
  -o signed_export.json

# Extract and save files
cat signed_export.json | jq -r '.data' | base64 -d > audit_logs.csv
cat signed_export.json | jq -r '.signature' > audit_logs.csv.sig
```

**Key Generation**:

Before using signed exports, generate an Ed25519 keypair:

```bash
python scripts/gen_audit_keypair.py
```

This creates:
- `keys/audit_private.key` - Private key (keep secure, store in backend container)
- `keys/audit_public.key` - Public key (share with auditors for verification)

**Signature Verification**:

Auditors can verify exported files using the verification script:

```bash
python scripts/verify_audit_signature.py \
  audit_logs_2025-01-15T120000.csv \
  audit_logs_2025-01-15T120000.csv.sig \
  keys/audit_public.key
```

Or programmatically:

```python
from nacl.signing import VerifyKey
import base64, hashlib

pub = open("keys/audit_public.key").read().strip()
sig = open("audit_logs.csv.sig").read().strip()
data = open("audit_logs.csv", "rb").read()

vk = VerifyKey(base64.b64decode(pub))
vk.verify(hashlib.sha256(data).digest(), base64.b64decode(sig))
print("✅ Verified")
```

**Security Notes**:
- The private key must be stored securely in the backend container (not committed to version control)
- The public key can be safely shared with auditors and external parties
- Each export is signed with a unique signature based on the file's SHA-256 digest
- Tampering with the exported file will cause verification to fail

## Use Cases

### 1. Regulatory Compliance

Prove to regulators that specific data was processed at a specific time:

```bash
# Get the response you want to verify
curl -X GET http://localhost:8000/v1/admin/organizations \
  -H "X-Api-Key: cv_your_key" \
  -o response.json

# Verify it against the audit trail
PAYLOAD=$(cat response.json | jq -c '.')
curl -X POST http://localhost:8000/v1/admin/audit/verify \
  -H "X-Api-Key: cv_your_key" \
  -H "Content-Type: application/json" \
  -d "$(jq -nc --arg payload "$PAYLOAD" '{payload: $payload}')"
```

The response will show:
- Whether the payload matches an audit log entry
- When the original request was made
- When it was verified
- Who verified it (via `verifier_api_key_id`)

### 2. Data Integrity Verification

Verify that a response hasn't been tampered with:

```bash
# Compute hash of your local copy
LOCAL_HASH=$(curl -X POST http://localhost:8000/v1/admin/audit/hash \
  -H "Content-Type: application/json" \
  -d "$(jq -nc --argjson payload "$(cat response.json)" '{payload: $payload}')" | jq -r '.hash')

# Check if it exists in audit logs
curl -X GET "http://localhost:8000/v1/admin/audit/?response_hash=$LOCAL_HASH" \
  -H "X-Api-Key: cv_your_key"
```

### 3. Audit Trail Review

Review all verified entries for compliance reporting:

```bash
curl -X GET http://localhost:8000/v1/admin/audit/ \
  -H "X-Api-Key: cv_your_key" | \
  jq '.[] | select(.verified_at != null) | {id, path, verified_at, verifier_api_key_id}'
```

## Compliance Features

### PDPL (UAE Personal Data Protection Law)

- **Article 30 - Records of Processing**: Complete audit trail of all API activity
- **Data Integrity**: Cryptographic hashes prove data hasn't been tampered with
- **Access Logging**: Every API call is logged with organization, API key, and timestamp

### GDPR (General Data Protection Regulation)

- **Article 30 - Records of Processing Activities**: Immutable logs of all data processing
- **Accountability**: Verification tracking shows who verified what and when
- **Data Minimization**: Only hashes are stored, not the actual PII

### ISO 27001

- **A.12.4.1 - Event Logging**: Comprehensive logging of all API events
- **A.12.4.2 - Log Protection**: Immutable, tamper-evident audit trail with cryptographic signatures
- **A.12.4.3 - Administrator and Operator Logs**: Tracks who performed verification
- **A.12.4.3 - Integrity Verification**: Cryptographic signing of exported audit logs enables independent verification

## Database Schema

The `api_audit_logs` table structure:

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `organization_id` | Integer | Organization that made the request |
| `api_key_id` | Integer | API key used for the request |
| `method` | String(10) | HTTP method (GET, POST, etc.) |
| `path` | String(255) | API endpoint path |
| `status_code` | Integer | HTTP status code |
| `ip_address` | String(45) | Client IP address |
| `request_hash` | String(64) | SHA-256 hash of request body |
| `response_hash` | String(64) | SHA-256 hash of response body |
| `created_at` | DateTime | When the request was made |
| `verified_at` | DateTime | When the entry was verified (nullable) |
| `verifier_api_key_id` | Integer | API key that verified the entry (nullable) |

## Best Practices

1. **Regular Verification**: Periodically verify critical responses to maintain a verification trail
2. **Hash Consistency**: Always use the same JSON serialization (no extra spaces, consistent key ordering) when computing hashes
3. **Access Control**: Use SUPERADMIN keys for cross-organization audit reviews
4. **Retention Policy**: Consider implementing a retention policy for old audit logs based on compliance requirements
5. **Monitoring**: Monitor the audit log table size and implement archival if needed

## Troubleshooting

### Hash Mismatch

If a payload hash doesn't match, check:
- JSON serialization: Ensure consistent formatting (use `jq -c` for compact JSON)
- Encoding: Payloads must be UTF-8 encoded
- Content: Verify the payload hasn't been modified

### Missing Verification

If `verified_at` is null after verification:
- Check that the hash matched an existing audit log entry
- Verify your API key has permission to access the organization's logs
- Ensure the database transaction was committed

### Performance

For high-traffic APIs:
- The audit logging middleware is optimized to not block requests
- Database writes are asynchronous and won't slow down responses
- Consider indexing `verified_at` and `verifier_api_key_id` for faster queries

## Related Documentation

- [Architecture](architecture.md) - System overview and components
- [Runbook](runbook.md) - Operational procedures
- [Organizations](organizations.md) - API key and organization management

