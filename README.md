# Digi Remote Manager MCP Server

Model Context Protocol (MCP) server for Digi Remote Manager API integration. Provides 62 tools for managing IoT devices, data streams, alerts, automations, and more.

## Features

- **Dynamic Tool Loading**: Reduces initial context by ~70% - only loads tools you need
- **62 API Tools**: Full coverage of Digi Remote Manager REST API (13 core + 49 on-demand)
- **SCI/RCI Support**: Direct device communication via Server Command Interface
- **Device Management**: Query devices, groups, firmware, configurations
- **Data Streams**: Access time-series telemetry data with rollups
- **Monitoring**: Alerts, monitors, automations, and reports
- **Multiple Transports**: Supports stdio and HTTP transports

## Dynamic Tool System

The server uses a category-based dynamic tool loading system to reduce LLM context usage:

### Core Tools (Always Available - 13 tools)
- **Tool Management**: `discover_tool_categories`, `enable_tool_category`
- **Device Basics**: `list_devices`, `get_device`
- **Stream Basics**: `list_streams`, `get_stream`, `get_stream_history`
- **Organization**: `list_groups`, `get_group`
- **Monitoring**: `list_alerts`, `get_alert`
- **Account**: `get_account_info`, `get_api_info`

### On-Demand Categories (49 tools organized into 10 categories)

Load additional tools by category using `enable_tool_category`:

- **bulk_operations** (6 tools) - CSV export for devices, streams, jobs, events
- **advanced_data** (3 tools) - Stream rollups, aggregations, device logs
- **reports** (6 tools) - Connection, alert, device, cellular, availability reports
- **automations** (6 tools) - Workflow automation management
- **firmware** (4 tools) - Firmware management and updates
- **sci** (9 tools) - Direct device communication via SCI/RCI
- **monitors** (3 tools) - Webhook and monitor management
- **jobs** (2 tools) - Async job tracking
- **admin** (9 tools) - Users, files, templates, health configs, security
- **events** (2 tools) - Audit trail and event history

### Usage Pattern

1. Connect to server - only 13 core tools visible
2. Call `discover_tool_categories` to see available categories
3. Call `enable_tool_category` with category name (e.g., `"reports"`)
4. All tools in that category become available
5. Repeat as needed for other categories

## Prerequisites

- Node.js 18.0.0 or higher
- Digi Remote Manager account
- API Key ID and Secret (get from https://remotemanager.digi.com → Profile → API Keys)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd DRM_MCP
npm install
```

### 2. Configure Environment

Copy the example environment file and configure your API credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your API credentials:

```env
DRM_API_KEY_ID=your_api_key_id_here
DRM_API_KEY_SECRET=your_api_key_secret_here
```

### 3. Run the Server

**Stdio mode (default)** - for MCP clients like Claude Desktop:

```bash
npm start
```

**HTTP mode** - for web integrations like n8n:

```bash
MCP_TRANSPORT=http MCP_PORT=3000 npm start
```

## Docker Deployment

The server is configured to connect to the `root_default` Docker network, allowing integration with n8n and other services.

### Quick Start with Docker Compose

1. Configure environment variables in `.env`:

```bash
cp .env.example .env
# Edit .env with your credentials
```

2. Verify the Docker network exists:

```bash
docker network ls | grep root_default
# Or create it if needed: docker network create root_default
```

3. Start the server:

```bash
docker-compose up -d
```

4. Check logs:

```bash
docker-compose logs -f
```

5. Health check:

```bash
curl http://localhost:3000/health
```

### Accessing from n8n

If your n8n is on the `root_default` network, use the container name:

```
http://drm-mcp-server:3000/mcp
```

See **[DOCKER_NETWORK_SETUP.md](./DOCKER_NETWORK_SETUP.md)** for detailed Docker networking configuration and troubleshooting.

### Manual Docker Build

```bash
docker build -t drm-mcp-server .
docker run -d \
  -e DRM_API_KEY_ID=your_key_id \
  -e DRM_API_KEY_SECRET=your_key_secret \
  -e MCP_TRANSPORT=http \
  -e MCP_PORT=3000 \
  -p 3000:3000 \
  drm-mcp-server
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DRM_API_KEY_ID` | Yes | - | Digi Remote Manager API Key ID |
| `DRM_API_KEY_SECRET` | Yes | - | Digi Remote Manager API Key Secret |
| `MCP_TRANSPORT` | No | `stdio` | Transport type: `stdio` or `http` |
| `MCP_PORT` | No | `3000` | HTTP server port (when using http transport) |
| `NODE_ENV` | No | `production` | Node environment |

## Usage Examples

### Discover Available Tool Categories

```json
{
  "tool": "discover_tool_categories",
  "arguments": {}
}
```

### Enable a Tool Category

```json
{
  "tool": "enable_tool_category",
  "arguments": {
    "category": "reports"
  }
}
```

### List Connected Devices

```json
{
  "tool": "list_devices",
  "arguments": {
    "query": "connection_status=\"connected\"",
    "size": 100
  }
}
```

### Get Stream Historical Data

```json
{
  "tool": "get_stream_history",
  "arguments": {
    "stream_id": "00000000-00000000-00409DFF-FF122B8E/temperature",
    "start_time": "-24h",
    "size": 1000
  }
}
```

### Query Device State via SCI

```json
{
  "tool": "sci_query_device_state",
  "arguments": {
    "device_id": "00000000-00000000-00409DFF-FF122B8E",
    "state_group": "mobile_stats",
    "use_cache": false
  }
}
```

## Available Tools

### Device Management
- `list_devices`, `get_device`
- `list_groups`, `get_group`
- `list_firmware`, `get_firmware`

### Data & Telemetry
- `list_streams`, `get_stream`, `get_stream_history`
- `get_stream_rollups` (aggregated data)
- `get_device_logs`

### Monitoring & Automation
- `list_alerts`, `get_alert`
- `list_monitors`, `get_monitor`
- `list_automations`, `get_automation`

### SCI/RCI (Direct Device Communication)
- `sci_query_device_state`
- `sci_query_device_settings`
- `sci_list_device_files`, `sci_get_device_file`
- `sci_query_multiple_devices`

### Reports & Analytics
- `get_connection_report`
- `get_device_report`
- `get_cellular_utilization_report`

See tool descriptions for complete parameter documentation.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run with custom environment
DRM_API_KEY_ID=xxx DRM_API_KEY_SECRET=yyy npm start
```

## Troubleshooting

### Error: API credentials not configured

Make sure you've set both environment variables:
- `DRM_API_KEY_ID`
- `DRM_API_KEY_SECRET`

Check that your `.env` file exists and contains valid credentials.

### 401 Authentication Error

Verify your API credentials are correct in Digi Remote Manager.

### 403 Permission Denied

Some features require Remote Manager Premier Edition.

## License

MIT
