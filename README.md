# Digi Remote Manager MCP Server

Model Context Protocol (MCP) server for comprehensive Digi Remote Manager API integration.

## 🎯 Features

- **Comprehensive API Coverage**: 30+ tools covering all major DRM v1 API endpoints
- **Secure Authentication**: Environment variable-based API key management
- **Smart Pagination**: Automatic handling of cursor-based pagination
- **Enhanced Error Handling**: Clear, actionable error messages
- **Bulk Operations**: CSV export support for large-scale device analysis
- **Dual Transport**: Support for both stdio (Claude Desktop) and HTTP (n8n, custom clients)

## 📋 Version 2.0 Improvements

### Security
- ✅ Removed hardcoded API credentials
- ✅ Environment variable-based authentication
- ✅ Secure credential validation on startup

### New APIs Added
- ✅ Jobs API (async operation tracking)
- ✅ Firmware Updates API (update progress monitoring)
- ✅ Configs API (device configuration management)
- ✅ Files API (device file uploads)
- ✅ Reports API (device availability, cellular usage)
- ✅ Health Configs API (health monitoring)
- ✅ Device Metrics API
- ✅ Bulk Device Export

### Enhancements
- ✅ Better pagination support with cursor handling
- ✅ Improved error messages with status code handling
- ✅ Query language documentation in tool descriptions
- ✅ Response formatting with metadata

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Digi Remote Manager account with API access
- API Key (ID and Secret) from DRM

### Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and add your API credentials
```

### Get Your API Key

1. Log in to [Digi Remote Manager](https://remotemanager.digi.com)
2. Navigate to **Profile → API Keys**
3. Click **Create New API Key**
4. Copy the **API Key ID** and **API Key Secret**
5. Add them to your `.env` file

### Run the Server

```bash
# For Claude Desktop (stdio mode)
npm start

# For HTTP mode (n8n, custom clients)
MCP_TRANSPORT=http MCP_PORT=3000 npm start
```

## 🔧 Configuration

### Environment Variables

```bash
# Required
DRM_API_KEY_ID=your_api_key_id_here
DRM_API_KEY_SECRET=your_api_key_secret_here

# Optional
NODE_ENV=production
MCP_TRANSPORT=stdio  # or 'http'
MCP_PORT=3000        # only for HTTP mode
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "digi-remote-manager": {
      "command": "node",
      "args": ["/path/to/drm-mcp-server.js"],
      "env": {
        "DRM_API_KEY_ID": "your_api_key_id",
        "DRM_API_KEY_SECRET": "your_api_key_secret"
      }
    }
  }
}
```

### Docker Deployment

```bash
# Build image
docker-compose build

# Set environment variables in .env file
# Then run
docker-compose up -d
```

## 📚 Available Tools

### Devices (8 tools)
- `list_devices` - List all devices with filtering and pagination
- `list_devices_bulk` - Export devices in CSV format
- `get_device` - Get device details by ID
- `get_device_data_streams` - Get sensor/telemetry data
- `get_device_metrics` - Get device performance metrics
- `get_device_logs` - Get device logs for troubleshooting

### Groups (2 tools)
- `list_groups` - List all device groups
- `get_group` - Get group details

### Alerts (2 tools)
- `list_alerts` - List configured alerts
- `get_alert` - Get alert details

### Monitors (2 tools)
- `list_monitors` - List webhooks/push monitors
- `get_monitor` - Get monitor details

### Jobs (2 tools)
- `list_jobs` - List async operations
- `get_job` - Get job status and progress

### Firmware (2 tools)
- `list_firmware` - List available firmware versions
- `get_firmware` - Get firmware details

### Firmware Updates (2 tools)
- `list_firmware_updates` - List firmware update operations
- `get_firmware_update` - Get update progress

### Configs (2 tools)
- `list_configs` - List device configurations
- `get_config` - Get configuration details

### Automations (2 tools)
- `list_automations` - List scheduled tasks
- `get_automation` - Get automation details

### Files (2 tools)
- `list_files` - List uploaded device files
- `get_file` - Get file details

### Events (1 tool)
- `list_events` - Get audit trail/event log

### Reports (3 tools)
- `list_reports` - List available reports
- `get_device_availability_report` - Device uptime stats
- `get_cellular_utilization_report` - Data usage stats

### Health (2 tools)
- `list_health_configs` - List health monitoring configs
- `get_health_config` - Get health config details

### Account (3 tools)
- `get_account_info` - Get account information
- `list_users` - List account users
- `get_user` - Get user details

## 🔍 Query Language Examples

The DRM API supports a powerful query language for filtering:

```javascript
// Connection status
connection_status = "connected"

// Time-based filtering
last_update > -1d
last_connect > -7d

// Tag filtering
tags = 'sensor'
tags contains 'prod'

// Group filtering
group startsWith '/production/'
group = '/production/sensors'

// Complex queries
tags = 'important' and (health_status = 'error' or health_status = 'warning')
connection_status = "connected" and last_update > -1d and ip startsWith '10.20.1.'
```

### Operators
- `=`, `!=` - Equality
- `<`, `<=`, `>`, `>=` - Comparison
- `startsWith`, `endsWith`, `contains` - String matching
- `and`, `or` - Logical operators

### Time Formats
- **Relative**: `-1h`, `-1d`, `-7d`, `-30d`
- **Absolute**: ISO 8601 format `2024-01-15T10:30:00Z`

## 💡 Usage Examples

### List Connected Devices

```javascript
// Using the list_devices tool
{
  "query": "connection_status = 'connected'",
  "size": 100
}
```

### Get Recent Device Logs

```javascript
// Using the get_device_logs tool
{
  "device_id": "00000000-00000000-00409DFF-FF123456",
  "start_time": "-24h",
  "size": 50
}
```

### Monitor Firmware Updates

```javascript
// Using the list_firmware_updates tool
{
  "query": "status = 'in_progress'"
}
```

### Export All Devices

```javascript
// Using the list_devices_bulk tool
{
  "query": "connection_status = 'connected'"
}
// Returns CSV format for Excel/analysis
```

### Get Device Availability Report

```javascript
// Using the get_device_availability_report tool
{
  "query": "group startsWith '/production/'",
  "start_time": "-30d",
  "end_time": "now"
}
```

## 🐛 Troubleshooting

### "Authentication Error: Invalid API credentials"

**Cause**: API key ID or secret is incorrect or expired.

**Solution**:
1. Verify credentials in `.env` file
2. Check for extra spaces or quotes
3. Generate new API key from DRM console
4. Ensure key has necessary permissions

### "Permission Error: Your account may not have access"

**Cause**: Feature requires Remote Manager Premier Edition.

**Solution**:
1. Check your DRM subscription level
2. Contact Digi support to upgrade
3. Some features are Premier-only

### "Rate Limit Error: Too many requests"

**Cause**: Exceeded API rate limits.

**Solution**:
1. Add delays between requests
2. Use pagination with smaller page sizes
3. Implement exponential backoff

### Connection Issues

**Cause**: Network connectivity or firewall issues.

**Solution**:
1. Verify internet connection
2. Check firewall allows HTTPS to `remotemanager.digi.com`
3. Test with: `curl https://remotemanager.digi.com/ws/v1`

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Rotate API keys regularly** - Every 90 days recommended
3. **Use separate keys for dev/prod** - Different environments
4. **Delete unused keys** - Minimize attack surface
5. **Monitor API usage** - Check DRM console for anomalies
6. **Use principle of least privilege** - Create keys with minimum required permissions

## 📖 API Documentation

Full Digi Remote Manager API documentation:
- [API Guide](https://doc-remotemanager.digi.com/)
- [v1 API Reference](https://doc-remotemanager.digi.com/api/v1)
- [Query Language](https://doc-remotemanager.digi.com/pages/discovering-apis/)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests if applicable
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

- **Issues**: GitHub Issues
- **Digi Support**: 1-877-912-3444 (US)
- **International**: +1-952-912-3444
- **Documentation**: https://doc-remotemanager.digi.com/

## 🗺️ Roadmap

- [ ] Add write operations (create/update/delete)
- [ ] WebSocket support for real-time monitoring
- [ ] Batch operations for multiple devices
- [ ] Advanced query builder
- [ ] Response caching
- [ ] Metrics and analytics
- [ ] Custom report generation
- [ ] SCI (Server Command Interface) support

## 📊 Version History

### v2.0.0 (Current)
- Security: Environment variable authentication
- Added 12 new API categories
- Enhanced error handling
- Better pagination support
- Bulk operations
- Improved documentation

### v1.0.0
- Initial release
- Basic device, group, alert, monitor APIs
- Hardcoded authentication (deprecated)

---

**Note**: This is an unofficial MCP server for Digi Remote Manager. For official Digi products and support, visit [digi.com](https://www.digi.com).
