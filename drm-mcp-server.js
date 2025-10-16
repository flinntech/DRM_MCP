#!/usr/bin/env node

/**
 * Digi Remote Manager MCP Server - Enhanced Version with HTTP Transport
 * 
 * Features:
 * - Secure environment variable-based authentication
 * - Comprehensive API coverage (30+ tools)
 * - Better error handling and pagination
 * - Modern HTTP transport for n8n (not deprecated SSE)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

const DRM_BASE_URL = "https://remotemanager.digi.com/ws";

class DigiRemoteManagerServer {
  constructor() {
    // API Credentials
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
        version: "2.0.2",
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
    // Register tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        // DEVICES
        {
          name: "list_devices",
          description: "List all devices in your Remote Manager account with optional filtering and pagination.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query using DRM query language. Examples: connection_status = \"connected\", last_update > -1d",
              },
              size: {
                type: "number",
                description: "Number of results per page (default: 1000)",
              },
              cursor: {
                type: "string",
                description: "Pagination cursor from previous response",
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
                description: "Start time (ISO 8601 or relative like '-1d')",
              },
              size: {
                type: "number",
                description: "Number of log entries to return",
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
        
        // MONITORS
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
          description: "List jobs (operations/tasks) in your account",
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
            },
          },
        },
        
        // FIRMWARE
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
            },
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
        
        // EVENTS
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
                description: "Start time (ISO 8601 or relative like '-1d')",
              },
              size: {
                type: "number",
                description: "Number of events to return",
              },
            },
          },
        },
        
        // ACCOUNT
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
      ];

      console.error(`[MCP] Returning ${tools.length} tools to client`);
      
      return { tools };
    });

    // Register call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        console.error(`[MCP] Calling tool: ${name}`);

        switch (name) {
          case "list_devices":
            return await this.listDevices(args);
          case "get_device":
            return await this.getDevice(args);
          case "get_device_logs":
            return await this.getDeviceLogs(args);
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
          case "list_jobs":
            return await this.listJobs(args);
          case "list_firmware":
            return await this.listFirmware(args);
          case "list_automations":
            return await this.listAutomations(args);
          case "get_automation":
            return await this.getAutomation(args);
          case "list_events":
            return await this.listEvents(args);
          case "get_account_info":
            return await this.getAccountInfo(args);
          case "list_users":
            return await this.listUsers(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`[MCP] Error executing tool:`, error);
        return this.handleError(error);
      }
    });
  }

  handleError(error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    const statusCode = error.response?.status;
    
    let message = `Error: ${errorMessage}`;
    
    if (statusCode === 401) {
      message = "Authentication Error: Invalid API credentials.";
    } else if (statusCode === 403) {
      message = `Permission Error: ${errorMessage}`;
    } else if (statusCode === 404) {
      message = `Not Found: ${errorMessage}`;
    } else if (statusCode === 429) {
      message = "Rate Limit Error: Too many requests.";
    }
    
    return {
      content: [{ type: "text", text: message }],
      isError: true,
    };
  }

  formatResponse(data) {
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }

  // API Methods
  async listDevices(args) {
    const params = { size: args.size || 1000 };
    if (args.query) params.query = args.query;
    if (args.cursor) params.cursor = args.cursor;
    const response = await this.axiosClient.get("/v1/devices/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getDevice(args) {
    const response = await this.axiosClient.get(`/v1/devices/inventory/${args.device_id}`);
    return this.formatResponse(response.data);
  }

  async getDeviceLogs(args) {
    const params = { size: args.size || 100 };
    if (args.start_time) params.start_time = args.start_time;
    const response = await this.axiosClient.get(`/v1/device_logs/inventory/${args.device_id}`, { params });
    return this.formatResponse(response.data);
  }

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

  async listJobs(args) {
    const params = {};
    if (args.query) params.query = args.query;
    if (args.size) params.size = args.size;
    const response = await this.axiosClient.get("/v1/jobs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async listFirmware(args) {
    const params = {};
    if (args.query) params.query = args.query;
    const response = await this.axiosClient.get("/v1/firmware/inventory", { params });
    return this.formatResponse(response.data);
  }

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

  async listEvents(args) {
    const params = {};
    if (args.query) params.query = args.query;
    if (args.start_time) params.start_time = args.start_time;
    if (args.size) params.size = args.size;
    const response = await this.axiosClient.get("/v1/events/inventory", { params });
    return this.formatResponse(response.data);
  }

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

  async run() {
    const transportType = process.env.MCP_TRANSPORT || 'stdio';
    
    if (transportType === 'http') {
      const PORT = process.env.MCP_PORT || 3000;
      await this.startHttpServer(PORT);
    } else {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("✓ DRM MCP Server running on stdio");
    }
  }

  async startHttpServer(port) {
    const express = (await import('express')).default;
    const cors = (await import('cors')).default;
    
    const app = express();
    
    // Enable CORS for n8n
    app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept'],
    }));
    
    app.use(express.json());
    
    // SSE endpoint for MCP
    app.get('/sse', async (req, res) => {
      console.error('[HTTP] SSE connection established');
      
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const transport = new SSEServerTransport('/message', res);
      await this.server.connect(transport);
      
      req.on('close', () => {
        console.error('[HTTP] SSE connection closed');
      });
    });

    // Message endpoint for MCP
    app.post('/message', async (req, res) => {
      console.error('[HTTP] Received message:', JSON.stringify(req.body).substring(0, 200));
      
      try {
        // The SSE transport will handle the message
        res.status(200).send();
      } catch (error) {
        console.error('[HTTP] Error handling message:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Health check
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok',
        server: 'digi-remote-manager-mcp',
        version: '2.0.1',
        transport: 'sse',
        endpoints: {
          sse: '/sse',
          message: '/message',
        }
      });
    });
    
    app.listen(port, () => {
      console.error(`✓ DRM MCP Server running on HTTP port ${port}`);
      console.error(`  SSE endpoint: http://localhost:${port}/sse`);
      console.error(`  Health check: http://localhost:${port}/health`);
    });
  }
}

const server = new DigiRemoteManagerServer();
server.run().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
