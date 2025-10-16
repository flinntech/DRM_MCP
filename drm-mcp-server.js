#!/usr/bin/env node

/**
 * Digi Remote Manager MCP Server - Simple Version
 * 
 * This version has the API key hardcoded for single-user testing.
 * Just replace YOUR_API_KEY_HERE with your actual API key.
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
    // Validate that API key was set
	if (!API_KEY_ID || !API_KEY_SECRET || API_KEY_ID === "YOUR_API_KEY_ID_HERE" || API_KEY_SECRET === "YOUR_API_KEY_HERE") {
      console.error("╔════════════════════════════════════════════════════════════╗");
      console.error("║  ERROR: API key not configured                            ║");
      console.error("╚════════════════════════════════════════════════════════════╝");
      console.error("");
      console.error("Please edit this file and configure your API key ID and secret.");
      console.error("");
      process.exit(1);
    }
    // Configure axios client with the hardcoded API key
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
        version: "1.0.0",
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
              size: {
                type: "number",
                description: "Number of events to return",
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
          case "get_account_info":
            return await this.getAccountInfo(args);
          case "list_users":
            return await this.listUsers(args);
          case "get_user":
            return await this.getUser(args);
          case "list_automations":
            return await this.listAutomations(args);
          case "get_automation":
            return await this.getAutomation(args);
          case "get_device_logs":
            return await this.getDeviceLogs(args);
          case "list_firmware":
            return await this.listFirmware(args);
          case "get_firmware":
            return await this.getFirmware(args);
          case "list_events":
            return await this.listEvents(args);
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

  async listDevices(args) {
    const params = {};
    if (args.query) params.query = args.query;
    if (args.size) params.size = args.size;
    if (args.cursor) params.cursor = args.cursor;

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

    const params = {};
    if (args.start_time) params.start_time = args.start_time;
    if (args.end_time) params.end_time = args.end_time;

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
    const params = {};
    if (args.query) params.query = args.query;

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
    const params = {};
    if (args.query) params.query = args.query;
    if (args.size) params.size = args.size;

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
    const params = {};
    if (args.query) params.query = args.query;

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

  async listUsers(args) {
    const params = {};
    if (args.query) params.query = args.query;

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
    const params = {};
    if (args.query) params.query = args.query;

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

  async getDeviceLogs(args) {
    const params = {};
    if (args.start_time) params.start_time = args.start_time;
    if (args.size) params.size = args.size;

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
    const params = {};
    if (args.query) params.query = args.query;

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

  async listEvents(args) {
    const params = {};
    if (args.query) params.query = args.query;
    if (args.start_time) params.start_time = args.start_time;
    if (args.size) params.size = args.size;

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

  async run() {
    const transportType = process.env.MCP_TRANSPORT || 'stdio';
    
    if (transportType === 'http') {
      // HTTP/SSE transport for n8n and other HTTP clients
      const PORT = process.env.MCP_PORT || 3000;
      await this.startHttpServer(PORT);
    } else {
      // Default stdio transport for Claude Desktop
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
    
    // Single MCP endpoint
    app.all('/mcp', async (req, res) => {
      console.error(`${req.method} /mcp - Request received`);
      
      try {
        // Create a new transport for each request
        // Note: Each request gets its own transport instance
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // Stateless mode
          enableJsonResponse: true
        });
        
        // Clean up transport when response finishes
        res.on('close', () => {
          transport.close();
        });
        
        // Connect server to transport
        await this.server.connect(transport);
        
        // Let the transport handle the request
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
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        server: 'digi-remote-manager-mcp',
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
