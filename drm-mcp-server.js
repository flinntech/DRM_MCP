#!/usr/bin/env node

/**
 * Digi Remote Manager MCP Server - Enhanced Version with SCI Support
 * Full API coverage with 60+ tools including SCI/RCI operations
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

const DRM_BASE_URL = "https://remotemanager.digi.com/ws";

// ============================================
// CONFIGURATION - Put your API key here
// ============================================
const API_KEY_ID = "YOUR_API_KEY_ID_HERE";
const API_KEY_SECRET = "YOUR_API_KEY_HERE";
// ============================================

class DigiRemoteManagerServer {
  constructor() {
    if (!API_KEY_ID || !API_KEY_SECRET || API_KEY_ID === "YOUR_API_KEY_ID_HERE" || API_KEY_SECRET === "YOUR_API_KEY_HERE") {
      console.error("╔════════════════════════════════════════════════════════════╗");
      console.error("║  ERROR: API key not configured                            ║");
      console.error("╚════════════════════════════════════════════════════════════╝");
      console.error("");
      console.error("Please edit this file and configure your API key ID and secret.");
      console.error("");
      process.exit(1);
    }

    this.axiosClient = axios.create({
      baseURL: DRM_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-KEY-ID": API_KEY_ID,
        "X-API-KEY-SECRET": API_KEY_SECRET,
      },
    });

    console.error("✓ DRM MCP Server initialized with API Key authentication");

    this.server = new Server(
      {
        name: "digi-remote-manager",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // DEVICES
        {
          name: "list_devices",
          description: "List all devices. Supports advanced queries like: 'connection_status=\"connected\"', 'signal_percent<50', 'group startsWith \"/Production\"'",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              size: { type: "number", description: "Number of results" },
              cursor: { type: "string", description: "Pagination cursor" },
              orderby: { type: "string", description: "Sort field (e.g., 'name desc')" },
            },
          },
        },
        {
          name: "list_devices_bulk",
          description: "Export devices to CSV format",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              fields: { type: "string", description: "Comma-separated field list" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_device",
          description: "Get device details by ID",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
            },
            required: ["device_id"],
          },
        },
        {
          name: "list_streams",
          description: "List data streams. Filter by device using query like 'device_id=\"00000000-00000000-00409DFF-FF122B8E\"'",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter (e.g., device_id, description)" },
              size: { type: "number", description: "Number of results" },
              cursor: { type: "string", description: "Pagination cursor" },
              orderby: { type: "string", description: "Sort field" },
              category: { type: "string", description: "Filter by category" },
            },
          },
        },
        {
          name: "list_streams_bulk",
          description: "Export streams to CSV format",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              fields: { type: "string", description: "Comma-separated fields" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_stream",
          description: "Get details of a specific stream",
          inputSchema: {
            type: "object",
            properties: {
              stream_id: { type: "string", description: "Stream ID" },
            },
            required: ["stream_id"],
          },
        },
        {
          name: "get_stream_history",
          description: "Get historical data points for a stream",
          inputSchema: {
            type: "object",
            properties: {
              stream_id: { type: "string", description: "Stream ID" },
              start_time: { type: "string", description: "Start time (ISO or '-1d')" },
              end_time: { type: "string", description: "End time" },
              size: { type: "number", description: "Number of data points" },
              cursor: { type: "string", description: "Pagination cursor" },
              order: { type: "string", description: "Sort order: 'asc' or 'desc'" },
            },
            required: ["stream_id"],
          },
        },
        {
          name: "get_stream_history_bulk",
          description: "Export stream history to CSV format",
          inputSchema: {
            type: "object",
            properties: {
              stream_id: { type: "string", description: "Stream ID" },
              start_time: { type: "string", description: "Start time" },
              end_time: { type: "string", description: "End time" },
              fields: { type: "string", description: "Comma-separated fields" },
              order: { type: "string", description: "Sort order: 'asc' or 'desc'" },
            },
            required: ["stream_id"],
          },
        },
        {
          name: "get_stream_rollups",
          description: "Get aggregated/rollup data for a stream (min, max, avg, sum over intervals)",
          inputSchema: {
            type: "object",
            properties: {
              stream_id: { type: "string", description: "Stream ID" },
              start_time: { type: "string", description: "Start time" },
              end_time: { type: "string", description: "End time" },
              interval: { type: "string", description: "Rollup interval (e.g., '1h', '1d', '1w')" },
              method: { type: "string", description: "Aggregation method: min, max, avg, sum, count" },
              size: { type: "number", description: "Number of rollup points" },
              cursor: { type: "string", description: "Pagination cursor" },
            },
            required: ["stream_id"],
          },
        },
        {
          name: "get_stream_rollups_bulk",
          description: "Export stream rollups to CSV format",
          inputSchema: {
            type: "object",
            properties: {
              stream_id: { type: "string", description: "Stream ID" },
              interval: { type: "string", description: "Rollup interval" },
              method: { type: "string", description: "Aggregation method" },
            },
            required: ["stream_id"],
          },
        },
        {
          name: "get_device_logs",
          description: "Get device logs for troubleshooting",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
              start_time: { type: "string", description: "Start time" },
              size: { type: "number", description: "Number of entries" },
            },
            required: ["device_id"],
          },
        },

        // GROUPS
        {
          name: "list_groups",
          description: "List device groups",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_group",
          description: "Get group details",
          inputSchema: {
            type: "object",
            properties: {
              group_id: { type: "string", description: "Group ID" },
            },
            required: ["group_id"],
          },
        },

        // ALERTS
        {
          name: "list_alerts",
          description: "List configured alerts",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              size: { type: "number", description: "Number of results" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_alert",
          description: "Get alert details",
          inputSchema: {
            type: "object",
            properties: {
              alert_id: { type: "string", description: "Alert ID" },
            },
            required: ["alert_id"],
          },
        },

        // MONITORS
        {
          name: "list_monitors",
          description: "List monitors (webhooks)",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_monitor",
          description: "Get monitor details",
          inputSchema: {
            type: "object",
            properties: {
              monitor_id: { type: "string", description: "Monitor ID" },
            },
            required: ["monitor_id"],
          },
        },
        {
          name: "get_monitor_history",
          description: "Get monitor polling history",
          inputSchema: {
            type: "object",
            properties: {
              monitor_id: { type: "string", description: "Monitor ID" },
              start_time: { type: "string", description: "Start time" },
              end_time: { type: "string", description: "End time" },
              size: { type: "number", description: "Number of entries" },
            },
            required: ["monitor_id"],
          },
        },

        // AUTOMATIONS
        {
          name: "list_automations",
          description: "List automations",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_automation",
          description: "Get automation details",
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
          description: "List automation execution history",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              size: { type: "number", description: "Number of results" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_automation_run",
          description: "Get automation run details",
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
          description: "List automation schedules",
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
          description: "Get schedule details",
          inputSchema: {
            type: "object",
            properties: {
              schedule_id: { type: "string", description: "Schedule ID" },
            },
            required: ["schedule_id"],
          },
        },

        // JOBS
        {
          name: "list_jobs",
          description: "List jobs (firmware updates, configs, etc.)",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              size: { type: "number", description: "Number of results" },
              cursor: { type: "string", description: "Pagination cursor" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "list_jobs_bulk",
          description: "Export jobs to CSV",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              fields: { type: "string", description: "Comma-separated fields" },
            },
          },
        },
        {
          name: "get_job",
          description: "Get job details",
          inputSchema: {
            type: "object",
            properties: {
              job_id: { type: "string", description: "Job ID" },
            },
            required: ["job_id"],
          },
        },

        // FIRMWARE
        {
          name: "list_firmware",
          description: "List firmware versions",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_firmware",
          description: "Get firmware details",
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
          description: "List firmware update operations",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              size: { type: "number", description: "Number of results" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_firmware_update",
          description: "Get firmware update status",
          inputSchema: {
            type: "object",
            properties: {
              update_id: { type: "string", description: "Update ID" },
            },
            required: ["update_id"],
          },
        },

        // REPORTS
        {
          name: "list_reports",
          description: "List available report types",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_connection_report",
          description: "Get connection status summary",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              group: { type: "string", description: "Limit to group" },
            },
          },
        },
        {
          name: "get_alert_report",
          description: "Get alert summary",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              start_time: { type: "string", description: "Start time" },
              end_time: { type: "string", description: "End time" },
            },
          },
        },
        {
          name: "get_device_report",
          description: "Get device summary by dimension: health_status, firmware_version, connection_status, carrier, signal_percent, type, vendor_id, restricted_status, compliance, tags",
          inputSchema: {
            type: "object",
            properties: {
              report_type: { type: "string", description: "Report dimension" },
              query: { type: "string", description: "Query filter" },
              group: { type: "string", description: "Limit to group" },
              scope: { type: "string", description: "For cellular: primary/secondary" },
            },
            required: ["report_type"],
          },
        },
        {
          name: "get_cellular_utilization_report",
          description: "Get cellular data usage statistics",
          inputSchema: {
            type: "object",
            properties: {
              start_time: { type: "string", description: "Start time" },
              end_time: { type: "string", description: "End time" },
              query: { type: "string", description: "Query filter" },
            },
          },
        },
        {
          name: "get_device_availability_report",
          description: "Get device uptime statistics",
          inputSchema: {
            type: "object",
            properties: {
              start_time: { type: "string", description: "Start time" },
              end_time: { type: "string", description: "End time" },
              query: { type: "string", description: "Query filter" },
            },
          },
        },

        // Templates
        {
          name: "list_templates",
          description: "List configuration templates",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_template",
          description: "Get template details",
          inputSchema: {
            type: "object",
            properties: {
              config_id: { type: "string", description: "Config ID" },
            },
            required: ["config_id"],
          },
        },

        // HEALTH CONFIGS
        {
          name: "list_health_configs",
          description: "List health monitoring configurations",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_health_config",
          description: "Get health config details",
          inputSchema: {
            type: "object",
            properties: {
              health_config_id: { type: "string", description: "Health config ID" },
            },
            required: ["health_config_id"],
          },
        },

        // EVENTS
        {
          name: "list_events",
          description: "List events from event log (audit trail)",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              start_time: { type: "string", description: "Start time" },
              end_time: { type: "string", description: "End time" },
              size: { type: "number", description: "Number of events" },
            },
          },
        },
        {
          name: "list_events_bulk",
          description: "Export events to CSV",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              start_time: { type: "string", description: "Start time" },
              end_time: { type: "string", description: "End time" },
              fields: { type: "string", description: "Comma-separated fields" },
            },
          },
        },

        // USERS
        {
          name: "list_users",
          description: "List users",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_user",
          description: "Get user details",
          inputSchema: {
            type: "object",
            properties: {
              user_id: { type: "string", description: "User ID" },
            },
            required: ["user_id"],
          },
        },

        // FILES
        {
          name: "list_files",
          description: "List files",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Query filter" },
              orderby: { type: "string", description: "Sort field" },
            },
          },
        },
        {
          name: "get_file",
          description: "Get file details",
          inputSchema: {
            type: "object",
            properties: {
              file_id: { type: "string", description: "File ID" },
            },
            required: ["file_id"],
          },
        },

        // ACCOUNT
        {
          name: "get_account_info",
          description: "Get account information",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_account_security",
          description: "Get account security settings",
          inputSchema: {
            type: "object",
            properties: {
              system_defaults: { type: "boolean", description: "Get system defaults" },
            },
          },
        },

        // UTILITY
        {
          name: "get_api_info",
          description: "Get self-documented API info for endpoint discovery",
          inputSchema: {
            type: "object",
            properties: {
              endpoint: { type: "string", description: "Endpoint name or empty for top-level" },
            },
          },
        },

        // ============================================
        // SCI - SERVER COMMAND INTERFACE OPERATIONS
        // ============================================
        
        // SCI - DEVICE QUERY OPERATIONS
        {
          name: "sci_query_device_state",
          description: "Query device state via SCI/RCI (device_stats, interface_info, etc.). Can query from device or cached data.",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
              state_group: { type: "string", description: "State group to query (e.g., 'device_stats', 'interface_info', or empty for all)" },
              use_cache: { type: "boolean", description: "Query cached data instead of live device (faster)", default: true },
              timeout: { type: "number", description: "Request timeout in seconds", default: 30 },
            },
            required: ["device_id"],
          },
        },
        {
          name: "sci_query_device_settings",
          description: "Query device configuration settings via SCI/RCI. Returns current device configuration.",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
              settings_group: { type: "string", description: "Settings group to query (or empty for all)" },
              use_cache: { type: "boolean", description: "Query cached settings", default: true },
              source: { type: "string", description: "Source: 'current' (default), 'stored', or 'defaults'", default: "current" },
            },
            required: ["device_id"],
          },
        },
        {
          name: "sci_query_descriptor",
          description: "Get RCI descriptor for device - shows available commands, settings, and state groups for that device type",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
              element: { type: "string", description: "Specific element to describe (or empty for root)" },
            },
            required: ["device_id"],
          },
        },
        {
          name: "sci_query_multiple_devices",
          description: "Query state/settings from multiple devices at once (by device IDs, tags, or group)",
          inputSchema: {
            type: "object",
            properties: {
              target_type: { type: "string", description: "Target type: 'device_ids', 'tag', 'group', or 'all'", default: "device_ids" },
              target_value: { type: "string", description: "Device IDs (comma-separated), tag name, or group path" },
              query_type: { type: "string", description: "Query type: 'state' or 'setting'", default: "state" },
              query_content: { type: "string", description: "What to query (e.g., 'device_stats')" },
              use_cache: { type: "boolean", description: "Use cached data", default: true },
              synchronous: { type: "boolean", description: "Wait for completion (false = async job)", default: true },
            },
            required: ["target_value", "query_type"],
          },
        },

        // SCI - FILE SYSTEM OPERATIONS
        {
          name: "sci_list_device_files",
          description: "List files on device file system via SCI",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
              path: { type: "string", description: "Directory path to list", default: "/" },
              hash: { type: "string", description: "Include file hashes: 'none', 'any', 'md5', 'sha3-512'", default: "none" },
            },
            required: ["device_id"],
          },
        },
        {
          name: "sci_get_device_file",
          description: "Get file contents from device via SCI",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
              path: { type: "string", description: "File path" },
              offset: { type: "number", description: "Byte offset to start reading", default: 0 },
              length: { type: "number", description: "Number of bytes to read (0 = all)", default: 0 },
            },
            required: ["device_id", "path"],
          },
        },

        // SCI - FIRMWARE QUERY
        {
          name: "sci_query_firmware_targets",
          description: "Query available firmware targets on device (what firmware can be updated)",
          inputSchema: {
            type: "object",
            properties: {
              device_id: { type: "string", description: "Device ID" },
            },
            required: ["device_id"],
          },
        },

        // SCI - JOB STATUS
        {
          name: "sci_get_job_status",
          description: "Get status of asynchronous SCI job by job ID",
          inputSchema: {
            type: "object",
            properties: {
              job_id: { type: "string", description: "SCI Job ID returned from async operation" },
            },
            required: ["job_id"],
          },
        },

        // SCI - DATA SERVICE (Read from DRM storage)
        {
          name: "sci_get_data_service_file",
          description: "Get file from Remote Manager Data Services storage",
          inputSchema: {
            type: "object",
            properties: {
              file_path: { type: "string", description: "Path in Data Services (e.g., 'db://path/to/file.xml')" },
            },
            required: ["file_path"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
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
    const response = await this.axiosClient.post('/sci', xmlRequest, {
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
    const response = await this.axiosClient.get("/v1/devices/inventory", { params });
    return this.formatResponse(response.data);
  }

  async listDevicesBulk(args) {
    const params = this.buildParams(args, ["query", "fields", "orderby"]);
    const response = await this.axiosClient.get("/v1/devices/bulk", { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getDevice(args) {
    const response = await this.axiosClient.get(`/v1/devices/inventory/${args.device_id}`);
    return this.formatResponse(response.data);
  }

  async listStreams(args) {
    const params = this.buildParams(args, ["query", "size", "cursor", "orderby", "category"]);
    const response = await this.axiosClient.get("/v1/streams/inventory", { params });
    return this.formatResponse(response.data);
  }

  async listStreamsBulk(args) {
    const params = this.buildParams(args, ["query", "fields", "orderby"]);
    const response = await this.axiosClient.get("/v1/streams/bulk", { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getStream(args) {
    const response = await this.axiosClient.get(`/v1/streams/inventory/${args.stream_id}`);
    return this.formatResponse(response.data);
  }

  async getStreamHistory(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "size", "cursor", "order"]);
    const response = await this.axiosClient.get(`/v1/streams/history/${args.stream_id}`, { params });
    return this.formatResponse(response.data);
  }

  async getStreamHistoryBulk(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "fields", "order"]);
    const response = await this.axiosClient.get(`/v1/streams/bulk/history/${args.stream_id}`, { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getStreamRollups(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "interval", "method", "size", "cursor"]);
    const response = await this.axiosClient.get(`/v1/streams/rollups/${args.stream_id}`, { params });
    return this.formatResponse(response.data);
  }

  async getStreamRollupsBulk(args) {
    const params = this.buildParams(args, ["interval", "method"]);
    const response = await this.axiosClient.get(`/v1/streams/bulk/rollups/${args.stream_id}`, { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getDeviceLogs(args) {
    const params = this.buildParams(args, ["start_time", "size"]);
    const response = await this.axiosClient.get(`/v1/device_logs/inventory/${args.device_id}`, { params });
    return this.formatResponse(response.data);
  }

  async listGroups(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/groups/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getGroup(args) {
    const response = await this.axiosClient.get(`/v1/groups/inventory/${args.group_id}`);
    return this.formatResponse(response.data);
  }

  async listAlerts(args) {
    const params = this.buildParams(args, ["query", "size", "orderby"]);
    const response = await this.axiosClient.get("/v1/alerts/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAlert(args) {
    const response = await this.axiosClient.get(`/v1/alerts/inventory/${args.alert_id}`);
    return this.formatResponse(response.data);
  }

  async listMonitors(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/monitors/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getMonitor(args) {
    const response = await this.axiosClient.get(`/v1/monitors/inventory/${args.monitor_id}`);
    return this.formatResponse(response.data);
  }

  async getMonitorHistory(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "size"]);
    const response = await this.axiosClient.get(`/v1/monitors/history/${args.monitor_id}`, { params });
    return this.formatResponse(response.data);
  }

  async listAutomations(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/automations/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAutomation(args) {
    const response = await this.axiosClient.get(`/v1/automations/inventory/${args.automation_id}`);
    return this.formatResponse(response.data);
  }

  async listAutomationRuns(args) {
    const params = this.buildParams(args, ["query", "size", "orderby"]);
    const response = await this.axiosClient.get("/v1/automations/runs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAutomationRun(args) {
    const response = await this.axiosClient.get(`/v1/automations/runs/inventory/${args.run_id}`);
    return this.formatResponse(response.data);
  }

  async listAutomationSchedules(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/automations/schedules/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAutomationSchedule(args) {
    const response = await this.axiosClient.get(`/v1/automations/schedules/inventory/${args.schedule_id}`);
    return this.formatResponse(response.data);
  }

  async listJobs(args) {
    const params = this.buildParams(args, ["query", "size", "cursor", "orderby"]);
    const response = await this.axiosClient.get("/v1/jobs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async listJobsBulk(args) {
    const params = this.buildParams(args, ["query", "fields"]);
    const response = await this.axiosClient.get("/v1/jobs/bulk", { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getJob(args) {
    const response = await this.axiosClient.get(`/v1/jobs/inventory/${args.job_id}`);
    return this.formatResponse(response.data);
  }

  async listFirmware(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/firmware/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getFirmware(args) {
    const response = await this.axiosClient.get(`/v1/firmware/inventory/${args.firmware_id}`);
    return this.formatResponse(response.data);
  }

  async listFirmwareUpdates(args) {
    const params = this.buildParams(args, ["query", "size", "orderby"]);
    const response = await this.axiosClient.get("/v1/firmware_updates/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getFirmwareUpdate(args) {
    const response = await this.axiosClient.get(`/v1/firmware_updates/inventory/${args.update_id}`);
    return this.formatResponse(response.data);
  }

  async listReports() {
    const response = await this.axiosClient.get("/v1/reports");
    return this.formatResponse(response.data);
  }

  async getConnectionReport(args) {
    const params = this.buildParams(args, ["query", "group"]);
    const response = await this.axiosClient.get("/v1/reports/connections", { params });
    return this.formatResponse(response.data);
  }

  async getAlertReport(args) {
    const params = this.buildParams(args, ["query", "start_time", "end_time"]);
    const response = await this.axiosClient.get("/v1/reports/alerts", { params });
    return this.formatResponse(response.data);
  }

  async getDeviceReport(args) {
    const params = this.buildParams(args, ["query", "group", "scope"]);
    const response = await this.axiosClient.get(`/v1/reports/devices/${args.report_type}`, { params });
    return this.formatResponse(response.data);
  }

  async getCellularUtilizationReport(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "query"]);
    const response = await this.axiosClient.get("/v1/reports/cellular_utilization", { params });
    return this.formatResponse(response.data);
  }

  async getDeviceAvailabilityReport(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "query"]);
    const response = await this.axiosClient.get("/v1/reports/device_availability", { params });
    return this.formatResponse(response.data);
  }

  async listTemplates(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/configs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getTemplate(args) {
    const response = await this.axiosClient.get(`/v1/configs/inventory/${args.config_id}`);
    return this.formatResponse(response.data);
  }

  async listHealthConfigs(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/health_configs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getHealthConfig(args) {
    const response = await this.axiosClient.get(`/v1/health_configs/inventory/${args.health_config_id}`);
    return this.formatResponse(response.data);
  }

  async listEvents(args) {
    const params = this.buildParams(args, ["query", "start_time", "end_time", "size"]);
    const response = await this.axiosClient.get("/v1/events/inventory", { params });
    return this.formatResponse(response.data);
  }

  async listEventsBulk(args) {
    const params = this.buildParams(args, ["query", "start_time", "end_time", "fields"]);
    const response = await this.axiosClient.get("/v1/events/bulk", { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async listUsers(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/users/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getUser(args) {
    const response = await this.axiosClient.get(`/v1/users/inventory/${args.user_id}`);
    return this.formatResponse(response.data);
  }

  async listFiles(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/files/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getFile(args) {
    const response = await this.axiosClient.get(`/v1/files/inventory/${args.file_id}`);
    return this.formatResponse(response.data);
  }

  async getAccountInfo() {
    const response = await this.axiosClient.get("/v1/account");
    return this.formatResponse(response.data);
  }

  async getAccountSecurity(args) {
    const params = {};
    if (args.system_defaults) params.system_defaults = "true";
    const response = await this.axiosClient.get("/v1/account/current/security", { params });
    return this.formatResponse(response.data);
  }

  async getApiInfo(args) {
    const endpoint = args.endpoint || "";
    const url = endpoint ? `/v1/${endpoint}` : "/v1";
    const response = await this.axiosClient.get(url);
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
    const response = await this.axiosClient.get(`/sci/${job_id}`, {
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
      allowedHeaders: ['Content-Type', 'Accept', 'Mcp-Session-Id', 'Last-Event-ID'],
      exposedHeaders: ['Mcp-Session-Id']
    }));
    app.use(express.json());
    
    app.all('/mcp', async (req, res) => {
      console.error(`${req.method} /mcp - Request received`);
      
      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true
        });
        
        res.on('close', () => {
          transport.close();
        });
        
        await this.server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        
        console.error(`${req.method} /mcp - Request handled successfully`);
      } catch (error) {
        console.error('Error handling MCP request:', error);
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
      res.json({ 
        status: 'ok', 
        server: 'digi-remote-manager-mcp',
        version: '2.0.0',
        transport: 'streamable-http',
        endpoint: '/mcp',
        tools: 60
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
