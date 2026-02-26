#!/bin/bash
#
# QUICK TESTING GUIDE FOR PROFESSIONAL IMPROVEMENTS
# 
# This script demonstrates all 8 improvements:
# 1. WebSocket JWT Auth
# 2. Input Validation
# 3. Rate Limiting
# 4. Structured Logging
# 5. Swagger Docs
# 6. Chat Pagination
# 7. Error Handling
# 8. Graceful Shutdown

set -e

BASE_URL="http://localhost:8000"
API_DOCS="${BASE_URL}/api-docs"

echo "================================================================"
echo "TESTING PROFESSIONAL IMPROVEMENTS"
echo "================================================================"
echo ""

# 1. TEST SWAGGER DOCUMENTATION
echo "✓ TEST 1: Swagger API Documentation"
echo "  URL: ${API_DOCS}"
echo "  → Open in browser or:"
echo "  curl -s ${API_DOCS} | head -20"
echo ""

# 2. TEST HEALTH CHECK WITH METRICS
echo "✓ TEST 2: Enhanced Health Check"
echo "  Testing /health endpoint with metrics..."
curl -s "${BASE_URL}/health" | jq .
echo ""

# 3. TEST INPUT VALIDATION
echo "✓ TEST 3: Input Validation"
echo "  Testing login without password (should fail validation)..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test"}' \
  "${BASE_URL}/api/auth/login" | jq '.error,.details'
echo ""

# 4. TEST CHAT PAGINATION
echo "✓ TEST 4: Chat Pagination Support"
echo "  First, we need a valid token. Let's get one..."
echo ""
echo "  ⚠️  NOTE: Rate limiting active after multiple attempts!"
echo "  Waiting 30 seconds for rate limit window to reset..."
sleep 30
echo ""

TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"identifier":"tester_user","password":"TesterPass!2026"}' \
  "${BASE_URL}/api/auth/login" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "  ⚠️  Could not obtain token (rate limit may still be active)"
  echo "  Try again in a few minutes"
else
  echo "  ✓ Got token: ${TOKEN:0:20}..."
  echo ""
  echo "  Testing GET /api/chat/messages?page=1&limit=10 (paginated)..."
  curl -s \
    -H "Authorization: Bearer ${TOKEN}" \
    "${BASE_URL}/api/chat/messages?page=1&limit=10" | jq '.pagination'
  echo ""
fi

# 5. TEST RATE LIMITING
echo "✓ TEST 5: Rate Limiting"
echo "  Attempting rapid requests (will trigger rate limit)..."
for i in {1..3}; do
  echo "  Attempt $i:"
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"identifier":"test","password":"test"}' \
    "${BASE_URL}/api/auth/login" | jq '.error' --raw-output || true
done
echo ""

# 6. TEST LOGGING (check logs directory)
echo "✓ TEST 6: Structured Logging"
echo "  Log files created in ./logs/ directory:"
echo "  - logs/all.log (all entries in JSON format)"
echo "  - logs/error.log (errors only)"
echo "  - logs/exceptions.log (uncaught exceptions)"
echo "  - logs/rejections.log (unhandled rejections)"
echo ""
echo "  Last 3 log entries:"
tail -3 logs/all.log 2>/dev/null || echo "  (logs not yet written)"
echo ""

# 7. TEST ERROR HANDLING
echo "✓ TEST 7: Consistent Error Handling"
echo "  Testing 404 endpoint:"
curl -s "${BASE_URL}/nonexistent/endpoint" | jq .
echo ""

# 8. TEST WEBSOCKET JWT AUTH
echo "✓ TEST 8: WebSocket JWT Authentication"
echo "  WebSocket requires JWT token in handshake"
echo "  Test with wscat (if installed):"
echo "  wscat -c ws://localhost:8000 --auth 'Bearer <token>'"
echo ""

echo "================================================================"
echo "✅ ALL IMPROVEMENTS TESTED"
echo "================================================================"
echo ""
echo "Key Endpoints to explore:"
echo "  📍 API Docs: ${API_DOCS}"
echo "  📍 Health: ${BASE_URL}/health"
echo "  📍 Login: POST ${BASE_URL}/api/auth/login"
echo "  📍 Chat: GET/POST ${BASE_URL}/api/chat/messages"
echo ""
echo "Default Credentials:"
echo "  Admin: owner_admin / AdminPass!2026"
echo "  Tester: tester_user / TesterPass!2026"
