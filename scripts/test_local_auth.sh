#!/usr/bin/env bash
set -euo pipefail

# API URL - works both inside Docker and from host
API_URL="http://localhost:8000"

EMAIL="admin@example.com"
PASSWORD="password123"

echo "🔐 Testing login flow..."

LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${EMAIL}&password=${PASSWORD}")

# Extract token (try jq first, fallback to python3, then manual)
TOKEN=""
if command -v jq >/dev/null 2>&1; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token // empty' 2>/dev/null || echo "")
elif command -v python3 >/dev/null 2>&1; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', '') or '')" 2>/dev/null || echo "")
else
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//' || echo "")
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed. Response:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in successfully."

ME_RESPONSE=$(curl -s -H "Authorization: Bearer ${TOKEN}" "${API_URL}/auth/me")

if echo "$ME_RESPONSE" | grep -q "$EMAIL"; then
  echo "✅ /auth/me returned valid user."
else
  echo "❌ /auth/me invalid:"
  echo "$ME_RESPONSE"
  exit 1
fi

echo "✅ Local auth test passed."
