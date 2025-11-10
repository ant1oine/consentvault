#!/bin/bash
# Smoke test for ConsentVault Core

API_BASE="http://localhost:8000"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Running ConsentVault Core smoke tests..."
echo ""

# Test 1: Health check
echo "1. Testing /healthz..."
if curl -sf "$API_BASE/healthz" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi

# Test 2: Docs
echo "2. Testing /docs..."
if curl -sf "$API_BASE/docs" > /dev/null; then
    echo -e "${GREEN}✅ Docs accessible${NC}"
else
    echo -e "${RED}❌ Docs not accessible${NC}"
    exit 1
fi

# Test 3: Auth login endpoint exists
echo "3. Testing /auth/login endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}')
if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "422" ]; then
    echo -e "${GREEN}✅ Auth login endpoint exists (returned $RESPONSE)${NC}"
else
    echo -e "${RED}❌ Auth login endpoint failed (returned $RESPONSE)${NC}"
    exit 1
fi

# Test 4: Widget.js
echo "4. Testing /widget.js..."
if curl -sf "$API_BASE/widget.js" > /dev/null; then
    echo -e "${GREEN}✅ Widget.js accessible${NC}"
else
    echo -e "${RED}❌ Widget.js not accessible${NC}"
    exit 1
fi

# Test 5: Root endpoint
echo "5. Testing root endpoint..."
if curl -sf "$API_BASE/" > /dev/null; then
    echo -e "${GREEN}✅ Root endpoint accessible${NC}"
else
    echo -e "${RED}❌ Root endpoint failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All smoke tests passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Create a user: make create-user EMAIL=admin@example.com PASSWORD=password123"
echo "  2. Login: POST /auth/login"
echo "  3. Create org: POST /orgs"
echo "  4. Create consent: POST /consents?org_id=..."

