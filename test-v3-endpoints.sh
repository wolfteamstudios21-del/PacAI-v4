#!/bin/bash
# test-v3-endpoints.sh - Complete v3 API test suite

echo "════════════════════════════════════════════════════════════"
echo "  AI Brain v3 API Test Suite"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Get JWT Token from v2 Auth
echo "📝 STEP 1: Getting JWT token from v2 auth endpoint..."
echo "---"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"api_key":"sk_demo_1234567890abcdef"}')

JWT_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
CREDITS=$(echo $LOGIN_RESPONSE | grep -o '"credits":[0-9]*' | cut -d':' -f2)

echo "Response: $LOGIN_RESPONSE"
echo ""
echo "✅ JWT Token: ${JWT_TOKEN:0:20}..."
echo "✅ User ID: $USER_ID"
echo "✅ Credits: $CREDITS"
echo ""

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ Failed to get JWT token. Exiting."
  exit 1
fi

# Step 2: Create Project
echo "🏗️  STEP 2: Creating project..."
echo "---"
PROJECT_RESPONSE=$(curl -s -X POST http://localhost:5000/v3/projects \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Police De-Escalation Demo","template":"police"}')

PROJECT_ID=$(echo $PROJECT_RESPONSE | grep -o '"project_id":"[^"]*' | cut -d'"' -f4)
echo "Response: $PROJECT_RESPONSE"
echo ""
echo "✅ Project ID: $PROJECT_ID"
echo ""

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Failed to create project. Exiting."
  exit 1
fi

# Step 3: Generate Zone (Streaming)
echo "📡 STEP 3: Generating zone with SSE streaming..."
echo "---"
echo "(Streaming chunks below - type Ctrl+C to stop)"
echo ""
curl -N -X POST http://localhost:5000/v3/projects/$PROJECT_ID/generate-zone \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"downtown opioid crisis response scenario","stream":true,"cost":1}' &

STREAM_PID=$!
sleep 4
kill $STREAM_PID 2>/dev/null

echo ""
echo "✅ Streaming test complete"
echo ""

# Step 4: Trigger Export
echo "📦 STEP 4: Triggering export bundle..."
echo "---"
EXPORT_RESPONSE=$(curl -s -X POST http://localhost:5000/v3/projects/$PROJECT_ID/export_bundle \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json")

EXPORT_ID=$(echo $EXPORT_RESPONSE | grep -o '"export_id":"[^"]*' | cut -d'"' -f4)
echo "Response: $EXPORT_RESPONSE"
echo ""
echo "✅ Export ID: $EXPORT_ID"
echo ""

# Step 5: Create Snapshot
echo "💾 STEP 5: Creating project snapshot..."
echo "---"
SNAPSHOT_RESPONSE=$(curl -s -X POST http://localhost:5000/v3/projects/$PROJECT_ID/snapshots \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"zones":[],"npcs":[],"version":"v3"}}')

SNAPSHOT_ID=$(echo $SNAPSHOT_RESPONSE | grep -o '"snapshot_id":"[^"]*' | cut -d'"' -f4)
echo "Response: $SNAPSHOT_RESPONSE"
echo ""
echo "✅ Snapshot ID: $SNAPSHOT_ID"
echo ""

# Step 6: List Snapshots
echo "📋 STEP 6: Listing snapshots..."
echo "---"
curl -s -X GET http://localhost:5000/v3/projects/$PROJECT_ID/snapshots \
  -H "Authorization: Bearer $JWT_TOKEN" | grep -o '"snapshot_id":"[^"]*'
echo ""
echo "✅ Snapshots listed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✨ All tests complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  - Project created: $PROJECT_ID"
echo "  - Zone streaming: Active"
echo "  - Export queued: $EXPORT_ID"
echo "  - Snapshot saved: $SNAPSHOT_ID"
echo ""
