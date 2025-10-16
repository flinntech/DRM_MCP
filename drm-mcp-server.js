#!/usr/bin/env node

/**
 * Digi Remote Manager MCP Server - Enhanced Version
 * Fixed for n8n compatibility
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
const API_KEY_ID = "21ceb74482394018f7c99aeac9b8a8a8";
const API_KEY_SECRET = "c815fb75829ac2417997180c43e2f5d17501cbb3cc25aafb1c16067683f3438b";
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // ==================== DEVICE APIS ====================
          {
            name: "list_devices",
            description: "List all devices. Query examples: 'connection_status=\"connected\"', 'signal_percent<50', 'group startsWith \"/Production\"', 'tags=\"critical\" and health_status=\"error\"'",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                size: { type: "number", description: "Results to return" },
                cursor: { type: "string", description: "Pagination cursor" },
                orderby: { type: "string", description: "Sort field and order" },
              },
              required: [],
            },
          },
          {
            name: "list_devices_bulk",
            description: "Export devices to CSV format",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                fields: { type: "string", description: "Comma-separated fields" },
                orderby: { type: "string", description: "Sort field" },
              },
              required: [],
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
            name: "get_device_data_streams",
            description: "Get device data streams with history",
            inputSchema: {
              type: "object",
              properties: {
                device_id: { type: "string", description: "Device ID" },
                stream_id: { type: "string", description: "Optional stream ID" },
                start_time: { type: "string", description: "Start time (ISO or relative like '-1d')" },
                end_time: { type: "string", description: "End time" },
                size: { type: "number", description: "Number of points" },
                cursor: { type: "string", description: "Pagination cursor" },
              },
              required: ["device_id"],
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

          // ==================== GROUP APIS ====================
          {
            name: "list_groups",
            description: "List device groups",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                orderby: { type: "string", description: "Sort field" },
              },
              required: [],
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

          // ==================== ALERT APIS ====================
          {
            name: "list_alerts",
            description: "List alerts",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                size: { type: "number", description: "Results to return" },
                orderby: { type: "string", description: "Sort field" },
              },
              required: [],
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

          // ==================== MONITOR APIS ====================
          {
            name: "list_monitors",
            description: "List monitors (webhooks)",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                orderby: { type: "string", description: "Sort field" },
              },
              required: [],
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

          // ==================== AUTOMATION APIS ====================
          {
            name: "list_automations",
            description: "List automations",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                orderby: { type: "string", description: "Sort field" },
              },
              required: [],
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
                size: { type: "number", description: "Results to return" },
                orderby: { type: "string", description: "Sort field (default: 'id desc')" },
              },
              required: [],
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
              required: [],
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

          // ==================== JOB APIS ====================
          {
            name: "list_jobs",
            description: "List jobs (firmware updates, configs, etc.)",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                size: { type: "number", description: "Results to return" },
                cursor: { type: "string", description: "Pagination cursor" },
                orderby: { type: "string", description: "Sort field (default: 'id desc')" },
              },
              required: [],
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
              required: [],
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

          // ==================== FIRMWARE APIS ====================
          {
            name: "list_firmware",
            description: "List firmware versions",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                orderby: { type: "string", description: "Sort field" },
              },
              required: [],
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
                size: { type: "number", description: "Results to return" },
                orderby: { type: "string", description: "Sort field" },
              },
              required: [],
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

          // ==================== REPORTS APIS ====================
          {
            name: "list_reports",
            description: "List available report types",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
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
              required: [],
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
              required: [],
            },
          },
          {
            name: "get_device_report",
            description: "Get device summary by dimension (health_status, firmware_version, connection_status, carrier, signal_percent, type, vendor_id, restricted_status, compliance, tags)",
            inputSchema: {
              type: "object",
              properties: {
                report_type: { type: "string", description: "Report dimension" },
                query: { type: "string", description: "Query filter" },
                group: { type: "string", description: "Limit to group" },
                scope: { type: "string", description: "For cellular: 'primary' or 'secondary'" },
              },
              required: ["report_type"],
            },
          },
          {
            name: "get_cellular_utilization_report",
            description: "Get cellular data usage",
            inputSchema: {
              type: "object",
              properties: {
                start_time: { type: "string", description: "Start time" },
                end_time: { type: "string", description: "End time" },
                query: { type: "string", description: "Query filter" },
              },
              required: [],
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
              required: [],
            },
          },

          // ==================== CONFIG APIS ====================
          {
            name: "list_configs",
            description: "List configuration templates",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                orderby: { type: "string", description: "Sort field" },
              },
              required: [],
            },
          },
          {
            name: "get_config",
            description: "Get config details",
            inputSchema: {
              type: "object",
              properties: {
                config_id: { type: "string", description: "Config ID" },
              },
              required: ["config_id"],
            },
          },

          // ==================== HEALTH CONFIG APIS ====================
          {
            name: "list_health_configs",
            description: "List health monitoring configs",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                orderby: { type: "string", description: "Sort field" },
              },
              required: [],
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

          // ==================== EVENT APIS ====================
          {
            name: "list_events",
            description: "List event log (audit trail)",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                start_time: { type: "string", description: "Start time" },
                end_time: { type: "string", description: "End time" },
                size: { type: "number", description: "Results to return" },
              },
              required: [],
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
              required: [],
            },
          },

          // ==================== USER APIS ====================
          {
            name: "list_users",
            description: "List users",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                orderby: { type: "string", description: "Sort field" },
              },
              required: [],
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

          // ==================== API KEY APIS ====================
          {
            name: "list_api_keys",
            description: "List API keys",
            inputSchema: {
              type: "object",
              properties: {
                orderby: { type: "string", description: "Sort field" },
              },
              required: [],
            },
          },
          {
            name: "get_api_key",
            description: "Get API key details",
            inputSchema: {
              type: "object",
              properties: {
                api_key_id: { type: "string", description: "API key ID" },
              },
              required: ["api_key_id"],
            },
          },

          // ==================== FILE APIS ====================
          {
            name: "list_files",
            description: "List files",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query filter" },
                orderby: { type: "string", description: "Sort field" },
              },
              required: [],
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

          // ==================== ACCOUNT APIS ====================
          {
            name: "get_account_info",
            description: "Get account information",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
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
              required: [],
            },
          },

          // ==================== UTILITY APIS ====================
          {
            name: "get_api_info",
            description: "Get self-documented API info for endpoint discovery",
            inputSchema: {
              type: "object",
              properties: {
                endpoint: { type: "string", description: "Endpoint name (devices, alerts, jobs, etc.) or empty for top-level" },
              },
              required: [],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case "list_devices": return await this.listDevices(args);
          case "list_devices_bulk": return await this.listDevicesBulk(args);
          case "get_device": return await this.getDevice(args);
          case "get_device_data_streams": return await this.getDeviceDataStreams(args);
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
          case "list_configs": return await this.listConfigs(args);
          case "get_config": return await this.getConfig(args);
          case "list_health_configs": return await this.listHealthConfigs(args);
          case "get_health_config": return await this.getHealthConfig(args);
          case "list_events": return await this.listEvents(args);
          case "list_events_bulk": return await this.listEventsBulk(args);
          case "list_users": return await this.listUsers(args);
          case "get_user": return await this.getUser(args);
          case "list_api_keys": return await this.listApiKeys(args);
          case "get_api_key": return await this.getApiKey(args);
          case "list_files": return await this.listFiles(args);
          case "get_file": return await this.getFile(args);
          case "get_account_info": return await this.getAccountInfo(args);
          case "get_account_security": return await this.getAccountSecurity(args);
          case "get_api_info": return await this.getApiInfo(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return this.handleError(error);
      }
    });
  }

  handleError(error) {
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

  buildParams(args, allowedParams = []) {
    const params = {};
    for (const param of allowedParams) {
      if (args[param] !== undefined) params[param] = args[param];
    }
    return params;
  }

  formatResponse(data) {
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  // ==================== IMPLEMENTATIONS ====================
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

  async getDeviceDataStreams(args) {
    let url = `/v1/streams/${args.device_id}`;
    if (args.stream_id) url += `/${args.stream_id}`;
    const params = this.buildParams(args, ["start_time", "end_time", "size", "cursor"]);
    const response = await this.axiosClient.get(url, { params });
    return this.formatResponse(response.data);
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

  async listConfigs(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/configs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getConfig(args) {
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

  async listApiKeys(args) {
    const params = this.buildParams(args, ["orderby"]);
    const response = await this.axiosClient.get("/v1/api_keys/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getApiKey(args) {
    const response = await this.axiosClient.get(`/v1/api_keys/inventory/${args.api_key_id}`);
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

  async run() {
    const transportType = process.env.MCP_TRANSPORT || "stdio";

    if (transportType === "http") {
      const PORT = process.env.MCP_PORT || 3000;
      await this.startHttpServer(PORT);
    } else {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("Digi Remote Manager MCP server running on stdio");
    }
  }

  async startHttpServer(port) {
    const express = (await import("express")).default;
    const cors = (await import("cors")).default;

    const app = express();
    app.use(cors({
      origin: "*",
      methods: ["GET", "POST", "OPTIONS", "DELETE"],
      allowedHeaders: ["Content-Type", "Accept", "Mcp-Session-Id", "Last-Event-ID"],
      exposedHeaders: ["Mcp-Session-Id"],
    }));
    app.use(express.json());

    app.all("/mcp", async (req, res) => {
      console.error(`${req.method} /mcp - Request received`);

      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });

        res.on("close", () => {
          transport.close();
        });

        await this.server.connect(transport);
        await transport.handleRequest(req, res, req.body);

        console.error(`${req.method} /mcp - Request handled successfully`);
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          });
        }
      }
    });

    app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        server: "digi-remote-manager-mcp",
        version: "2.0.0",
        transport: "streamable-http",
        endpoint: "/mcp",
        tools: 48,
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
