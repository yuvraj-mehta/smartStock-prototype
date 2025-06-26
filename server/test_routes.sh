#!/bin/bash

echo "=== SmartStock Server Route Testing ==="
echo "Server URL: http://localhost:3500"
echo ""

# Test Health endpoint
echo "1. Testing Health Endpoint:"
echo "GET /health"
response=$(curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:3500/health)
echo "$response"
echo ""

# Test all API routes
routes=(
  "auth"
  "users" 
  "products"
  "inventory"
  "alerts"
  "locations"
  "assistant"
  "forecast"
)

echo "2. Testing API Routes:"
for route in "${routes[@]}"; do
  echo "GET /api/v1/$route/"
  response=$(curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:3500/api/v1/$route/)
  echo "$response"
  echo ""
done

# Test 404 handler
echo "3. Testing 404 Handler:"
echo "GET /api/v1/nonexistent/"
response=$(curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:3500/api/v1/nonexistent/)
echo "$response"
echo ""

echo "=== Route Testing Complete ==="
