#!/usr/bin/env node

/**
 * Digi Remote Manager MCP Server - Enhanced Version
 * Maintains exact original structure for n8n compatibility
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "list_devices",
          description: "List all devices in your Remote Manager account. Supports filtering with query parameters.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter devices (e.g., 'connection_status = \"connected\"')",
              },
              size: {
                type: "number",
                description: "Number of results to return (default: 1000)",
              },
              cursor: {
                type: "string",
                description: "Cursor for pagination",
              },
              orderby: {
                type: "string",
                description: "Field to sort by with optional 'asc' or 'desc'",
              },
            },
          },
        },
        {
          name: "list_devices_bulk",
          description: "Get devices in CSV format for large exports",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter devices",
              },
              fields: {
                type: "string",
                description: "Comma-separated list of fields to include",
              },
              orderby: {
                type: "string",
                description: "Field to sort by",
              },
            },
          },
        },
        {
          name: "get_device",
          description: "Get detailed information about a specific device by ID",
          inputSchema: {
            type: "object",
            properties: {
              device_id: {
                type: "string",
                description: "The device ID (UUID format)",
              },
            },
            required: ["device_id"],
          },
        },
        {
          name: "get_device_data_streams",
          description: "Get data streams (channel data) from a device",
          inputSchema: {
            type: "object",
            properties: {
              device_id: {
                type: "string",
                description: "The device ID",
              },
              stream_id: {
                type: "string",
                description: "Optional stream ID to get specific stream",
              },
              start_time: {
                type: "string",
                description: "Start time for data (ISO 8601 or relative like '-1d')",
              },
              end_time: {
                type: "string",
                description: "End time for data (ISO 8601)",
              },
              size: {
                type: "number",
                description: "Number of data points to return",
              },
              cursor: {
                type: "string",
                description: "Cursor for pagination",
              },
            },
            required: ["device_id"],
          },
        },
        {
          name: "list_groups",
          description: "List all device groups in your account",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter groups",
              },
              orderby: {
                type: "string",
                description: "Field to sort by",
              },
            },
          },
        },
        {
          name: "get_group",
          description: "Get detailed information about a specific group",
          inputSchema: {
            type: "object",
            properties: {
              group_id: {
                type: "string",
                description: "The group ID",
              },
            },
            required: ["group_id"],
          },
        },
        {
          name: "list_alerts",
          description: "List configured alerts in your account",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter alerts",
              },
              size: {
                type: "number",
                description: "Number of results to return",
              },
              orderby: {
                type: "string",
                description: "Field to sort by",
              },
            },
          },
        },
        {
          name: "get_alert",
          description: "Get detailed information about a specific alert",
          inputSchema: {
            type: "object",
            properties: {
              alert_id: {
                type: "string",
                description: "The alert ID",
              },
            },
            required: ["alert_id"],
          },
        },
        {
          name: "list_monitors",
          description: "List configured monitors (webhooks) in your account",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter monitors",
              },
              orderby: {
                type: "string",
                description: "Field to sort by",
              },
            },
          },
        },
        {
          name: "get_monitor",
          description: "Get detailed information about a specific monitor",
          inputSchema: {
            type: "object",
            properties: {
              monitor_id: {
                type: "string",
                description: "The monitor ID",
              },
            },
            required: ["monitor_id"],
          },
        },
        {
          name: "get_monitor_history",
          description: "Get historical polling data for a monitor",
          inputSchema: {
            type: "object",
            properties: {
              monitor_id: {
                type: "string",
                description: "The monitor ID",
              },
              start_time: {
                type: "string",
                description: "Start time for history",
              },
              end_time: {
                type: "string",
                description: "End time for history",
              },
              size: {
                type: "number",
                description: "Number of history entries",
              },
            },
            required: ["monitor_id"],
          },
        },
        {
          name: "get_account_info",
          description: "Get information about your Remote Manager account",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_account_security",
          description: "Get account security settings and password policies",
          inputSchema: {
            type: "object",
            properties: {
              system_defaults: {
                type: "boolean",
                description: "Get system default settings instead of account settings",
              },
            },
          },
        },
        {
          name: "list_users",
          description: "List users in your Remote Manager account",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter users",
              },
              orderby: {
                type: "string",
                description: "Field to sort by",
              },
            },
          },
        },
        {
          name: "get_user",
          description: "Get detailed information about a specific user",
          inputSchema: {
            type: "object",
            properties: {
              user_id: {
                type: "string",
                description: "The user ID",
              },
            },
            required: ["user_id"],
          },
        },
        {
          name: "list_automations",
          description: "List configured automations (scheduled tasks/scripts) in your account",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter automations",
              },
              orderby: {
                type: "string",
                description: "Field to sort by",
              },
            },
          },
        },
        {
          name: "get_automation",
          description: "Get detailed information about a specific automation",
          inputSchema: {
            type: "object",
            properties: {
              automation_id: {
                type: "string",
                description: "The automation ID",
              },
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
              query: {
                type: "string",
                description: "Query to filter runs",
              },
              size: {
                type: "number",
                description: "Number of results",
              },
              orderby: {
                type: "string",
                description: "Field to sort by",
              },
            },
          },
        },
        {
          name: "get_automation_run",
          description: "Get details of a specific automation run",
          inputSchema: {
            type: "object",
            properties: {
              run_id: {
                type: "string",
                description: "The run ID",
              },
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
              query: {
                type: "string",
                description: "Query to filter schedules",
              },
              orderby: {
                type: "string",
                description: "Field to sort by",
              },
            },
          },
        },
        {
          name: "get_automation_schedule",
          description: "Get schedule details",
          inputSchema: {
            type: "object",
            properties: {
              schedule_id: {
                type: "string",
                description: "The schedule ID",
              },
            },
            required: ["schedule_id"],
          },
        },
        {
          name: "get_device_logs",
          description: "Get device logs for troubleshooting",
          inputSchema: {
            type: "object",
            properties: {
              device_id: {
                type: "string",
                description: "The device ID",
              },
              start_time: {
                type: "string",
                description: "Start time for logs (ISO 8601 or relative like '-1d')",
              },
              size: {
                type: "number",
                description: "Number of log entries to return",
              },
            },
            required: ["device_id"],
          },
        },
        {
          name: "list_firmware",
          description: "List available firmware versions",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter firmware",
              },
              orderby: {
                type: "string",
                description: "Field to sort by",
              },
            },
          },
        },
        {
          name: "get_firmware",
          description: "Get detailed information about a specific firmware version",
          inputSchema: {
            type: "object",
            properties: {
              firmware_id: {
                type: "string",
                description: "The firmware ID",
              },
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
              query: {
                type: "string",
                description: "Query to filter updates",
              },
              size: {
                type: "number",
                description: "Number of results",
              },
              orderby: {
                type: "string",
                description: "Field to sort by",
              },
            },
          },
        },
        {
          name: "get_firmware_update",
          description: "Get firmware update status and progress",
          inputSchema: {
            type: "object",
            properties: {
              update_id: {
                type: "string",
                description: "The update ID",
              },
            },
            required: ["update_id"],
          },
        },
        {
          name: "list_events",
          description: "List events from your account event log",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter events",
              },
              start_time: {
                type: "string",
                description: "Start time for events (ISO 8601 or relative like '-1d')",
              },
              end_time: {
                type: "string",
                description: "End time for events",
              },
              size: {
                type: "number",
                description: "Number of events to return",
              },
            },
          },
        },
        {
          name: "list_events_bulk",
          description: "Export events to CSV format",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query to filter events",
              },
              start_time: {
                type: "string",
                description: "Start time",
              },
              end_time: {
                type: "string",
                description: "End time",
              },
              fields: {
                type: "string",
                description: "Comma-separated fields",
              },
            },
          },
        },
        {
          name: "list_jobs",
          description: "List all jobs (firmware updates, config deployments, etc.)",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query to filter jobs",
              },
              size: {
                type: "number",
                description: "Number of results",
              },
              cursor: {
                type: "string",
                description: "Pagination cursor",
              },
              orderby: {
                type: "string",
                description: "Field to sort by",
              },
            },
          },
        },
        {
          name: "list_jobs_bulk",
          description: "Export jobs to CSV",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query to filter",
              },
              fields: {
                type: "string",
                description: "Comma-separated fields",
              },
            },
          },
        },
        {
          name: "get_job",
          description: "Get job details",
          inputSchema: {
            type: "object",
            properties: {
              job_id: {
                type: "string",
                description: "Job ID",
              },
            },
            required: ["job_id"],
          },
        },
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
          description: "Get device connection status summary",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query filter",
              },
              group: {
                type: "string",
                description: "Limit to group",
              },
            },
          },
        },
        {
          name: "get_alert_report",
          description: "Get alert summary report",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query filter",
              },
              start_time: {
                type: "string",
                description: "Start time",
              },
              end_time: {
                type: "string",
                description: "End time",
              },
            },
          },
        },
        {
          name: "get_device_report",
          description: "Get device summary by dimension (health_status, firmware_version, connection_status, carrier, signal_percent, type, etc.)",
          inputSchema: {
            type: "object",
            properties: {
              report_type: {
                type: "string",
                description: "Report dimension",
              },
              query: {
                type: "string",
                description: "Query filter",
              },
              group: {
                type: "string",
                description: "Limit to group",
              },
              scope: {
                type: "string",
                description: "For cellular: primary or secondary",
              },
            },
            required: ["report_type"],
          },
        },
        {
          name: "list_configs",
          description: "List configuration templates",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query filter",
              },
              orderby: {
                type: "string",
                description: "Sort field",
              },
            },
          },
        },
        {
          name: "get_config",
          description: "Get config details",
          inputSchema: {
            type: "object",
            properties: {
              config_id: {
                type: "string",
                description: "Config ID",
              },
            },
            required: ["config_id"],
          },
        },
        {
          name: "list_health_configs",
          description: "List health monitoring configurations",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query filter",
              },
              orderby: {
                type: "string",
                description: "Sort field",
              },
            },
          },
        },
        {
          name: "get_health_config",
          description: "Get health config details",
          inputSchema: {
            type: "object",
            properties: {
              health_config_id: {
                type: "string",
                description: "Health config ID",
              },
            },
            required: ["health_config_id"],
          },
        },
        {
          name: "list_api_keys",
          description: "List API keys",
          inputSchema: {
            type: "object",
            properties: {
              orderby: {
                type: "string",
                description: "Sort field",
              },
            },
          },
        },
        {
          name: "get_api_key",
          description: "Get API key details",
          inputSchema: {
            type: "object",
            properties: {
              api_key_id: {
                type: "string",
                description: "API key ID",
              },
            },
            required: ["api_key_id"],
          },
        },
        {
          name: "list_files",
          description: "List files",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query filter",
              },
              orderby: {
                type: "string",
                description: "Sort field",
              },
            },
          },
        },
        {
          name: "get_file",
          description: "Get file details",
          inputSchema: {
            type: "object",
            properties: {
              file_id: {
                type: "string",
                description: "File ID",
              },
            },
            required: ["file_id"],
          },
        },
        {
          name: "get_api_info",
          description: "Get self-documented API information for endpoint discovery",
          inputSchema: {
            type: "object",
            properties: {
              endpoint: {
                type: "string",
                description: "Endpoint name or empty for top-level",
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case "list_devices":
            return await this.listDevices(args);
          case "list_devices_bulk":
            return await this.listDevicesBulk(args);
          case "get_device":
            return await this.getDevice(args);
          case "get_device_data_streams":
            return await this.getDeviceDataStreams(args);
          case "list_groups":
            return await this.listGroups(args);
          case "get_group":
            return await this.getGroup(args);
          case "list_alerts":
            return await this.listAlerts(args);
          case "get_alert":
            return await this.getAlert(args);
          case "list_monitors":
            return await this.listMonitors(args);
          case "get_monitor":
            return await this.getMonitor(args);
          case "get_monitor_history":
            return await this.getMonitorHistory(args);
          case "get_account_info":
            return await this.getAccountInfo(args);
          case "get_account_security":
            return await this.getAccountSecurity(args);
          case "list_users":
            return await this.listUsers(args);
          case "get_user":
            return await this.getUser(args);
          case "list_automations":
            return await this.listAutomations(args);
          case "get_automation":
            return await this.getAutomation(args);
          case "list_automation_runs":
            return await this.listAutomationRuns(args);
          case "get_automation_run":
            return await this.getAutomationRun(args);
          case "list_automation_schedules":
            return await this.listAutomationSchedules(args);
          case "get_automation_schedule":
            return await this.getAutomationSchedule(args);
          case "get_device_logs":
            return await this.getDeviceLogs(args);
          case "list_firmware":
            return await this.listFirmware(args);
          case "get_firmware":
            return await this.getFirmware(args);
          case "list_firmware_updates":
            return await this.listFirmwareUpdates(args);
          case "get_firmware_update":
            return await this.getFirmwareUpdate(args);
          case "list_events":
            return await this.listEvents(args);
          case "list_events_bulk":
            return await this.listEventsBulk(args);
          case "list_jobs":
            return await this.listJobs(args);
          case "list_jobs_bulk":
            return await this.listJobsBulk(args);
          case "get_job":
            return await this.getJob(args);
          case "list_reports":
            return await this.listReports(args);
          case "get_connection_report":
            return await this.getConnectionReport(args);
          case "get_alert_report":
            return await this.getAlertReport(args);
          case "get_device_report":
            return await this.getDeviceReport(args);
          case "list_configs":
            return await this.listConfigs(args);
          case "get_config":
            return await this.getConfig(args);
          case "list_health_configs":
            return await this.listHealthConfigs(args);
          case "get_health_config":
            return await this.getHealthConfig(args);
          case "list_api_keys":
            return await this.listApiKeys(args);
          case "get_api_key":
            return await this.getApiKey(args);
          case "list_files":
            return await this.listFiles(args);
          case "get_file":
            return await this.getFile(args);
          case "get_api_info":
            return await this.getApiInfo(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          return {
            content: [
              {
                type: "text",
                text: "Authentication Error: Invalid API key. Please check your API key in the code.",
              },
            ],
            isError: true,
          };
        }

        if (error.response?.status === 403) {
          return {
            content: [
              {
                type: "text",
                text: "Permission Denied: This feature may require Remote Manager Premier Edition.",
              },
            ],
            isError: true,
          };
        }

        if (error.response?.status === 404) {
          return {
            content: [
              {
                type: "text",
                text: "Not Found: The requested resource does not exist.",
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}\n${error.response?.data ? JSON.stringify(error.response.data, null, 2) : ""}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  buildParams(args, allowedParams) {
    const params = {};
    for (const param of allowedParams) {
      if (args[param] !== undefined) {
        params[param] = args[param];
      }
    }
    return params;
  }

  async listDevices(args) {
    const params = this.buildParams(args, ["query", "size", "cursor", "orderby"]);
    const response = await this.axiosClient.get("/v1/devices/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listDevicesBulk(args) {
    const params = this.buildParams(args, ["query", "fields", "orderby"]);
    const response = await this.axiosClient.get("/v1/devices/bulk", { params });
    return {
      content: [
        {
          type: "text",
          text: response.data,
        },
      ],
    };
  }

  async getDevice(args) {
    const response = await this.axiosClient.get(`/v1/devices/inventory/${args.device_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getDeviceDataStreams(args) {
    let url = `/v1/streams/${args.device_id}`;
    if (args.stream_id) {
      url += `/${args.stream_id}`;
    }

    const params = this.buildParams(args, ["start_time", "end_time", "size", "cursor"]);
    const response = await this.axiosClient.get(url, { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listGroups(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/groups/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getGroup(args) {
    const response = await this.axiosClient.get(`/v1/groups/inventory/${args.group_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listAlerts(args) {
    const params = this.buildParams(args, ["query", "size", "orderby"]);
    const response = await this.axiosClient.get("/v1/alerts/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getAlert(args) {
    const response = await this.axiosClient.get(`/v1/alerts/inventory/${args.alert_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listMonitors(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/monitors/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getMonitor(args) {
    const response = await this.axiosClient.get(`/v1/monitors/inventory/${args.monitor_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getMonitorHistory(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "size"]);
    const response = await this.axiosClient.get(`/v1/monitors/history/${args.monitor_id}`, { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getAccountInfo() {
    const response = await this.axiosClient.get("/v1/account");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getAccountSecurity(args) {
    const params = {};
    if (args.system_defaults) {
      params.system_defaults = "true";
    }
    const response = await this.axiosClient.get("/v1/account/current/security", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listUsers(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/users/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getUser(args) {
    const response = await this.axiosClient.get(`/v1/users/inventory/${args.user_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listAutomations(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/automations/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getAutomation(args) {
    const response = await this.axiosClient.get(`/v1/automations/inventory/${args.automation_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listAutomationRuns(args) {
    const params = this.buildParams(args, ["query", "size", "orderby"]);
    const response = await this.axiosClient.get("/v1/automations/runs/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getAutomationRun(args) {
    const response = await this.axiosClient.get(`/v1/automations/runs/inventory/${args.run_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listAutomationSchedules(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/automations/schedules/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getAutomationSchedule(args) {
    const response = await this.axiosClient.get(`/v1/automations/schedules/inventory/${args.schedule_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getDeviceLogs(args) {
    const params = this.buildParams(args, ["start_time", "size"]);
    const response = await this.axiosClient.get(
      `/v1/device_logs/inventory/${args.device_id}`,
      { params }
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listFirmware(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/firmware/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getFirmware(args) {
    const response = await this.axiosClient.get(`/v1/firmware/inventory/${args.firmware_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listFirmwareUpdates(args) {
    const params = this.buildParams(args, ["query", "size", "orderby"]);
    const response = await this.axiosClient.get("/v1/firmware_updates/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getFirmwareUpdate(args) {
    const response = await this.axiosClient.get(`/v1/firmware_updates/inventory/${args.update_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listEvents(args) {
    const params = this.buildParams(args, ["query", "start_time", "end_time", "size"]);
    const response = await this.axiosClient.get("/v1/events/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listEventsBulk(args) {
    const params = this.buildParams(args, ["query", "start_time", "end_time", "fields"]);
    const response = await this.axiosClient.get("/v1/events/bulk", { params });
    return {
      content: [
        {
          type: "text",
          text: response.data,
        },
      ],
    };
  }

  async listJobs(args) {
    const params = this.buildParams(args, ["query", "size", "cursor", "orderby"]);
    const response = await this.axiosClient.get("/v1/jobs/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listJobsBulk(args) {
    const params = this.buildParams(args, ["query", "fields"]);
    const response = await this.axiosClient.get("/v1/jobs/bulk", { params });
    return {
      content: [
        {
          type: "text",
          text: response.data,
        },
      ],
    };
  }

  async getJob(args) {
    const response = await this.axiosClient.get(`/v1/jobs/inventory/${args.job_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listReports() {
    const response = await this.axiosClient.get("/v1/reports");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getConnectionReport(args) {
    const params = this.buildParams(args, ["query", "group"]);
    const response = await this.axiosClient.get("/v1/reports/connections", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getAlertReport(args) {
    const params = this.buildParams(args, ["query", "start_time", "end_time"]);
    const response = await this.axiosClient.get("/v1/reports/alerts", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getDeviceReport(args) {
    const params = this.buildParams(args, ["query", "group", "scope"]);
    const response = await this.axiosClient.get(`/v1/reports/devices/${args.report_type}`, { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listConfigs(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/configs/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getConfig(args) {
    const response = await this.axiosClient.get(`/v1/configs/inventory/${args.config_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listHealthConfigs(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/health_configs/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getHealthConfig(args) {
    const response = await this.axiosClient.get(`/v1/health_configs/inventory/${args.health_config_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listApiKeys(args) {
    const params = this.buildParams(args, ["orderby"]);
    const response = await this.axiosClient.get("/v1/api_keys/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getApiKey(args) {
    const response = await this.axiosClient.get(`/v1/api_keys/inventory/${args.api_key_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async listFiles(args) {
    const params = this.buildParams(args, ["query", "orderby"]);
    const response = await this.axiosClient.get("/v1/files/inventory", { params });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getFile(args) {
    const response = await this.axiosClient.get(`/v1/files/inventory/${args.file_id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async getApiInfo(args) {
    const endpoint = args.endpoint || "";
    const url = endpoint ? `/v1/${endpoint}` : "/v1";
    const response = await this.axiosClient.get(url);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
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
    app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "OPTIONS", "DELETE"],
        allowedHeaders: ["Content-Type", "Accept", "Mcp-Session-Id", "Last-Event-ID"],
        exposedHeaders: ["Mcp-Session-Id"],
      })
    );
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
            error: {
              code: -32603,
              message: "Internal server error",
            },
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
        tools: 45,
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
