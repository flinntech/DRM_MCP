# Digi Remote Manager MCP Server

Model Context Protocol (MCP) server for Digi Remote Manager API integration. Provides 60+ tools for managing IoT devices, data streams, alerts, automations, and more.

## Features

- **60+ API Tools**: Full coverage of Digi Remote Manager REST API
- **SCI/RCI Support**: Direct device communication via Server Command Interface
- **Device Management**: Query devices, groups, firmware, configurations
- **Data Streams**: Access time-series telemetry data with rollups
- **Monitoring**: Alerts, monitors, automations, and reports
- **Multiple Transports**: Supports stdio and HTTP transports

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

### Using Docker Compose

1. Configure environment variables in `.env`:

```bash
cp .env.example .env
# Edit .env with your credentials
```

2. Start the server:

```bash
docker-compose up -d
```

3. Check logs:

```bash
docker-compose logs -f
```

4. Health check:

```bash
curl http://localhost:3000/health
```

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
