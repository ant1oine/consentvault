#!/bin/bash
set -e

API_KEY="36b2b4fd421a810dbaac1f7dafc7da07"  # Wellness Clinics UAE
ORG_ID="c2d56c18-72cb-42a7-a042-ff68286fefc0"
BASE_URL="http://localhost:8000"

echo "===== 🏢 Organization Info ====="
curl -s $BASE_URL/v1/orgs | jq

echo -e "\n===== 📜 List Consents ====="
curl -s $BASE_URL/v1/consents -H "X-API-Key: $API_KEY" | jq

echo -e "\n===== ➕ Create Consent ====="
curl -s -X POST $BASE_URL/v1/consents \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"subject_email":"user@wellnessuae.ae","purpose":"Analytics","status":"granted"}' | jq

echo -e "\n===== ⚖️ Create DSAR ====="
curl -s -X POST $BASE_URL/v1/data-rights \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"subject_email":"user@wellnessuae.ae","request_type":"erase"}' | jq

echo -e "\n===== 📋 List DSARs ====="
curl -s $BASE_URL/v1/data-rights -H "X-API-Key: $API_KEY" | jq

echo -e "\n===== 🕵️ Audit Logs ====="
curl -s $BASE_URL/v1/audit -H "X-API-Key: $API_KEY" | jq

echo -e "\n===== 📊 Dashboard Summary ====="
curl -s "$BASE_URL/v1/dashboard/summary?org_id=$ORG_ID" | jq

echo -e "\n===== ✅ Test Completed Successfully ====="

