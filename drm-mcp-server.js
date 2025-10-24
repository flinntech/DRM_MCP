#!/usr/bin/env node

/**
 * Digi Remote Manager MCP Server - Multi-Tenant Version
 * Full API coverage with 60+ tools including SCI/RCI operations
 * Supports multiple users with individual DRM API credentials
 */

import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { AsyncLocalStorage } from "async_hooks";
import fs from "fs";

// Load environment variables from .env file
dotenv.config();

const DRM_BASE_URL = "https://remotemanager.digi.com/ws";

// AsyncLocalStorage for tracking current user context
const userContext = new AsyncLocalStorage();

// ============================================
// MULTI-TENANT CONFIGURATION
// ============================================
// Support both single-tenant (env vars) and multi-tenant (credentials.json)
const API_KEY_ID = process.env.DRM_API_KEY_ID;
const API_KEY_SECRET = process.env.DRM_API_KEY_SECRET;

// Load multi-tenant credentials from credentials.json if it exists
let USER_CREDENTIALS = {};
try {
  if (fs.existsSync('./credentials.json')) {
    USER_CREDENTIALS = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
    console.error(`✓ Loaded credentials for ${Object.keys(USER_CREDENTIALS).length} users from credentials.json`);
  }
} catch (error) {
  console.error('⚠ Warning: Could not load credentials.json:', error.message);
}
// ============================================

class DigiRemoteManagerServer {
  constructor() {
    // Check if we have either single-tenant or multi-tenant credentials
    const hasMultiTenant = Object.keys(USER_CREDENTIALS).length > 0;
    const hasSingleTenant = API_KEY_ID && API_KEY_SECRET;

    if (!hasMultiTenant && !hasSingleTenant) {
      console.error("╔════════════════════════════════════════════════════════════╗");
      console.error("║  ERROR: API credentials not configured                    ║");
      console.error("╚════════════════════════════════════════════════════════════╝");
      console.error("");
      console.error("Multi-tenant mode: Create credentials.json with user credentials");
      console.error("Single-tenant mode: Set environment variables:");
      console.error("  - DRM_API_KEY_ID");
      console.error("  - DRM_API_KEY_SECRET");
      console.error("");
      console.error("See credentials.json.example or .env.example for reference.");
      console.error("");
      process.exit(1);
    }

    // Store default credentials for single-tenant mode
    this.defaultCredentials = hasSingleTenant ? {
      api_key_id: API_KEY_ID,
      api_key_secret: API_KEY_SECRET
    } : null;

    if (hasMultiTenant) {
      console.error(`✓ Multi-tenant mode: ${Object.keys(USER_CREDENTIALS).length} users configured`);
    } else {
      console.error("✓ Single-tenant mode: Using environment variable credentials");
    }

    // Dynamic tool management: track enabled categories per user
    this.enabledCategories = new Map(); // userId -> Set of enabled categories

    // Define tool categories
    this.initializeToolCategories();

    this.server = new Server(
      {
        name: "digi-remote-manager",
        version: "3.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    console.error("✓ Dynamic tool loading enabled - use 'discover_tool_categories' to see available categories");
  }

  // ============================================
  // MULTI-TENANT HELPER METHODS
  // ============================================

  getCurrentUserId() {
    // Get userId from AsyncLocalStorage context, or return 'default' for single-tenant
    const userId = userContext.getStore()?.userId;
    return userId || 'default';
  }

  getUserCredentials(userId) {
    // Try to get credentials from multi-tenant config
    if (USER_CREDENTIALS[userId]) {
      return USER_CREDENTIALS[userId];
    }

    // Fall back to default credentials for single-tenant mode
    if (this.defaultCredentials) {
      return this.defaultCredentials;
    }

    throw new Error(`No credentials found for user: ${userId}`);
  }

  getAxiosClient(userId = null) {
    // Get userId from parameter or context
    const effectiveUserId = userId || this.getCurrentUserId();

    // Get credentials for this user
    const credentials = this.getUserCredentials(effectiveUserId);

    // Create and return axios client with user-specific credentials
    return axios.create({
      baseURL: DRM_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-KEY-ID": credentials.api_key_id,
        "X-API-KEY-SECRET": credentials.api_key_secret,
      },
    });
  }

  getUserEnabledCategories(userId) {
    if (!this.enabledCategories.has(userId)) {
      this.enabledCategories.set(userId, new Set());
    }
    return this.enabledCategories.get(userId);
  }

  initializeToolCategories() {
    // Define available tool categories with metadata
    this.toolCategories = {
      bulk_operations: {
        name: "bulk_operations",
        display_name: "Bulk Operations & CSV Exports",
        description: "Export tools for CSV generation: device lists, stream data, jobs, events. Use for data analysis, Excel imports, or reporting.",
        tool_count: 5,
        tools: ["list_devices_bulk", "list_streams_bulk", "get_stream_history_bulk", "get_stream_rollups_bulk", "list_jobs_bulk", "list_events_bulk"]
      },
      advanced_data: {
        name: "advanced_data",
        display_name: "Advanced Data Operations",
        description: "Advanced data tools: stream rollups (aggregations/statistics), device logs, stream analytics.",
        tool_count: 3,
        tools: ["get_stream_rollups", "get_stream_rollups_bulk", "get_device_logs"]
      },
      reports: {
        name: "reports",
        display_name: "Reports & Analytics",
        description: "Analytics dashboards: connection reports, alert summaries, device breakdowns, cellular usage, availability stats.",
        tool_count: 6,
        tools: ["list_reports", "get_connection_report", "get_alert_report", "get_device_report", "get_cellular_utilization_report", "get_device_availability_report"]
      },
      automations: {
        name: "automations",
        display_name: "Automation & Workflows",
        description: "Workflow automation tools: list/manage automations, execution history, schedules. For automated device operations.",
        tool_count: 6,
        tools: ["list_automations", "get_automation", "list_automation_runs", "get_automation_run", "list_automation_schedules", "get_automation_schedule"]
      },
      firmware: {
        name: "firmware",
        display_name: "Firmware Management",
        description: "Firmware operations: list available firmware, view details, track firmware updates across devices.",
        tool_count: 4,
        tools: ["list_firmware", "get_firmware", "list_firmware_updates", "get_firmware_update"]
      },
      sci: {
        name: "sci",
        display_name: "SCI - Server Command Interface",
        description: "Direct device communication via SCI/RCI: query live state, settings, file system, bulk operations. For real-time device interaction.",
        tool_count: 9,
        tools: ["sci_query_device_state", "sci_query_device_settings", "sci_query_descriptor", "sci_query_multiple_devices", "sci_list_device_files", "sci_get_device_file", "sci_query_firmware_targets", "sci_get_job_status", "sci_get_data_service_file"]
      },
      monitors: {
        name: "monitors",
        display_name: "Monitors & Webhooks",
        description: "Webhook monitoring: list/manage HTTP monitors, view execution history. For external system integrations.",
        tool_count: 3,
        tools: ["list_monitors", "get_monitor", "get_monitor_history"]
      },
      jobs: {
        name: "jobs",
        display_name: "Jobs & Async Operations",
        description: "Async job management: track firmware updates, config deployments, bulk operations. Monitor long-running tasks.",
        tool_count: 2,
        tools: ["list_jobs", "get_job"]
      },
      admin: {
        name: "admin",
        display_name: "Administration & Configuration",
        description: "Admin tools: users, files, templates, health configs, account security. For account/config management.",
        tool_count: 9,
        tools: ["list_users", "get_user", "list_files", "get_file", "list_templates", "get_template", "list_health_configs", "get_health_config", "get_account_security"]
      },
      events: {
        name: "events",
        display_name: "Events & Audit Trail",
        description: "Audit trail tools: list events, export events to CSV. For security auditing, compliance, activity tracking.",
        tool_count: 2,
        tools: ["list_events", "list_events_bulk"]
      }
    };

    // Define core tools that are always available
    this.coreTools = [
      "discover_tool_categories",
      "enable_tool_category",
      "list_devices",
      "get_device",
      "list_streams",
      "get_stream",
      "get_stream_history",
      "list_groups",
      "get_group",
      "list_alerts",
      "get_alert",
      "get_account_info",
      "get_api_info"
    ];
  }

  setupHandlers() {
    // Store all tool definitions - we'll filter based on enabled categories
    this.defineAllTools();

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getEnabledTools()
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          // Dynamic tool management
          case "discover_tool_categories": return this.discoverToolCategories();
          case "enable_tool_category": return this.enableToolCategory(args);

          // Original tools
          case "list_devices": return await this.listDevices(args);
          case "list_devices_bulk": return await this.listDevicesBulk(args);
          case "get_device": return await this.getDevice(args);
          case "list_streams": return await this.listStreams(args);
          case "list_streams_bulk": return await this.listStreamsBulk(args);
          case "get_stream": return await this.getStream(args);
          case "get_stream_history": return await this.getStreamHistory(args);
          case "get_stream_history_bulk": return await this.getStreamHistoryBulk(args);
          case "get_stream_rollups": return await this.getStreamRollups(args);
          case "get_stream_rollups_bulk": return await this.getStreamRollupsBulk(args);
          case "get_device_logs": return await this.getDeviceLogs(args);
          case "list_groups": return await this.listGroups(args);
          case "get_group": return await this.getGroup(args);
          case "list_alerts": return await this.listAlerts(args);
          case "get_alert": return await this.getAlert(args);
          case "list_monitors": return await this.listMonitors(args);
          case "get_monitor": return await this.getMonitor(args);
          case "get_monitor_history": return await this.getMonitorHistory(args);
          case "list_automations": return await this.listAutomations(args);
          case "get_automation": return await this.getAutomation(args);
          case "list_automation_runs": return await this.listAutomationRuns(args);
          case "get_automation_run": return await this.getAutomationRun(args);
          case "list_automation_schedules": return await this.listAutomationSchedules(args);
          case "get_automation_schedule": return await this.getAutomationSchedule(args);
          case "list_jobs": return await this.listJobs(args);
          case "list_jobs_bulk": return await this.listJobsBulk(args);
          case "get_job": return await this.getJob(args);
          case "list_firmware": return await this.listFirmware(args);
          case "get_firmware": return await this.getFirmware(args);
          case "list_firmware_updates": return await this.listFirmwareUpdates(args);
          case "get_firmware_update": return await this.getFirmwareUpdate(args);
          case "list_reports": return await this.listReports(args);
          case "get_connection_report": return await this.getConnectionReport(args);
          case "get_alert_report": return await this.getAlertReport(args);
          case "get_device_report": return await this.getDeviceReport(args);
          case "get_cellular_utilization_report": return await this.getCellularUtilizationReport(args);
          case "get_device_availability_report": return await this.getDeviceAvailabilityReport(args);
          case "list_templates": return await this.listTemplates(args);
          case "get_template": return await this.getTemplate(args);
          case "list_health_configs": return await this.listHealthConfigs(args);
          case "get_health_config": return await this.getHealthConfig(args);
          case "list_events": return await this.listEvents(args);
          case "list_events_bulk": return await this.listEventsBulk(args);
          case "list_users": return await this.listUsers(args);
          case "get_user": return await this.getUser(args);
          case "list_files": return await this.listFiles(args);
          case "get_file": return await this.getFile(args);
          case "get_account_info": return await this.getAccountInfo(args);
          case "get_account_security": return await this.getAccountSecurity(args);
          case "get_api_info": return await this.getApiInfo(args);
          
          // SCI tools
          case "sci_query_device_state": return await this.sciQueryDeviceState(args);
          case "sci_query_device_settings": return await this.sciQueryDeviceSettings(args);
          case "sci_query_descriptor": return await this.sciQueryDescriptor(args);
          case "sci_query_multiple_devices": return await this.sciQueryMultipleDevices(args);
          case "sci_list_device_files": return await this.sciListDeviceFiles(args);
          case "sci_get_device_file": return await this.sciGetDeviceFile(args);
          case "sci_query_firmware_targets": return await this.sciQueryFirmwareTargets(args);
          case "sci_get_job_status": return await this.sciGetJobStatus(args);
          case "sci_get_data_service_file": return await this.sciGetDataServiceFile(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          return {
            content: [{ type: "text", text: "Authentication Error: Invalid API key." }],
            isError: true,
          };
        }
        if (error.response?.status === 403) {
          return {
            content: [{ type: "text", text: "Permission Denied: May require Remote Manager Premier Edition." }],
            isError: true,
          };
        }
        if (error.response?.status === 404) {
          return {
            content: [{ type: "text", text: "Not Found: Resource does not exist." }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: `Error: ${error.message}\n${error.response?.data ? JSON.stringify(error.response.data, null, 2) : ""}` }],
          isError: true,
        };
      }
    });
  }

  // ============================================
  // DYNAMIC TOOL MANAGEMENT METHODS
  // ============================================

  discoverToolCategories() {
    const userId = this.getCurrentUserId();
    const userCategories = this.getUserEnabledCategories(userId);

    const categories = Object.values(this.toolCategories).map(cat => ({
      name: cat.name,
      display_name: cat.display_name,
      description: cat.description,
      tool_count: cat.tool_count,
      enabled: userCategories.has(cat.name),
      tools: cat.tools
    }));

    const summary = {
      total_categories: categories.length,
      enabled_categories: userCategories.size,
      core_tools_count: this.coreTools.length,
      categories: categories
    };

    return this.formatResponse(summary);
  }

  enableToolCategory(args) {
    const { category } = args;
    const userId = this.getCurrentUserId();
    const userCategories = this.getUserEnabledCategories(userId);

    if (!this.toolCategories[category]) {
      return {
        content: [{ type: "text", text: `Error: Unknown category '${category}'. Use discover_tool_categories to see available categories.` }],
        isError: true
      };
    }

    if (userCategories.has(category)) {
      return this.formatResponse({
        message: `Category '${category}' is already enabled`,
        category: this.toolCategories[category].display_name,
        tools_count: this.toolCategories[category].tool_count
      });
    }

    userCategories.add(category);

    return this.formatResponse({
      message: `Successfully enabled category: ${this.toolCategories[category].display_name}`,
      category: category,
      tools_enabled: this.toolCategories[category].tools,
      tools_count: this.toolCategories[category].tool_count,
      total_enabled_tools: this.getEnabledTools().length
    });
  }

  getEnabledTools() {
    const userId = this.getCurrentUserId();
    const userCategories = this.getUserEnabledCategories(userId);

    // Always include core tools
    const enabled = this.allTools.filter(tool => this.coreTools.includes(tool.name));

    // Add tools from enabled categories for this user
    for (const category of userCategories) {
      const catTools = this.toolCategories[category].tools;
      enabled.push(...this.allTools.filter(tool => catTools.includes(tool.name)));
    }

    return enabled;
  }

  defineAllTools() {
    // Define all 62 tools (60 original + 2 management tools)
    this.allTools = [
        // ============================================
        // TOOL MANAGEMENT
        // ============================================
        {
          name: "discover_tool_categories",
          description: "Discover available tool categories and their status. Shows all tool categories that can be dynamically loaded, including descriptions, tool counts, and whether each category is currently enabled. Use this first to see what additional tools are available beyond the core toolset.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "enable_tool_category",
          description: "Enable a category of tools to make them available for use. This dynamically loads additional tools grouped by functionality (e.g., 'reports', 'sci', 'bulk_operations'). Once enabled, all tools in that category become available. Use discover_tool_categories first to see available categories.",
          inputSchema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                description: "Category name to enable (e.g., 'reports', 'sci', 'bulk_operations', 'firmware', 'automations', 'admin', 'jobs', 'monitors', 'events', 'advanced_data')"
              },
            },
            required: ["category"],
          },
        },

        // ============================================
        // DEVICES - Device Inventory Management
        // ============================================
        {
          name: "list_devices",
          description: "List devices with advanced query filtering. Returns device inventory including connection status, health, location, signal strength, and metadata. Use query parameter for powerful filtering: Examples: 'connection_status=\"connected\"' (connected devices), 'signal_percent<50' (weak signal), 'group startsWith \"/Production\"' (by group path), 'tags=\"sensor\"' (by tag), 'last_connect>-1d' (connected in last day), 'health_status=\"error\"' (unhealthy devices). Supports pagination via cursor.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Query filter using DRM query language. Operators: =, <>, <, <=, >, >=, startsWith, endsWith, contains, within, outside. Fields: connection_status, health_status, firmware_version, signal_percent, group, tags, type, ip, mac, last_connect, etc. Example: 'connection_status=\"disconnected\" and signal_percent<30'" 
              },
              size: { 
                type: "number", 
                description: "Number of results per page (max 1000, default 1000)" 
              },
              cursor: { 
                type: "string", 
                description: "Pagination cursor from previous response's next_cursor" 
              },
              orderby: { 
                type: "string", 
                description: "Sort field and direction, e.g., 'name desc', 'last_connect asc', 'signal_percent desc'" 
              },
            },
          },
        },
        {
          name: "list_devices_bulk",
          description: "Export device inventory to CSV format for data analysis, reporting, or bulk processing. Useful for generating device reports, Excel imports, or database uploads. Returns all fields by default, or specify exact fields needed.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter devices using query language (same as list_devices)" 
              },
              fields: { 
                type: "string", 
                description: "Comma-separated field list (e.g., 'id,name,ip,connection_status,last_connect'). Omit for all fields." 
              },
              orderby: { 
                type: "string", 
                description: "Sort order (e.g., 'name asc')" 
              },
            },
          },
        },
        {
          name: "get_device",
          description: "Get complete details for a single device by its unique ID. Returns all device properties including connection info, location, cellular details, firmware, health status, channels, and management URIs. Device IDs are in format: '00000000-00000000-00409DFF-FF122B8E'",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { 
                type: "string", 
                description: "Device ID in UUID format (e.g., '00000000-00000000-00409DFF-FF122B8E')" 
              },
            },
            required: ["device_id"],
          },
        },

        // ============================================
        // DATA STREAMS - Time-Series Data & Telemetry
        // ============================================
        {
          name: "list_streams",
          description: "List data streams (time-series telemetry channels). Streams collect device sensor data like temperature, voltage, GPS coordinates, custom metrics. Each device can have multiple streams. Filter by device using query: 'device_id=\"00000000-00000000-00409DFF-FF122B8E\"'. Stream IDs format: 'DeviceID/stream_name' (e.g., '00000000-00000000-00409DFF-FF122B8E/temperature')",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter streams. Common: 'device_id=\"...\"' (streams for device), 'description contains \"temp\"' (by description), 'stream_id startsWith \"00000000\"' (by device prefix)" 
              },
              size: { 
                type: "number", 
                description: "Results per page (max 1000)" 
              },
              cursor: { 
                type: "string", 
                description: "Pagination cursor" 
              },
              orderby: { 
                type: "string", 
                description: "Sort order (e.g., 'timestamp desc')" 
              },
              category: { 
                type: "string", 
                description: "Filter by stream category if categorized" 
              },
            },
          },
        },
        {
          name: "list_streams_bulk",
          description: "Export streams inventory to CSV format for analysis or reporting",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              fields: { type: "string", description: "Comma-separated field list (e.g., 'stream_id,description,data_type,units')" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_stream",
          description: "Get details of a specific data stream including current value, data type, units, description, and history URI. Use this to understand stream metadata before querying historical data.",
          inputSchema: {
            type: "object",
            properties: {
              stream_id: { 
                type: "string", 
                description: "Full stream ID: 'DeviceID/stream_name' (e.g., '00000000-00000000-00409DFF-FF122B8E/temperature')" 
              },
            },
            required: ["stream_id"],
          },
        },
        {
          name: "get_stream_history",
          description: "Get historical data points from a stream - the raw time-series data. Each data point includes timestamp, value, quality indicator, and server timestamp. Use for trend analysis, graphing, anomaly detection. Time ranges support ISO format ('2024-01-01T00:00:00Z') or relative times ('-1d' = 1 day ago, '-1h' = 1 hour ago, '-30m' = 30 minutes ago). Returns up to 1000 points per request - use cursor for more.",
          inputSchema: {
            type: "object",
            properties: {
              stream_id: { 
                type: "string", 
                description: "Full stream ID" 
              },
              start_time: { 
                type: "string", 
                description: "Start time: ISO format '2024-01-01T00:00:00Z' or relative '-1d' (1 day ago), '-12h' (12 hours ago), '-30m' (30 mins ago)" 
              },
              end_time: { 
                type: "string", 
                description: "End time: ISO format or relative (e.g., '-1h' for 1 hour ago). Omit for 'now'" 
              },
              size: { 
                type: "number", 
                description: "Max data points to return (default/max: 1000)" 
              },
              cursor: { 
                type: "string", 
                description: "Pagination cursor for next page of data points" 
              },
              order: { 
                type: "string", 
                description: "Sort order: 'asc' (oldest first) or 'desc' (newest first, default)" 
              },
            },
            required: ["stream_id"],
          },
        },
        {
          name: "get_stream_history_bulk",
          description: "Export stream historical data to CSV format. Efficient for large data exports, Excel analysis, or database imports.",
          inputSchema: {
            type: "object",
            properties: {
              stream_id: { type: "string", description: "Full stream ID" },
              start_time: { type: "string", description: "Start time (ISO or relative like '-7d')" },
              end_time: { type: "string", description: "End time (ISO or relative)" },
              fields: { type: "string", description: "Fields to export: 'timestamp,value,quality' or leave empty for all" },
              order: { type: "string", description: "Sort: 'asc' or 'desc'" },
            },
            required: ["stream_id"],
          },
        },
        {
          name: "get_stream_rollups",
          description: "Get aggregated/statistical data over time intervals - like 'hourly averages' or 'daily maximums'. Rollups reduce data points for analysis: instead of 86,400 points/day, get 24 hourly stats. Methods: 'min' (minimum), 'max' (maximum), 'avg' (average), 'sum' (total), 'count' (# of points). Intervals: '5m', '15m', '1h', '6h', '1d', '1w'. Perfect for dashboards showing 'last 30 days daily average temperature'",
          inputSchema: {
            type: "object",
            properties: {
              stream_id: { type: "string", description: "Full stream ID" },
              start_time: { type: "string", description: "Start time (ISO or relative)" },
              end_time: { type: "string", description: "End time (ISO or relative)" },
              interval: { 
                type: "string", 
                description: "Rollup interval: '5m' (5 min), '15m', '30m', '1h' (hour), '6h', '12h', '1d' (day), '1w' (week), '1M' (month)" 
              },
              method: { 
                type: "string", 
                description: "Aggregation: 'min', 'max', 'avg' (average), 'sum' (total), 'count' (data points). Example: 'avg' for average temperature per hour" 
              },
              size: { type: "number", description: "Max rollup points to return" },
              cursor: { type: "string", description: "Pagination cursor" },
            },
            required: ["stream_id"],
          },
        },
        {
          name: "get_stream_rollups_bulk",
          description: "Export stream rollup statistics to CSV format for reporting or analysis",
          inputSchema: {
            type: "object",
            properties: {
              stream_id: { type: "string", description: "Full stream ID" },
              interval: { type: "string", description: "Rollup interval (e.g., '1h', '1d')" },
              method: { type: "string", description: "Aggregation method: min, max, avg, sum, count" },
            },
            required: ["stream_id"],
          },
        },
        {
          name: "get_device_logs",
          description: "Get device system logs for troubleshooting connectivity, errors, or debugging device behavior. Logs include connection events, errors, warnings, and system messages with timestamps.",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
              start_time: { type: "string", description: "Start time (ISO or relative like '-1d')" },
              size: { type: "number", description: "Number of log entries (max 1000)" },
            },
            required: ["device_id"],
          },
        },

        // ============================================
        // GROUPS - Device Organization
        // ============================================
        {
          name: "list_groups",
          description: "List device groups used for organization and batch operations. Groups have hierarchical paths like '/Production/Building-A/Floor-2'. Use groups to organize devices by location, customer, deployment, or any logical structure. Enables bulk operations on all devices in a group.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter groups. Example: 'path startsWith \"/Production\"' or 'description contains \"warehouse\"'" 
              },
              orderby: { type: "string", description: "Sort: 'path asc' or 'name desc'" },
            },
          },
        },
        {
          name: "get_group",
          description: "Get details of a specific group including path, description, device count, and nested structure",
          inputSchema: {
            type: "object",
            properties: {
              group_id: { type: "string", description: "Group ID (numeric)" },
            },
            required: ["group_id"],
          },
        },

        // ============================================
        // ALERTS - Monitoring & Notifications
        // ============================================
        {
          name: "list_alerts",
          description: "List alert configurations that trigger on device conditions. Alert types: device offline, excessive disconnects, data point conditions (e.g., 'temp > 80°C'), missing data, health status changes. Alerts can send emails, webhooks, or trigger automations. Use query to find: 'status=\"enabled\"' (active alerts), 'severity=\"critical\"' (critical only)",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter alerts. Examples: 'status=\"enabled\"' (active), 'severity=\"critical\"', 'description contains \"temperature\"'" 
              },
              size: { type: "number", description: "Results per page" },
              orderby: { type: "string", description: "Sort order" },
            },
          },
        },
        {
          name: "get_alert",
          description: "Get complete alert configuration including conditions, thresholds, notification settings, and trigger history",
          inputSchema: {
            type: "object",
            properties: {
              alert_id: { type: "string", description: "Alert ID (numeric)" },
            },
            required: ["alert_id"],
          },
        },

        // ============================================
        // MONITORS - Webhooks & Event Streaming
        // ============================================
        {
          name: "list_monitors",
          description: "List monitors (webhook integrations that push DRM events to external systems). Monitor types: HTTP (webhooks), TCP (socket streams), Polling (scheduled checks). Use monitors to integrate DRM with external dashboards, ticketing systems, analytics platforms, or custom applications. Topics define what triggers the monitor: 'DataPoint/*' (all data), 'DeviceCore/*' (device events), 'Alert/*' (alert fires)",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter monitors. Examples: 'status=\"active\"' (running), 'type=\"http\"' (webhooks), 'description contains \"API\"'" 
              },
              orderby: { type: "string", description: "Sort order" },
            },
          },
        },
        {
          name: "get_monitor",
          description: "Get monitor configuration including URL, topics, payload format, headers, batching settings, and current status",
          inputSchema: {
            type: "object",
            properties: {
              monitor_id: { type: "string", description: "Monitor ID (numeric)" },
            },
            required: ["monitor_id"],
          },
        },
        {
          name: "get_monitor_history",
          description: "Get monitor execution history showing successful/failed deliveries, response codes, timestamps, and error details. Use for debugging webhook issues or monitoring integration health.",
          inputSchema: {
            type: "object",
            properties: {
              monitor_id: { type: "string", description: "Monitor ID" },
              start_time: { type: "string", description: "Start time (ISO or relative)" },
              end_time: { type: "string", description: "End time (ISO or relative)" },
              size: { type: "number", description: "Number of history entries" },
            },
            required: ["monitor_id"],
          },
        },

        // ============================================
        // AUTOMATIONS - Workflow Automation
        // ============================================
        {
          name: "list_automations",
          description: "List automation workflows that execute actions based on triggers. Automations can: update device configs, send commands, run scripts, trigger firmware updates, send notifications, or call APIs. Triggers: schedule (cron), alert fires, device connects/disconnects, data conditions. Use for: scheduled reboots, auto-config deployment, incident response, compliance checks.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter automations. Examples: 'status=\"enabled\"', 'name contains \"reboot\"'" 
              },
              orderby: { type: "string", description: "Sort order" },
            },
          },
        },
        {
          name: "get_automation",
          description: "Get automation configuration including trigger conditions, actions, schedule, execution history, and enabled status",
          inputSchema: {
            type: "object",
            properties: {
              automation_id: { type: "string", description: "Automation ID" },
            },
            required: ["automation_id"],
          },
        },
        {
          name: "list_automation_runs",
          description: "List automation execution history showing when automations ran, success/failure status, affected devices, and error details. Use for auditing, troubleshooting failed automations, or compliance reporting.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter runs. Examples: 'status=\"failed\"' (failures only), 'start_time>-7d' (last week)" 
              },
              size: { type: "number", description: "Results per page" },
              orderby: { type: "string", description: "Sort: 'start_time desc' for most recent" },
            },
          },
        },
        {
          name: "get_automation_run",
          description: "Get detailed execution log for a specific automation run including step-by-step actions, device responses, timing, and any errors",
          inputSchema: {
            type: "object",
            properties: {
              run_id: { type: "string", description: "Run ID" },
            },
            required: ["run_id"],
          },
        },
        {
          name: "list_automation_schedules",
          description: "List automation schedules showing when automations are configured to run (cron expressions, recurring patterns)",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_automation_schedule",
          description: "Get schedule configuration details for an automation including cron pattern, timezone, next run time",
          inputSchema: {
            type: "object",
            properties: {
              schedule_id: { type: "string", description: "Schedule ID" },
            },
            required: ["schedule_id"],
          },
        },

        // ============================================
        // JOBS - Long-Running Operations
        // ============================================
        {
          name: "list_jobs",
          description: "List jobs (asynchronous operations) like firmware updates, config deployments, bulk device operations. Jobs track progress across multiple devices, show success/failure counts, and can be monitored for completion. Job types: firmware_update, config_deploy, device_command, bulk_operation. Status: queued, running, completed, failed, cancelled.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter jobs. Examples: 'status=\"running\"' (active jobs), 'type=\"firmware_update\"', 'start_time>-1d' (today's jobs)" 
              },
              size: { type: "number", description: "Results per page" },
              cursor: { type: "string", description: "Pagination cursor" },
              orderby: { type: "string", description: "Sort: 'start_time desc' for most recent" },
            },
          },
        },
        {
          name: "list_jobs_bulk",
          description: "Export jobs to CSV for reporting or analysis of deployment history",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              fields: { type: "string", description: "Comma-separated fields to export" },
            },
          },
        },
        {
          name: "get_job",
          description: "Get job details including status, progress (%), success/failure counts per device, start/end times, and device-level results. Poll this endpoint to monitor job completion.",
          inputSchema: {
            type: "object",
            properties: {
              job_id: { type: "string", description: "Job ID" },
            },
            required: ["job_id"],
          },
        },

        // ============================================
        // FIRMWARE - Device Firmware Management
        // ============================================
        {
          name: "list_firmware",
          description: "List available firmware versions for devices. Firmware entries include version, file size, supported device types, SHA checksums, release notes, production/beta status. Use to find available firmware before deploying updates.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter firmware. Examples: 'type=\"ConnectPort X4\"', 'version=\"1.2.3\"', 'production=true'" 
              },
              orderby: { type: "string", description: "Sort: 'version desc' for latest first" },
            },
          },
        },
        {
          name: "get_firmware",
          description: "Get firmware details including download URL, checksums, compatible devices, release notes, and security information",
          inputSchema: {
            type: "object",
            properties: {
              firmware_id: { type: "string", description: "Firmware ID" },
            },
            required: ["firmware_id"],
          },
        },
        {
          name: "list_firmware_updates",
          description: "List firmware update jobs/operations showing deployment status across devices. Each update shows target devices, firmware version, progress, success/failure counts, and completion status.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter updates. Examples: 'status=\"in_progress\"', 'start_time>-7d'" 
              },
              size: { type: "number", description: "Results per page" },
              orderby: { type: "string", description: "Sort order" },
            },
          },
        },
        {
          name: "get_firmware_update",
          description: "Get firmware update operation status including per-device progress, success/failure details, error messages, and completion percentage",
          inputSchema: {
            type: "object",
            properties: {
              update_id: { type: "string", description: "Firmware update ID" },
            },
            required: ["update_id"],
          },
        },

        // ============================================
        // REPORTS - Analytics & Dashboards
        // ============================================
        {
          name: "list_reports",
          description: "List available report types in DRM. Reports provide analytics on device status, connectivity, data usage, health trends. Use to discover what reporting capabilities are available.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_connection_report",
          description: "Get connection status summary showing counts of connected vs disconnected devices, connection trends, average uptime. Useful for dashboard widgets showing fleet connectivity health at-a-glance.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter devices for report (e.g., 'group startsWith \"/Production\"')" 
              },
              group: { 
                type: "string", 
                description: "Limit report to specific group path (e.g., '/Production/Building-A')" 
              },
            },
          },
        },
        {
          name: "get_alert_report",
          description: "Get alert activity summary showing fired alerts, most common alert types, alert trends over time. Use for understanding alert patterns and system health.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Filter devices or alerts" },
              start_time: { type: "string", description: "Report start time" },
              end_time: { type: "string", description: "Report end time" },
            },
          },
        },
        {
          name: "get_device_report",
          description: "Get device summary report by dimension/category. Dimensions: 'health_status' (error/warning/ok counts), 'firmware_version' (version distribution), 'connection_status' (connected/disconnected), 'carrier' (cellular carrier breakdown), 'signal_percent' (signal strength distribution), 'type' (device model counts), 'vendor_id', 'restricted_status', 'compliance', 'tags'. Perfect for fleet composition analysis, compliance reports, identifying outdated firmware.",
          inputSchema: {
            type: "object",
            properties: {
              report_type: { 
                type: "string", 
                description: "Dimension to report on: health_status, firmware_version, connection_status, carrier, signal_percent, type, vendor_id, restricted_status, compliance, or tags" 
              },
              query: { 
                type: "string", 
                description: "Filter devices for report" 
              },
              group: { 
                type: "string", 
                description: "Limit to group path" 
              },
              scope: { 
                type: "string", 
                description: "For cellular reports: 'primary' or 'secondary' SIM" 
              },
            },
            required: ["report_type"],
          },
        },
        {
          name: "get_cellular_utilization_report",
          description: "Get cellular data usage statistics showing bytes sent/received per device, data plan consumption, overage alerts, usage trends. Essential for managing cellular costs and data plan allocation.",
          inputSchema: {
            type: "object",
            properties: {
              start_time: { type: "string", description: "Report period start" },
              end_time: { type: "string", description: "Report period end" },
              query: { type: "string", description: "Filter devices (e.g., 'carrier=\"AT&T\"')" },
            },
          },
        },
        {
          name: "get_device_availability_report",
          description: "Get device uptime/availability statistics showing percentage of time devices were connected, disconnect counts, average connection duration, availability trends. Use for SLA reporting and reliability analysis.",
          inputSchema: {
            type: "object",
            properties: {
              start_time: { type: "string", description: "Report period start" },
              end_time: { type: "string", description: "Report period end" },
              query: { type: "string", description: "Filter devices for report" },
            },
          },
        },

        // ============================================
        // TEMPLATES - Configuration Management
        // ============================================
        {
          name: "list_templates",
          description: "List configuration templates used for standardized device configuration deployment. Templates define settings like network config, security policies, connection parameters. Use templates to ensure consistent configuration across device fleets and simplify mass configuration updates.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter templates (e.g., 'name contains \"production\"')" 
              },
              orderby: { type: "string", description: "Sort order" },
            },
          },
        },
        {
          name: "get_template",
          description: "Get configuration template details including settings definition, assigned devices, version, and modification history",
          inputSchema: {
            type: "object",
            properties: {
              config_id: { type: "string", description: "Configuration/Template ID" },
            },
            required: ["config_id"],
          },
        },

        // ============================================
        // HEALTH CONFIGS - Device Health Monitoring
        // ============================================
        {
          name: "list_health_configs",
          description: "List health monitoring configurations that define health check rules and thresholds. Health configs determine what makes a device 'healthy' vs 'warning' vs 'error' status (e.g., signal thresholds, memory limits, temperature ranges). Applied to devices to enable automated health scoring.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Filter health configs" },
              orderby: { type: "string", description: "Sort order" },
            },
          },
        },
        {
          name: "get_health_config",
          description: "Get health configuration details including rules, thresholds, severity levels, and assigned devices",
          inputSchema: {
            type: "object",
            properties: {
              health_config_id: { type: "string", description: "Health config ID" },
            },
            required: ["health_config_id"],
          },
        },

        // ============================================
        // EVENTS - Audit Trail & Activity Log
        // ============================================
        {
          name: "list_events",
          description: "List events from audit trail showing system activity: user logins, API calls, device connections/disconnections, configuration changes, alert triggers, automation executions. Events include facility (system area), operation type, user/device ID, timestamps, and details. Essential for security auditing, compliance, troubleshooting, and activity tracking.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter events. Examples: 'facility=\"AUTHENTICATION\"' (login events), 'operation=\"UPDATE\"' (changes), 'device_id=\"...\"' (device activity), 'user_id=\"...\"' (user actions)" 
              },
              start_time: { type: "string", description: "Start time (ISO or relative like '-7d')" },
              end_time: { type: "string", description: "End time (ISO or relative)" },
              size: { type: "number", description: "Max events to return" },
            },
          },
        },
        {
          name: "list_events_bulk",
          description: "Export events to CSV for analysis, archival, SIEM integration, or compliance reporting",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Filter events" },
              start_time: { type: "string", description: "Start time" },
              end_time: { type: "string", description: "End time" },
              fields: { type: "string", description: "Comma-separated fields to export" },
            },
          },
        },

        // ============================================
        // USERS - Account & Access Management
        // ============================================
        {
          name: "list_users",
          description: "List users with access to the Remote Manager account. Shows user roles, permissions, email, last login, and status. Use for access auditing and user management.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter users (e.g., 'status=\"active\"', 'role=\"admin\"')" 
              },
              orderby: { type: "string", description: "Sort order" },
            },
          },
        },
        {
          name: "get_user",
          description: "Get user details including permissions, role, contact info, and activity history",
          inputSchema: {
            type: "object",
            properties: {
              user_id: { type: "string", description: "User ID" },
            },
            required: ["user_id"],
          },
        },

        // ============================================
        // FILES - File Storage & Management
        // ============================================
        {
          name: "list_files",
          description: "List files stored in Remote Manager (firmware files, config files, scripts, logs uploaded from devices). Files can be used in automations, firmware updates, or referenced by devices.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Filter files (e.g., 'name contains \".bin\"', 'type=\"firmware\"')" 
              },
              orderby: { type: "string", description: "Sort order" },
            },
          },
        },
        {
          name: "get_file",
          description: "Get file details including size, upload date, checksums, and download URL",
          inputSchema: {
            type: "object",
            properties: {
              file_id: { type: "string", description: "File ID" },
            },
            required: ["file_id"],
          },
        },

        // ============================================
        // ACCOUNT - Account Information
        // ============================================
        {
          name: "get_account_info",
          description: "Get Remote Manager account information including account name, customer ID, subscription level, feature entitlements, usage limits, and contact details",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_account_security",
          description: "Get account security settings including password policies, session timeouts, IP restrictions, 2FA requirements, and security compliance settings",
          inputSchema: {
            type: "object",
            properties: {
              system_defaults: { 
                type: "boolean", 
                description: "Get system default security settings (true) or account-specific (false)" 
              },
            },
          },
        },

        // ============================================
        // UTILITY - API Discovery
        // ============================================
        {
          name: "get_api_info",
          description: "Get self-documented API information showing available endpoints, parameters, and usage. DRM APIs are self-documenting - call any endpoint without parameters to see its structure. Use empty endpoint for top-level API catalog.",
          inputSchema: {
            type: "object",
            properties: {
              endpoint: { 
                type: "string", 
                description: "API endpoint to describe (e.g., 'devices', 'streams') or empty for top-level catalog" 
              },
            },
          },
        },

        // ============================================
        // SCI - SERVER COMMAND INTERFACE (Direct Device Communication)
        // ============================================
        
        {
          name: "sci_query_device_state",
          description: "Query live device state via SCI/RCI - get real-time info directly from device. State groups: 'device_stats' (CPU/memory), 'interface_info' (network interfaces), 'mobile_stats' (cellular signal/carrier), 'system_info' (uptime/version), 'gps_stats' (location), etc. Use cache=true for faster response from DRM cache (recent data) or cache=false for live device query (slower, device must be connected). Empty state_group returns all available state. Use sci_query_descriptor first to see what state groups a device supports.",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { 
                type: "string", 
                description: "Device ID" 
              },
              state_group: { 
                type: "string", 
                description: "State group to query: 'device_stats', 'interface_info', 'mobile_stats', 'system_info', 'gps_stats', etc. Empty = all state groups. See descriptor for device-specific options." 
              },
              use_cache: { 
                type: "boolean", 
                description: "true = fast cached data (recent), false = live device query (slower, device must be connected)", 
                default: true 
              },
              timeout: { 
                type: "number", 
                description: "Request timeout in seconds (for live queries)", 
                default: 30 
              },
            },
            required: ["device_id"],
          },
        },
        {
          name: "sci_query_device_settings",
          description: "Query device configuration settings via SCI/RCI. Returns current device config (network settings, security, connection params, etc). Settings_group examples: 'network', 'security', 'cellular', 'wifi', 'serial', etc. Empty settings_group returns all settings. Source options: 'current' (running config), 'stored' (saved to flash), 'defaults' (factory defaults). Use to audit device config or compare current vs stored settings.",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
              settings_group: { 
                type: "string", 
                description: "Settings group: 'network', 'security', 'cellular', 'wifi', etc. Empty = all settings. See descriptor for options." 
              },
              use_cache: { 
                type: "boolean", 
                description: "Use cached settings (true) or query device (false)", 
                default: true 
              },
              source: { 
                type: "string", 
                description: "Config source: 'current' (running config), 'stored' (saved config), 'defaults' (factory)", 
                default: "current" 
              },
            },
            required: ["device_id"],
          },
        },
        {
          name: "sci_query_descriptor",
          description: "Get RCI descriptor for device - discovers device capabilities, available state groups, settings groups, and RCI commands supported by that device model/firmware. Returns XML structure showing all queryable/configurable elements. Essential first step before querying device - shows what's available for that specific device type.",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
              element: { 
                type: "string", 
                description: "Specific element to describe (e.g., 'device_stats') or empty for root descriptor showing all capabilities" 
              },
            },
            required: ["device_id"],
          },
        },
        {
          name: "sci_query_multiple_devices",
          description: "Query state or settings from multiple devices at once - bulk device operations. Target devices by: device IDs list, tag (all devices with tag), group path (all devices in group), or 'all'. Synchronous mode waits for all devices to respond. Asynchronous returns job ID immediately - poll sci_get_job_status for results. Use for fleet-wide queries like 'get signal strength from all field devices' or 'check firmware version on production group'.",
          inputSchema: {
            type: "object",
            properties: {
              target_type: { 
                type: "string", 
                description: "How to target devices: 'device_ids' (list), 'tag' (by tag name), 'group' (by group path), 'all' (all devices)", 
                default: "device_ids" 
              },
              target_value: { 
                type: "string", 
                description: "Target value: comma-separated device IDs, tag name (e.g., 'production'), or group path (e.g., '/Field/Region-1')" 
              },
              query_type: { 
                type: "string", 
                description: "What to query: 'state' (device state/stats) or 'setting' (config settings)", 
                default: "state" 
              },
              query_content: { 
                type: "string", 
                description: "What to query: e.g., 'device_stats' for state, 'network' for settings. Empty = all" 
              },
              use_cache: { 
                type: "boolean", 
                description: "Use cached data (fast) or query devices live (slow)", 
                default: true 
              },
              synchronous: { 
                type: "boolean", 
                description: "true = wait for all responses, false = async job (get job ID, poll for completion)", 
                default: true 
              },
            },
            required: ["target_value", "query_type"],
          },
        },
        {
          name: "sci_list_device_files",
          description: "List files on device file system via SCI. Shows files/directories on device storage including logs, configs, data files, Python scripts. Hash parameter adds file checksums for integrity verification (useful for detecting file changes or corruption). Use for remote file system browsing, log file discovery, or audit of device-stored data.",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
              path: { 
                type: "string", 
                description: "Directory path to list (e.g., '/', '/logs', '/config')", 
                default: "/" 
              },
              hash: { 
                type: "string", 
                description: "Include file checksums: 'none' (no hash), 'any' (any available), 'md5', 'sha3-512'", 
                default: "none" 
              },
            },
            required: ["device_id"],
          },
        },
        {
          name: "sci_get_device_file",
          description: "Download/read file content from device file system via SCI. Retrieves file data from device storage - logs, configs, sensor data files, Python scripts. Supports partial reads (offset/length) for large files. Use for remote log retrieval, config backup, or reading device-generated data files.",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
              path: { 
                type: "string", 
                description: "Full file path on device (e.g., '/logs/system.log', '/config/settings.xml')" 
              },
              offset: { 
                type: "number", 
                description: "Byte offset to start reading (0 = start of file)", 
                default: 0 
              },
              length: { 
                type: "number", 
                description: "Number of bytes to read (0 = read entire file)", 
                default: 0 
              },
            },
            required: ["device_id", "path"],
          },
        },
        {
          name: "sci_query_firmware_targets",
          description: "Query available firmware targets on device - discovers what firmware components can be updated. Returns list of updatable targets like 'system firmware', 'bootloader', 'modem firmware', 'XBee radio firmware'. Use before firmware update to know what can be updated and current versions.",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
            },
            required: ["device_id"],
          },
        },
        {
          name: "sci_get_job_status",
          description: "Get status of asynchronous SCI job. When using synchronous=false for multi-device operations, you get a job ID. Poll this endpoint to check job status (queued/running/completed/failed) and get results when ready. Shows per-device success/failure, completion percentage, and result data.",
          inputSchema: {
            type: "object",
            properties: {
              job_id: { 
                type: "string", 
                description: "SCI Job ID returned from async operation (e.g., from sci_query_multiple_devices with synchronous=false)" 
              },
            },
            required: ["job_id"],
          },
        },
        {
          name: "sci_get_data_service_file",
          description: "Get file from Remote Manager Data Services storage (cloud storage for device-uploaded data). Devices can upload files to DRM storage (logs, data files, backups) using Data Services. Path format: 'db://path/to/file.xml' or '/~/path'. Use to retrieve device-uploaded files stored in DRM cloud.",
          inputSchema: {
            type: "object",
            properties: {
              file_path: { 
                type: "string", 
                description: "Path in Data Services storage. Format: 'db://path/to/file' or '/~/path'. Example: 'db://devices/00000000/logs/system.log'" 
              },
            },
            required: ["file_path"],
          },
        },
    ];
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  buildParams(args, allowed) {
    const params = {};
    for (const p of allowed) {
      if (args[p] !== undefined) params[p] = args[p];
    }
    return params;
  }

  formatResponse(data) {
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  // ============================================
  // SCI HELPER METHODS
  // ============================================

  buildSciRequest(operation, targets, payload) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<sci_request version="1.0">
  <${operation}>
    <targets>
      ${targets}
    </targets>
    ${payload}
  </${operation}>
</sci_request>`;
  }

  buildRciRequest(command, content = '') {
    return `<rci_request version="1.1">
  <${command}>${content}</${command}>
</rci_request>`;
  }

  buildDeviceTarget(deviceId) {
    return `<device id="${deviceId}"/>`;
  }

  buildMultipleTargets(targetType, targetValue) {
    switch (targetType) {
      case 'device_ids':
        return targetValue.split(',').map(id => `<device id="${id.trim()}"/>`).join('\n      ');
      case 'tag':
        return `<device tag="${targetValue}"/>`;
      case 'group':
        return `<group path="${targetValue}"/>`;
      case 'all':
        return `<device id="all"/>`;
      default:
        throw new Error(`Invalid target type: ${targetType}`);
    }
  }

  async sendSciRequest(xmlRequest) {
    const response = await this.getAxiosClient().post('/sci', xmlRequest, {
      headers: {
        'Content-Type': 'text/xml',
        'Accept': 'text/xml',
      },
    });
    return response.data;
  }

  // ============================================
  // ORIGINAL API METHODS
  // ============================================

  async listDevices(args) {
    const params = this.buildParams(args, ["query", "size", "cursor", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/devices/inventory", { params });
    return this.formatResponse(response.data);
  }

  async listDevicesBulk(args) {
    const params = this.buildParams(args, ["query", "fields", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/devices/bulk", { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getDevice(args) {
    const response = await this.getAxiosClient().get(`/v1/devices/inventory/${args.device_id}`);
    return this.formatResponse(response.data);
  }

  async listStreams(args) {
    const params = this.buildParams(args, ["query", "size", "cursor", "orderby", "category"]);
    const response = await this.getAxiosClient().get("/v1/streams/inventory", { params });
    return this.formatResponse(response.data);
  }

  async listStreamsBulk(args) {
    const params = this.buildParams(args, ["query", "fields", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/streams/bulk", { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getStream(args) {
    const response = await this.getAxiosClient().get(`/v1/streams/inventory/${args.stream_id}`);
    return this.formatResponse(response.data);
  }

  async getStreamHistory(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "size", "cursor", "order"]);
    const response = await this.getAxiosClient().get(`/v1/streams/history/${args.stream_id}`, { params });
    return this.formatResponse(response.data);
  }

  async getStreamHistoryBulk(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "fields", "order"]);
    const response = await this.getAxiosClient().get(`/v1/streams/bulk/history/${args.stream_id}`, { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getStreamRollups(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "interval", "method", "size", "cursor"]);
    const response = await this.getAxiosClient().get(`/v1/streams/rollups/${args.stream_id}`, { params });
    return this.formatResponse(response.data);
  }

  async getStreamRollupsBulk(args) {
    const params = this.buildParams(args, ["interval", "method"]);
    const response = await this.getAxiosClient().get(`/v1/streams/bulk/rollups/${args.stream_id}`, { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getDeviceLogs(args) {
    const params = this.buildParams(args, ["start_time", "size"]);
    const response = await this.getAxiosClient().get(`/v1/device_logs/inventory/${args.device_id}`, { params });
    return this.formatResponse(response.data);
  }

  async listGroups(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/groups/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getGroup(args) {
    const response = await this.getAxiosClient().get(`/v1/groups/inventory/${args.group_id}`);
    return this.formatResponse(response.data);
  }

  async listAlerts(args) {
    const params = this.buildParams(args, ["query", "size", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/alerts/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAlert(args) {
    const response = await this.getAxiosClient().get(`/v1/alerts/inventory/${args.alert_id}`);
    return this.formatResponse(response.data);
  }

  async listMonitors(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/monitors/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getMonitor(args) {
    const response = await this.getAxiosClient().get(`/v1/monitors/inventory/${args.monitor_id}`);
    return this.formatResponse(response.data);
  }

  async getMonitorHistory(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "size"]);
    const response = await this.getAxiosClient().get(`/v1/monitors/history/${args.monitor_id}`, { params });
    return this.formatResponse(response.data);
  }

  async listAutomations(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/automations/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAutomation(args) {
    const response = await this.getAxiosClient().get(`/v1/automations/inventory/${args.automation_id}`);
    return this.formatResponse(response.data);
  }

  async listAutomationRuns(args) {
    const params = this.buildParams(args, ["query", "size", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/automations/runs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAutomationRun(args) {
    const response = await this.getAxiosClient().get(`/v1/automations/runs/inventory/${args.run_id}`);
    return this.formatResponse(response.data);
  }

  async listAutomationSchedules(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/automations/schedules/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAutomationSchedule(args) {
    const response = await this.getAxiosClient().get(`/v1/automations/schedules/inventory/${args.schedule_id}`);
    return this.formatResponse(response.data);
  }

  async listJobs(args) {
    const params = this.buildParams(args, ["query", "size", "cursor", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/jobs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async listJobsBulk(args) {
    const params = this.buildParams(args, ["query", "fields"]);
    const response = await this.getAxiosClient().get("/v1/jobs/bulk", { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getJob(args) {
    const response = await this.getAxiosClient().get(`/v1/jobs/inventory/${args.job_id}`);
    return this.formatResponse(response.data);
  }

  async listFirmware(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/firmware/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getFirmware(args) {
    const response = await this.getAxiosClient().get(`/v1/firmware/inventory/${args.firmware_id}`);
    return this.formatResponse(response.data);
  }

  async listFirmwareUpdates(args) {
    const params = this.buildParams(args, ["query", "size", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/firmware_updates/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getFirmwareUpdate(args) {
    const response = await this.getAxiosClient().get(`/v1/firmware_updates/inventory/${args.update_id}`);
    return this.formatResponse(response.data);
  }

  async listReports() {
    const response = await this.getAxiosClient().get("/v1/reports");
    return this.formatResponse(response.data);
  }

  async getConnectionReport(args) {
    const params = this.buildParams(args, ["query", "group"]);
    const response = await this.getAxiosClient().get("/v1/reports/connections", { params });
    return this.formatResponse(response.data);
  }

  async getAlertReport(args) {
    const params = this.buildParams(args, ["query", "start_time", "end_time"]);
    const response = await this.getAxiosClient().get("/v1/reports/alerts", { params });
    return this.formatResponse(response.data);
  }

  async getDeviceReport(args) {
    const params = this.buildParams(args, ["query", "group", "scope"]);
    const response = await this.getAxiosClient().get(`/v1/reports/devices/${args.report_type}`, { params });
    return this.formatResponse(response.data);
  }

  async getCellularUtilizationReport(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "query"]);
    const response = await this.getAxiosClient().get("/v1/reports/cellular_utilization", { params });
    return this.formatResponse(response.data);
  }

  async getDeviceAvailabilityReport(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "query"]);
    const response = await this.getAxiosClient().get("/v1/reports/device_availability", { params });
    return this.formatResponse(response.data);
  }

  async listTemplates(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/configs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getTemplate(args) {
    const response = await this.getAxiosClient().get(`/v1/configs/inventory/${args.config_id}`);
    return this.formatResponse(response.data);
  }

  async listHealthConfigs(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/health_configs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getHealthConfig(args) {
    const response = await this.getAxiosClient().get(`/v1/health_configs/inventory/${args.health_config_id}`);
    return this.formatResponse(response.data);
  }

  async listEvents(args) {
    const params = this.buildParams(args, ["query", "start_time", "end_time", "size"]);
    const response = await this.getAxiosClient().get("/v1/events/inventory", { params });
    return this.formatResponse(response.data);
  }

  async listEventsBulk(args) {
    const params = this.buildParams(args, ["query", "start_time", "end_time", "fields"]);
    const response = await this.getAxiosClient().get("/v1/events/bulk", { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async listUsers(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/users/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getUser(args) {
    const response = await this.getAxiosClient().get(`/v1/users/inventory/${args.user_id}`);
    return this.formatResponse(response.data);
  }

  async listFiles(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.getAxiosClient().get("/v1/files/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getFile(args) {
    const response = await this.getAxiosClient().get(`/v1/files/inventory/${args.file_id}`);
    return this.formatResponse(response.data);
  }

  async getAccountInfo() {
    const response = await this.getAxiosClient().get("/v1/account");
    return this.formatResponse(response.data);
  }

  async getAccountSecurity(args) {
    const params = {};
    if (args.system_defaults) params.system_defaults = "true";
    const response = await this.getAxiosClient().get("/v1/account/current/security", { params });
    return this.formatResponse(response.data);
  }

  async getApiInfo(args) {
    const endpoint = args.endpoint || "";
    const url = endpoint ? `/v1/${endpoint}` : "/v1";
    const response = await this.getAxiosClient().get(url);
    return this.formatResponse(response.data);
  }

  // ============================================
  // SCI IMPLEMENTATION METHODS
  // ============================================

  async sciQueryDeviceState(args) {
    const { device_id, state_group = '', use_cache = true, timeout = 30 } = args;
    
    const stateContent = state_group ? `<${state_group}/>` : '';
    const rciRequest = this.buildRciRequest('query_state', stateContent);
    const cacheAttr = use_cache ? ' cache="true"' : '';
    
    const sciRequest = this.buildSciRequest(
      'send_message',
      this.buildDeviceTarget(device_id),
      `<timeout>${timeout}</timeout>${cacheAttr ? `<cache>${use_cache}</cache>` : ''}
    ${rciRequest}`
    );
    
    const response = await this.sendSciRequest(sciRequest);
    return { content: [{ type: "text", text: response }] };
  }

  async sciQueryDeviceSettings(args) {
    const { device_id, settings_group = '', use_cache = true, source = 'current' } = args;
    
    const settingsContent = settings_group ? `<${settings_group}/>` : '';
    const sourceAttr = source !== 'current' ? ` source="${source}"` : '';
    const rciRequest = `<rci_request version="1.1">
  <query_setting${sourceAttr}>${settingsContent}</query_setting>
</rci_request>`;
    
    const cacheAttr = use_cache ? ' cache="true"' : '';
    const sciRequest = this.buildSciRequest(
      'send_message',
      this.buildDeviceTarget(device_id),
      `${cacheAttr ? `<cache>${use_cache}</cache>` : ''}
    ${rciRequest}`
    );
    
    const response = await this.sendSciRequest(sciRequest);
    return { content: [{ type: "text", text: response }] };
  }

  async sciQueryDescriptor(args) {
    const { device_id, element = '' } = args;
    
    const elementContent = element ? `<${element}/>` : '';
    const rciRequest = this.buildRciRequest('query_descriptor', elementContent);
    
    const sciRequest = this.buildSciRequest(
      'send_message',
      this.buildDeviceTarget(device_id),
      rciRequest
    );
    
    const response = await this.sendSciRequest(sciRequest);
    return { content: [{ type: "text", text: response }] };
  }

  async sciQueryMultipleDevices(args) {
    const { target_type, target_value, query_type, query_content = '', use_cache = true, synchronous = true } = args;
    
    const command = query_type === 'state' ? 'query_state' : 'query_setting';
    const content = query_content ? `<${query_content}/>` : '';
    const rciRequest = this.buildRciRequest(command, content);
    
    const syncAttr = !synchronous ? ' synchronous="false"' : '';
    const sciRequest = `<?xml version="1.0" encoding="UTF-8"?>
<sci_request version="1.0">
  <send_message${syncAttr}>
    <targets>
      ${this.buildMultipleTargets(target_type, target_value)}
    </targets>
    ${use_cache ? '<cache>true</cache>' : ''}
    ${rciRequest}
  </send_message>
</sci_request>`;
    
    const response = await this.sendSciRequest(sciRequest);
    return { content: [{ type: "text", text: response }] };
  }

  async sciListDeviceFiles(args) {
    const { device_id, path = '/', hash = 'none' } = args;
    
    const sciRequest = `<?xml version="1.0" encoding="UTF-8"?>
<sci_request version="1.0">
  <file_system>
    <targets>
      ${this.buildDeviceTarget(device_id)}
    </targets>
    <commands>
      <ls path="${path}" hash="${hash}"/>
    </commands>
  </file_system>
</sci_request>`;
    
    const response = await this.sendSciRequest(sciRequest);
    return { content: [{ type: "text", text: response }] };
  }

  async sciGetDeviceFile(args) {
    const { device_id, path, offset = 0, length = 0 } = args;
    
    const offsetAttr = offset > 0 ? ` offset="${offset}"` : '';
    const lengthAttr = length > 0 ? ` length="${length}"` : '';
    
    const sciRequest = `<?xml version="1.0" encoding="UTF-8"?>
<sci_request version="1.0">
  <file_system>
    <targets>
      ${this.buildDeviceTarget(device_id)}
    </targets>
    <commands>
      <get path="${path}"${offsetAttr}${lengthAttr}/>
    </commands>
  </file_system>
</sci_request>`;
    
    const response = await this.sendSciRequest(sciRequest);
    return { content: [{ type: "text", text: response }] };
  }

  async sciQueryFirmwareTargets(args) {
    const { device_id } = args;
    
    const sciRequest = `<?xml version="1.0" encoding="UTF-8"?>
<sci_request version="1.0">
  <query_firmware_targets>
    <targets>
      ${this.buildDeviceTarget(device_id)}
    </targets>
  </query_firmware_targets>
</sci_request>`;
    
    const response = await this.sendSciRequest(sciRequest);
    return { content: [{ type: "text", text: response }] };
  }

  async sciGetJobStatus(args) {
    const { job_id } = args;
    
    // For SCI async jobs, poll via HTTP GET
    const response = await this.getAxiosClient().get(`/sci/${job_id}`, {
      headers: { 'Accept': 'text/xml' }
    });
    return { content: [{ type: "text", text: response.data }] };
  }

  async sciGetDataServiceFile(args) {
    const { file_path } = args;
    
    const sciRequest = `<?xml version="1.0" encoding="UTF-8"?>
<sci_request version="1.0">
  <data_service>
    <targets>
      <device id="00000000-00000000-00000000-00000000"/>
    </targets>
    <requests>
      <device_request target_name="file_system">
        <get_file path="${file_path}"/>
      </device_request>
    </requests>
  </data_service>
</sci_request>`;
    
    const response = await this.sendSciRequest(sciRequest);
    return { content: [{ type: "text", text: response }] };
  }

  // ============================================
  // SERVER STARTUP
  // ============================================

async run() {
    const transportType = process.env.MCP_TRANSPORT || 'stdio';
    
    if (transportType === 'http') {
      const PORT = process.env.MCP_PORT || 3000;
      await this.startHttpServer(PORT);
    } else {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("Digi Remote Manager MCP server running on stdio");
    }
  }

  async startHttpServer(port) {
    const express = (await import('express')).default;
    const cors = (await import('cors')).default;
    
    const app = express();
    app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Accept', 'Mcp-Session-Id', 'Last-Event-ID', 'X-User-ID'],
      exposedHeaders: ['Mcp-Session-Id']
    }));
    app.use(express.json());
    
    app.all('/mcp', async (req, res) => {
      // Extract user_id from header (defaults to 'default' for single-tenant mode)
      const userId = req.headers['x-user-id'] || 'default';

      console.error(`${req.method} /mcp - Request received (user: ${userId})`);

      try {
        // Run the request in the context of this userId using AsyncLocalStorage
        await userContext.run({ userId }, async () => {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true
          });

          res.on('close', () => {
            transport.close();
          });

          await this.server.connect(transport);
          await transport.handleRequest(req, res, req.body);
        });

        console.error(`${req.method} /mcp - Request handled successfully (user: ${userId})`);
      } catch (error) {
        console.error(`Error handling MCP request for user ${userId}:`, error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null
          });
        }
      }
    });
    
    app.get('/health', (req, res) => {
      const hasMultiTenant = Object.keys(USER_CREDENTIALS).length > 0;

      res.json({
        status: 'ok',
        server: 'digi-remote-manager-mcp',
        version: '3.0.0',
        transport: 'streamable-http',
        endpoint: '/mcp',
        multi_tenant: hasMultiTenant,
        configured_users: hasMultiTenant ? Object.keys(USER_CREDENTIALS).length : 1,
        dynamic_tools: true,
        core_tools: this.coreTools.length,
        total_tools: this.allTools.length,
        categories: Object.keys(this.toolCategories).length,
        active_users: this.enabledCategories.size
      });
    });
    
    app.listen(port, () => {
      console.error(`Digi Remote Manager MCP server running on HTTP port ${port}`);
      console.error(`Streamable HTTP endpoint: http://localhost:${port}/mcp`);
      console.error(`Health check: http://localhost:${port}/health`);
    });
  }
}

const server = new DigiRemoteManagerServer();
server.run().catch(console.error);
