# Docker Deployment with root_default Network

This guide explains how to deploy the DRM MCP Server to connect with your existing Docker network (e.g., for n8n integration).

## Prerequisites

- Docker and Docker Compose installed
- Existing `root_default` network (usually created by n8n or other services)
- DRM API credentials

## Configuration

The MCP server is now configured to connect to the `root_default` network. This allows it to communicate with other services in that network.

## Deployment Steps

### 1. Verify the Network Exists

Check if the `root_default` network exists:

```bash
docker network ls | grep root_default
```

If it doesn't exist, you can create it:

```bash
docker network create root_default
```

Or use the network name from your n8n setup (check with `docker network ls`).

### 2. Configure Environment Variables

Edit `.env` file with your credentials:

```bash
cp .env.example .env
nano .env
```

Add your DRM credentials:

```env
DRM_API_KEY_ID=your_actual_key_id_here
DRM_API_KEY_SECRET=your_actual_secret_here
MCP_TRANSPORT=http
MCP_PORT=3000
NODE_ENV=production
```

### 3. Build and Start the Container

```bash
# Build the image
docker-compose build

# Start the service
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 4. Verify the Service is Running

**Check container status:**
```bash
docker ps | grep drm-mcp-server
```

**Check health:**
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

**Verify network connection:**
```bash
docker network inspect root_default | grep drm-mcp-server
```

## Using from n8n

If your n8n is also on the `root_default` network, you can now access the MCP server using the container name:

### HTTP Request Node Configuration

- **URL:** `http://drm-mcp-server:3000/mcp` (use container name, not localhost)
- **Method:** POST
- **Headers:**
  - `Content-Type: application/json`
- **Body:**

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

## Network Architecture

```
┌─────────────────────────────────────┐
│     Docker Network: root_default    │
│                                     │
│  ┌──────────┐      ┌──────────┐   │
│  │   n8n    │◄────►│ DRM MCP  │   │
│  │  :5678   │      │  :3000   │   │
│  └──────────┘      └──────────┘   │
│                                     │
│  Access from n8n:                  │
│  http://drm-mcp-server:3000/mcp   │
│                                     │
│  Access from host:                 │
│  http://localhost:3000/mcp        │
└─────────────────────────────────────┘
```

## Testing the Connection from n8n

### 1. Test Health Endpoint

In n8n, create an HTTP Request node:

```json
{
  "method": "GET",
  "url": "http://drm-mcp-server:3000/health"
}
```

### 2. Discover Tool Categories

```json
{
  "method": "POST",
  "url": "http://drm-mcp-server:3000/mcp",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "discover_tool_categories",
      "arguments": {}
    }
  }
}
```

### 3. Enable a Category

```json
{
  "method": "POST",
  "url": "http://drm-mcp-server:3000/mcp",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "enable_tool_category",
      "arguments": {
        "category": "automations"
      }
    }
  }
}
```

### 4. Use a Tool

After enabling the automations category:

```json
{
  "method": "POST",
  "url": "http://drm-mcp-server:3000/mcp",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "list_automations",
      "arguments": {
        "query": "status=\"enabled\""
      }
    }
  }
}
```

## Troubleshooting

### Error: "network root_default not found"

The network doesn't exist. Create it or use the correct network name:

```bash
# List available networks
docker network ls

# Create the network if needed
docker network create root_default

# Or update docker-compose.yaml with your actual network name
```

### Error: "Cannot connect to drm-mcp-server"

1. Check if both containers are on the same network:
   ```bash
   docker network inspect root_default
   ```

2. Verify the MCP server is running:
   ```bash
   docker ps | grep drm-mcp-server
   docker logs drm-mcp-server
   ```

3. Try using the IP address instead:
   ```bash
   # Get the IP address
   docker inspect drm-mcp-server | grep IPAddress

   # Use in n8n: http://<ip-address>:3000/mcp
   ```

### Error: "ECONNREFUSED"

The MCP server isn't running or crashed:

```bash
# Check logs
docker logs drm-mcp-server

# Restart the service
docker-compose restart

# Check if .env has valid credentials
```

### Error: "Authentication Error: Invalid API key"

Your DRM credentials in `.env` are invalid:

1. Verify credentials at https://remotemanager.digi.com → Profile → API Keys
2. Update `.env` file
3. Restart the container: `docker-compose restart`

## Advanced Configuration

### Using a Different Network Name

If your network has a different name (e.g., `n8n_default`), update `docker-compose.yaml`:

```yaml
networks:
  root_default:
    external: true
    name: n8n_default  # Change this to your network name
```

### Exposing Only to Docker Network

If you don't want to expose port 3000 to the host, remove the ports section:

```yaml
# Comment out or remove this section
# ports:
#   - "3000:3000"
```

Then access only via container name from other containers: `http://drm-mcp-server:3000/mcp`

### Multiple Networks

To connect to multiple networks:

```yaml
services:
  drm-mcp-server:
    networks:
      - root_default
      - another_network

networks:
  root_default:
    external: true
    name: root_default
  another_network:
    external: true
    name: another_network
```

## Complete Example with n8n

If you're running both n8n and DRM MCP together:

```yaml
version: '3.8'

services:
  drm-mcp-server:
    build: .
    container_name: drm-mcp-server
    environment:
      - DRM_API_KEY_ID=${DRM_API_KEY_ID}
      - DRM_API_KEY_SECRET=${DRM_API_KEY_SECRET}
      - MCP_TRANSPORT=http
      - MCP_PORT=3000
    ports:
      - "3000:3000"
    networks:
      - root_default
    restart: unless-stopped

  n8n:
    image: n8nio/n8n
    container_name: n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - root_default
    restart: unless-stopped

networks:
  root_default:
    driver: bridge

volumes:
  n8n_data:
```

Then in n8n workflows, use: `http://drm-mcp-server:3000/mcp`

## Monitoring

### View Logs

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker logs drm-mcp-server
```

### Resource Usage

```bash
docker stats drm-mcp-server
```

### Container Info

```bash
docker inspect drm-mcp-server
```

## Stopping and Removing

```bash
# Stop the service
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```
