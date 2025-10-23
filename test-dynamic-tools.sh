#!/bin/bash
# Test script for dynamic tool loading

echo "========================================="
echo "MCP Server Dynamic Tools Test"
echo "========================================="
echo ""

# Check if server is running
echo "1. Checking if server is running..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ Server is running"
    echo ""
    curl -s http://localhost:3000/health | jq .
    echo ""
else
    echo "✗ Server is not running"
    echo ""
    echo "Please start the server with:"
    echo "  MCP_TRANSPORT=http npm start"
    echo ""
    exit 1
fi

echo "========================================="
echo "2. Testing discover_tool_categories..."
echo "========================================="
curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "discover_tool_categories",
      "arguments": {}
    }
  }' | jq '.result.content[0].text | fromjson' 2>/dev/null || echo "Failed to call tool"

echo ""
echo "========================================="
echo "3. Testing enable_tool_category..."
echo "========================================="
curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "enable_tool_category",
      "arguments": {
        "category": "automations"
      }
    }
  }' | jq '.result.content[0].text | fromjson' 2>/dev/null || echo "Failed to call tool"

echo ""
echo "========================================="
echo "4. Listing tools after enabling category..."
echo "========================================="
curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/list",
    "params": {}
  }' | jq '.result.tools | length' 2>/dev/null | xargs -I {} echo "Total tools available: {}"

echo ""
echo "========================================="
echo "Test Complete!"
echo "========================================="
