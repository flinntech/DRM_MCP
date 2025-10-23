# Testing MCP Server with n8n

## Issue: "Not Found: Resource does not exist"

This error typically means:
1. The MCP server isn't running
2. The endpoint URL is incorrect
3. The request format doesn't match MCP protocol

## Setup Steps

### 1. Configure API Credentials

Edit `.env` file with your Digi Remote Manager credentials:

```bash
DRM_API_KEY_ID=your_actual_key_id
DRM_API_KEY_SECRET=your_actual_secret
MCP_TRANSPORT=http
MCP_PORT=3000
```

### 2. Start the Server

```bash
npm start
```

The server will output:
```
✓ DRM MCP Server initialized with API Key authentication
✓ Dynamic tool loading enabled - use 'discover_tool_categories' to see available categories
Digi Remote Manager MCP server running on HTTP port 3000
Streamable HTTP endpoint: http://localhost:3000/mcp
Health check: http://localhost:3000/health
```

### 3. Test the Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "server": "digi-remote-manager-mcp",
  "version": "3.0.0",
  "transport": "streamable-http",
  "endpoint": "/mcp",
  "dynamic_tools": true,
  "core_tools": 13,
  "total_tools": 62,
  "categories": 10,
  "enabled_categories": 0
}
```

## Correct MCP Request Format

### For n8n HTTP Request Node

**Method:** POST
**URL:** `http://localhost:3000/mcp`
**Content-Type:** `application/json`

**Body for `enable_tool_category`:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "enable_tool_category",
    "arguments": {
      "category": "automations"
    }
  }
}
```

**Body for `discover_tool_categories`:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "discover_tool_categories",
    "arguments": {}
  }
}
```

### Expected Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{...tool response...}"
      }
    ]
  }
}
```

## Your Request Format (Incorrect)

Your n8n request was:
```json
{
  "query": {
    "category": "automations"
  },
  "tool": {
    "name": "enable_tool_category"
  }
}
```

**Issue:** This isn't MCP protocol format. You need to use the JSON-RPC 2.0 format shown above.

## Testing with curl

### 1. Discover Categories

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "discover_tool_categories",
      "arguments": {}
    }
  }'
```

### 2. Enable Automations Category

```bash
curl -X POST http://localhost:3000/mcp \
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
  }'
```

### 3. List Available Tools

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/list",
    "params": {}
  }'
```

## Available Categories

After calling `discover_tool_categories`, you can enable:

- `bulk_operations` - CSV exports (6 tools)
- `advanced_data` - Rollups, logs (3 tools)
- `reports` - Analytics dashboards (6 tools)
- `automations` - Workflow management (6 tools)
- `firmware` - Firmware operations (4 tools)
- `sci` - Direct device commands (9 tools)
- `monitors` - Webhooks (3 tools)
- `jobs` - Async operations (2 tools)
- `admin` - Config management (9 tools)
- `events` - Audit trail (2 tools)

## n8n Configuration

### HTTP Request Node Settings

1. **Method:** POST
2. **URL:** `http://localhost:3000/mcp`
3. **Authentication:** None (uses API key in server .env)
4. **Body Content Type:** JSON
5. **Specify Body:** Using JSON
6. **JSON:** Paste the MCP request format above

### Example n8n Workflow

```json
{
  "nodes": [
    {
      "parameters": {
        "url": "http://localhost:3000/mcp",
        "method": "POST",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"enable_tool_category\",\"arguments\":{\"category\":\"automations\"}}}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [250, 300],
      "name": "Enable Automations Category"
    }
  ]
}
```

## Troubleshooting

### Error: "Not Found: Resource does not exist"
- **Cause:** Server not running or wrong endpoint
- **Fix:** Start server with `npm start` and use `http://localhost:3000/mcp`

### Error: "ECONNREFUSED"
- **Cause:** Server not running
- **Fix:** Run `npm start` in the DRM_MCP directory

### Error: "Authentication Error: Invalid API key"
- **Cause:** Missing or invalid credentials in .env
- **Fix:** Update .env with valid DRM_API_KEY_ID and DRM_API_KEY_SECRET

### Error: "Unknown tool: enable_tool_category"
- **Cause:** Using old server version
- **Fix:** Pull latest changes: `git pull origin claude/optimize-server-tools-011CUQeHBw7vFXn9Qt63QY3a`

## Docker Deployment for n8n

If running n8n in Docker, update docker-compose.yml:

```yaml
version: '3.8'
services:
  drm-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DRM_API_KEY_ID=${DRM_API_KEY_ID}
      - DRM_API_KEY_SECRET=${DRM_API_KEY_SECRET}
      - MCP_TRANSPORT=http
      - MCP_PORT=3000
    networks:
      - n8n-network

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    networks:
      - n8n-network

networks:
  n8n-network:
    driver: bridge
```

Then use URL: `http://drm-mcp:3000/mcp` in n8n workflows.
