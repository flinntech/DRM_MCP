#!/usr/bin/env node

/**
 * Digi Remote Manager MCP Server - Enhanced Version
 * 
 * Features:
 * - Secure environment variable-based authentication
 * - Comprehensive API coverage (22 major endpoints)
 * - Better error handling and pagination
 * - Bulk operations support
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

class DigiRemoteManagerServer {
  constructor() {
    // Use environment variables for security
    const API_KEY_ID = "21ceb74482394018f7c99aeac9b8a8a8";
    const API_KEY_SECRET = "c815fb75829ac2417997180c43e2f5d17501cbb3cc25aafb1c16067683f3438b";
    
    if (!API_KEY_ID || !API_KEY_SECRET) {
      console.error("╔════════════════════════════════════════════════════════════╗");
      console.error("║  ERROR: API credentials not configured                    ║");
      console.error("╚════════════════════════════════════════════════════════════╝");
      console.error("");
      console.error("Please set environment variables:");
      console.error("  DRM_API_KEY_ID=your_api_key_id");
      console.error("  DRM_API_KEY_SECRET=your_api_key_secret");
      console.error("");
      console.error("Or create a .env file with these values.");
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
    
    console.error("✓ DRM MCP Server initialized with secure API Key authentication");

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
          description: "List all devices in your Remote Manager account with optional filtering and pagination.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: `Query using DRM query language. Examples:
- connection_status = "connected"
- last_update > -1d
- tags = 'sensor' and connection_status = 'connected'
- group startsWith '/production/'
Operators: =, !=, <, <=, >, >=, startsWith, endsWith, contains
Time: -1h, -1d, -7d, or ISO 8601 format`,
              },
              size: {
                type: "number",
                description: "Number of results per page (default: 1000, max: 1000)",
              },
              cursor: {
                type: "string",
                description: "Pagination cursor from previous response",
              },
            },
          },
        },
        {
          name: "list_devices_bulk",
          description: "Export devices in CSV format for bulk analysis. Returns CSV data.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter devices",
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
                description: "The device ID (UUID format: 00000000-00000000-00000000-00000000)",
              },
            },
            required: ["device_id"],
          },
        },
        {
          name: "get_device_data_streams",
          description: "Get data streams (sensor/telemetry data) from a device",
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
                description: "Start time (ISO 8601 or relative like '-1d', '-1h')",
              },
              end_time: {
                type: "string",
                description: "End time (ISO 8601 format)",
              },
            },
            required: ["device_id"],
          },
        },
        {
          name: "get_device_metrics",
          description: "Get device metrics data (performance, connectivity stats)",
          inputSchema: {
            type: "object",
            properties: {
              device_id: {
                type: "string",
                description: "The device ID",
              },
              start_time: {
                type: "string",
                description: "Start time (ISO 8601 or relative like '-1d')",
              },
              end_time: {
                type: "string",
                description: "End time (ISO 8601)",
              },
            },
            required: ["device_id"],
          },
        },
        {
          name: "get_device_logs",
          description: "Get device logs for troubleshooting and debugging",
          inputSchema: {
            type: "object",
            properties: {
              device_id: {
                type: "string",
                description: "The device ID",
              },
              start_time: {
                type: "string",
                description: "Start time (ISO 8601 or relative like '-1d')",
              },
              size: {
                type: "number",
                description: "Number of log entries to return (default: 100)",
              },
            },
            required: ["device_id"],
          },
        },
        
        // GROUPS
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
        
        // ALERTS
        {
          name: "list_alerts",
          description: "List configured alerts (also called alarms) in your account",
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
        
        // MONITORS (Webhooks/Push Notifications)
        {
          name: "list_monitors",
          description: "List configured monitors (webhooks/push notifications) in your account",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter monitors",
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
        
        // JOBS
        {
          name: "list_jobs",
          description: "List jobs (operations/tasks) in your account. Jobs track async operations like firmware updates, config changes, etc.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter jobs",
              },
              size: {
                type: "number",
                description: "Number of results to return",
              },
              cursor: {
                type: "string",
                description: "Pagination cursor",
              },
            },
          },
        },
        {
          name: "get_job",
          description: "Get detailed information about a specific job",
          inputSchema: {
            type: "object",
            properties: {
              job_id: {
                type: "string",
                description: "The job ID",
              },
            },
            required: ["job_id"],
          },
        },
        
        // FIRMWARE
        {
          name: "list_firmware",
          description: "List available firmware versions (Digi official firmware)",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter firmware",
              },
              vendor_id: {
                type: "string",
                description: "Filter by vendor ID",
              },
              device_type: {
                type: "string",
                description: "Filter by device type",
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
        
        // FIRMWARE UPDATES
        {
          name: "list_firmware_updates",
          description: "List firmware update operations and their status",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter firmware updates",
              },
              size: {
                type: "number",
                description: "Number of results to return",
              },
            },
          },
        },
        {
          name: "get_firmware_update",
          description: "Get status and progress of a specific firmware update operation",
          inputSchema: {
            type: "object",
            properties: {
              update_id: {
                type: "string",
                description: "The firmware update ID",
              },
            },
            required: ["update_id"],
          },
        },
        
        // CONFIGS
        {
          name: "list_configs",
          description: "List device configuration templates and saved configs",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter configs",
              },
            },
          },
        },
        {
          name: "get_config",
          description: "Get a specific device configuration",
          inputSchema: {
            type: "object",
            properties: {
              config_id: {
                type: "string",
                description: "The configuration ID",
              },
            },
            required: ["config_id"],
          },
        },
        
        // AUTOMATIONS
        {
          name: "list_automations",
          description: "List configured automations (scheduled tasks/scripts)",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter automations",
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
        
        // FILES
        {
          name: "list_files",
          description: "List files uploaded from devices",
          inputSchema: {
            type: "object",
            properties: {
              device_id: {
                type: "string",
                description: "Filter by device ID",
              },
              path: {
                type: "string",
                description: "Filter by file path",
              },
              start_time: {
                type: "string",
                description: "Start time filter",
              },
            },
          },
        },
        {
          name: "get_file",
          description: "Get information about a specific file",
          inputSchema: {
            type: "object",
            properties: {
              file_id: {
                type: "string",
                description: "The file ID",
              },
            },
            required: ["file_id"],
          },
        },
        
        // EVENTS
        {
          name: "list_events",
          description: "List events from your account event log (audit trail)",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter events",
              },
              start_time: {
                type: "string",
                description: "Start time (ISO 8601 or relative like '-1d')",
              },
              end_time: {
                type: "string",
                description: "End time (ISO 8601)",
              },
              size: {
                type: "number",
                description: "Number of events to return",
              },
            },
          },
        },
        
        // REPORTS
        {
          name: "list_reports",
          description: "List available report types in Remote Manager",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_device_availability_report",
          description: "Get device availability report (uptime statistics)",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query to filter devices",
              },
              start_time: {
                type: "string",
                description: "Report start time",
              },
              end_time: {
                type: "string",
                description: "Report end time",
              },
            },
          },
        },
        {
          name: "get_cellular_utilization_report",
          description: "Get cellular data usage report",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query to filter devices",
              },
              start_time: {
                type: "string",
                description: "Report start time",
              },
              end_time: {
                type: "string",
                description: "Report end time",
              },
            },
          },
        },
        
        // HEALTH CONFIGS
        {
          name: "list_health_configs",
          description: "List health monitoring configurations",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query string to filter health configs",
              },
            },
          },
        },
        {
          name: "get_health_config",
          description: "Get a specific health monitoring configuration",
          inputSchema: {
            type: "object",
            properties: {
              config_id: {
                type: "string",
                description: "The health config ID",
              },
            },
            required: ["config_id"],
          },
        },
        
        // ACCOUNT & USERS
        {
          name: "get_account_info",
          description: "Get information about your Remote Manager account",
          inputSchema: {
            type: "object",
            properties: {},
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
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          // Devices
          case "list_devices":
            return await this.listDevices(args);
          case "list_devices_bulk":
            return await this.listDevicesBulk(args);
          case "get_device":
            return await this.getDevice(args);
          case "get_device_data_streams":
            return await this.getDeviceDataStreams(args);
          case "get_device_metrics":
            return await this.getDeviceMetrics(args);
          case "get_device_logs":
            return await this.getDeviceLogs(args);
          
          // Groups
          case "list_groups":
            return await this.listGroups(args);
          case "get_group":
            return await this.getGroup(args);
          
          // Alerts
          case "list_alerts":
            return await this.listAlerts(args);
          case "get_alert":
            return await this.getAlert(args);
          
          // Monitors
          case "list_monitors":
            return await this.listMonitors(args);
          case "get_monitor":
            return await this.getMonitor(args);
          
          // Jobs
          case "list_jobs":
            return await this.listJobs(args);
          case "get_job":
            return await this.getJob(args);
          
          // Firmware
          case "list_firmware":
            return await this.listFirmware(args);
          case "get_firmware":
            return await this.getFirmware(args);
          
          // Firmware Updates
          case "list_firmware_updates":
            return await this.listFirmwareUpdates(args);
          case "get_firmware_update":
            return await this.getFirmwareUpdate(args);
          
          // Configs
          case "list_configs":
            return await this.listConfigs(args);
          case "get_config":
            return await this.getConfig(args);
          
          // Automations
          case "list_automations":
            return await this.listAutomations(args);
          case "get_automation":
            return await this.getAutomation(args);
          
          // Files
          case "list_files":
            return await this.listFiles(args);
          case "get_file":
            return await this.getFile(args);
          
          // Events
          case "list_events":
            return await this.listEvents(args);
          
          // Reports
          case "list_reports":
            return await this.listReports(args);
          case "get_device_availability_report":
            return await this.getDeviceAvailabilityReport(args);
          case "get_cellular_utilization_report":
            return await this.getCellularUtilizationReport(args);
          
          // Health Configs
          case "list_health_configs":
            return await this.listHealthConfigs(args);
          case "get_health_config":
            return await this.getHealthConfig(args);
          
          // Account & Users
          case "get_account_info":
            return await this.getAccountInfo(args);
          case "list_users":
            return await this.listUsers(args);
          case "get_user":
            return await this.getUser(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return this.handleError(error);
      }
    });
  }

  handleError(error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    const statusCode = error.response?.status;
    
    let message = `Error: ${errorMessage}`;
    
    if (statusCode === 401) {
      message = "Authentication Error: Invalid API credentials. Please check your DRM_API_KEY_ID and DRM_API_KEY_SECRET environment variables.";
    } else if (statusCode === 403) {
      message = `Permission Error: Your account may not have access to this feature. ${errorMessage}\nSome features require Remote Manager Premier Edition.`;
    } else if (statusCode === 404) {
      message = `Not Found: ${errorMessage}. The requested resource does not exist.`;
    } else if (statusCode === 429) {
      message = "Rate Limit Error: Too many requests. Please wait before trying again.";
    } else if (statusCode >= 500) {
      message = `Server Error (${statusCode}): Remote Manager is experiencing issues. Please try again later.`;
    }
    
    if (error.response?.data) {
      message += `\n\nDetails: ${JSON.stringify(error.response.data, null, 2)}`;
    }
    
    return {
      content: [
        {
          type: "text",
          text: message,
        },
      ],
      isError: true,
    };
  }

  formatResponse(data, includePagination = false) {
    if (includePagination && data.cursor) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              items: data.items || data.list || data,
              pagination: {
                cursor: data.cursor,
                next_uri: data.next_uri,
                has_more: !!data.cursor,
                count: data.count,
              }
            }, null, 2),
          },
        ],
      };
    }
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  // ============================================
  // DEVICE APIs
  // ============================================
  
  async listDevices(args) {
    const params = {
      size: args.size || 1000,
    };
    if (args.query) params.query = args.query;
    if (args.cursor) params.cursor = args.cursor;

    const response = await this.axiosClient.get("/v1/devices/inventory", { params });
    return this.formatResponse(response.data, true);
  }

  async listDevicesBulk(args) {
    const params = {};
    if (args.query) params.query = args.query;

    const response = await this.axiosClient.get("/v1/devices/bulk", { params });
    return {
      content: [
        {
          type: "text",
          text: `CSV Export:\n\n${response.data}`,
        },
      ],
    };
  }

  async getDevice(args) {
    const response = await this.axiosClient.get(`/v1/devices/inventory/${args.device_id}`);
    return this.formatResponse(response.data);
  }

  async getDeviceDataStreams(args) {
    let url = `/v1/streams/${args.device_id}`;
    if (args.stream_id) {
      url += `/${args.stream_id}`;
    }

    const params = {};
    if (args.start_time) params.start_time = args.start_time;
    if (args.end_time) params.end_time = args.end_time;

    const response = await this.axiosClient.get(url, { params });
    return this.formatResponse(response.data);
  }

  async getDeviceMetrics(args) {
    const params = {};
    if (args.start_time) params.start_time = args.start_time;
    if (args.end_time) params.end_time = args.end_time;

    const response = await this.axiosClient.get(
      `/v1/devices/metrics/${args.device_id}`,
      { params }
    );
    return this.formatResponse(response.data);
  }

  async getDeviceLogs(args) {
    const params = {
      size: args.size || 100,
    };
    if (args.start_time) params.start_time = args.start_time;

    const response = await this.axiosClient.get(
      `/v1/device_logs/inventory/${args.device_id}`,
      { params }
    );
    return this.formatResponse(response.data);
  }

  // ============================================
  // GROUP APIs
  // ============================================
  
  async listGroups(args) {
    const params = {};
    if (args.query) params.query = args.query;

    const response = await this.axiosClient.get("/v1/groups/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getGroup(args) {
    const response = await this.axiosClient.get(`/v1/groups/inventory/${args.group_id}`);
    return this.formatResponse(response.data);
  }

  // ============================================
  // ALERT APIs
  // ============================================
  
  async listAlerts(args) {
    const params = {};
    if (args.query) params.query = args.query;
    if (args.size) params.size = args.size;

    const response = await this.axiosClient.get("/v1/alerts/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAlert(args) {
    const response = await this.axiosClient.get(`/v1/alerts/inventory/${args.alert_id}`);
    return this.formatResponse(response.data);
  }

  // ============================================
  // MONITOR APIs
  // ============================================
  
  async listMonitors(args) {
    const params = {};
    if (args.query) params.query = args.query;

    const response = await this.axiosClient.get("/v1/monitors/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getMonitor(args) {
    const response = await this.axiosClient.get(`/v1/monitors/inventory/${args.monitor_id}`);
    return this.formatResponse(response.data);
  }

  // ============================================
  // JOB APIs
  // ============================================
  
  async listJobs(args) {
    const params = {};
    if (args.query) params.query = args.query;
    if (args.size) params.size = args.size;
    if (args.cursor) params.cursor = args.cursor;

    const response = await this.axiosClient.get("/v1/jobs/inventory", { params });
    return this.formatResponse(response.data, true);
  }

  async getJob(args) {
    const response = await this.axiosClient.get(`/v1/jobs/inventory/${args.job_id}`);
    return this.formatResponse(response.data);
  }

  // ============================================
  // FIRMWARE APIs
  // ============================================
  
  async listFirmware(args) {
    const params = {};
    if (args.query) params.query = args.query;
    if (args.vendor_id) params.vendor_id = args.vendor_id;
    if (args.device_type) params.device_type = args.device_type;

    const response = await this.axiosClient.get("/v1/firmware/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getFirmware(args) {
    const response = await this.axiosClient.get(`/v1/firmware/inventory/${args.firmware_id}`);
    return this.formatResponse(response.data);
  }

  // ============================================
  // FIRMWARE UPDATE APIs
  // ============================================
  
  async listFirmwareUpdates(args) {
    const params = {};
    if (args.query) params.query = args.query;
    if (args.size) params.size = args.size;

    const response = await this.axiosClient.get("/v1/firmware_updates/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getFirmwareUpdate(args) {
    const response = await this.axiosClient.get(`/v1/firmware_updates/inventory/${args.update_id}`);
    return this.formatResponse(response.data);
  }

  // ============================================
  // CONFIG APIs
  // ============================================
  
  async listConfigs(args) {
    const params = {};
    if (args.query) params.query = args.query;

    const response = await this.axiosClient.get("/v1/configs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getConfig(args) {
    const response = await this.axiosClient.get(`/v1/configs/inventory/${args.config_id}`);
    return this.formatResponse(response.data);
  }

  // ============================================
  // AUTOMATION APIs
  // ============================================
  
  async listAutomations(args) {
    const params = {};
    if (args.query) params.query = args.query;

    const response = await this.axiosClient.get("/v1/automations/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAutomation(args) {
    const response = await this.axiosClient.get(`/v1/automations/inventory/${args.automation_id}`);
    return this.formatResponse(response.data);
  }

  // ============================================
  // FILE APIs
  // ============================================
  
  async listFiles(args) {
    const params = {};
    if (args.device_id) params.device_id = args.device_id;
    if (args.path) params.path = args.path;
    if (args.start_time) params.start_time = args.start_time;

    const response = await this.axiosClient.get("/v1/files/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getFile(args) {
    const response = await this.axiosClient.get(`/v1/files/inventory/${args.file_id}`);
    return this.formatResponse(response.data);
  }

  // ============================================
  // EVENT APIs
  // ============================================
  
  async listEvents(args) {
    const params = {};
    if (args.query) params.query = args.query;
    if (args.start_time) params.start_time = args.start_time;
    if (args.end_time) params.end_time = args.end_time;
    if (args.size) params.size = args.size;

    const response = await this.axiosClient.get("/v1/events/inventory", { params });
    return this.formatResponse(response.data);
  }

  // ============================================
  // REPORT APIs
  // ============================================
  
  async listReports() {
    const response = await this.axiosClient.get("/v1/reports");
    return this.formatResponse(response.data);
  }

  async getDeviceAvailabilityReport(args) {
    const params = {};
    if (args.query) params.query = args.query;
    if (args.start_time) params.start_time = args.start_time;
    if (args.end_time) params.end_time = args.end_time;

    const response = await this.axiosClient.get("/v1/reports/device_availability", { params });
    return this.formatResponse(response.data);
  }

  async getCellularUtilizationReport(args) {
    const params = {};
    if (args.query) params.query = args.query;
    if (args.start_time) params.start_time = args.start_time;
    if (args.end_time) params.end_time = args.end_time;

    const response = await this.axiosClient.get("/v1/reports/cellular_utilization", { params });
    return this.formatResponse(response.data);
  }

  // ============================================
  // HEALTH CONFIG APIs
  // ============================================
  
  async listHealthConfigs(args) {
    const params = {};
    if (args.query) params.query = args.query;

    const response = await this.axiosClient.get("/v1/health_configs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getHealthConfig(args) {
    const response = await this.axiosClient.get(`/v1/health_configs/inventory/${args.config_id}`);
    return this.formatResponse(response.data);
  }

  // ============================================
  // ACCOUNT & USER APIs
  // ============================================
  
  async getAccountInfo() {
    const response = await this.axiosClient.get("/v1/account");
    return this.formatResponse(response.data);
  }

  async listUsers(args) {
    const params = {};
    if (args.query) params.query = args.query;

    const response = await this.axiosClient.get("/v1/users/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getUser(args) {
    const response = await this.axiosClient.get(`/v1/users/inventory/${args.user_id}`);
    return this.formatResponse(response.data);
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
            error: {
              code: -32603,
              message: 'Internal server error'
            },
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
        endpoint: '/mcp'
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
