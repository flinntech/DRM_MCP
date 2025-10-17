#!/usr/bin/env node

/**
 * Digi Remote Manager MCP Server - Dynamic Tools with OpenAPI Auto-Generation
 * Automatically generates endpoint catalog from OpenAPI spec
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
import { readFileSync } from "fs";
import { parse as parseYAML } from "yaml";

const DRM_BASE_URL = "https://remotemanager.digi.com/ws";

// ============================================
// CONFIGURATION
// ============================================
const API_KEY_ID = process.env.DRM_API_KEY_ID || "52ea20b6ea68ed00a5ceeb447cd13ba4";
const API_KEY_SECRET = process.env.DRM_API_KEY_SECRET || "3ef3cfa5df287fd884dfe1668c48484f39e2d92905d255bc38642fe07e352efd";
const OPENAPI_SPEC_PATH = process.env.OPENAPI_SPEC_PATH || "./drm-api-readonly.yaml";
// ============================================

class DigiRemoteManagerServer {
  constructor() {
    if (!API_KEY_ID || !API_KEY_SECRET || API_KEY_ID === "YOUR_API_KEY_ID_HERE" || API_KEY_SECRET === "YOUR_API_KEY_HERE") {
      console.error("╔════════════════════════════════════════════════════════════╗");
      console.error("║  ERROR: API key not configured                            ║");
      console.error("╚════════════════════════════════════════════════════════════╝");
      console.error("");
      console.error("Please set DRM_API_KEY_ID and DRM_API_KEY_SECRET environment variables");
      console.error("or edit the configuration section in this file.");
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

    // Load OpenAPI spec and build catalog
    try {
      this.openApiSpec = this.loadOpenAPISpec(OPENAPI_SPEC_PATH);
      this.endpointCatalog = this.buildEndpointCatalogFromOpenAPI();
      console.error(`✓ Loaded ${this.endpointCatalog.length} endpoints from OpenAPI spec`);
    } catch (error) {
      console.error("✗ Failed to load OpenAPI spec:", error.message);
      console.error("  Using fallback manual catalog");
      this.endpointCatalog = this.buildFallbackCatalog();
    }

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
    
    // Optional: Enable hot reload in development
    if (process.env.ENABLE_HOT_RELOAD === 'true') {
      this.enableHotReload();
    }
  }

  loadOpenAPISpec(path) {
    console.error(`Loading OpenAPI spec from: ${path}`);
    const content = readFileSync(path, 'utf8');
    return parseYAML(content);
  }

  buildEndpointCatalogFromOpenAPI() {
    const catalog = [];
    const spec = this.openApiSpec;

    if (!spec.paths) {
      throw new Error("Invalid OpenAPI spec: no paths found");
    }

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (method.toLowerCase() !== 'get') continue; // Read-only spec

        const operationId = operation.operationId;
        if (!operationId) continue;

        // Determine category from tags or path
        let category = 'other';
        if (operation.tags && operation.tags.length > 0) {
          category = operation.tags[0].toLowerCase();
        } else {
          // Infer from path
          const pathParts = path.split('/').filter(p => p);
          if (pathParts.length > 1) {
            category = pathParts[1]; // /v1/devices -> devices
          }
        }

        // Map operationId to method name
        const methodName = this.mapOperationIdToMethod(operationId);
        const methodFn = this[methodName];

        if (!methodFn) {
          console.error(`⚠ Warning: No method found for ${operationId} (expected ${methodName})`);
          continue;
        }

        // Extract parameters
        const params = this.extractParamsFromOpenAPI(operation, path);

        catalog.push({
          operation_id: operationId,
          category: category,
          description: operation.description || operation.summary || `${method.toUpperCase()} ${path}`,
          method: methodFn.bind(this),
          params: params,
          path: path,
          httpMethod: method.toUpperCase()
        });
      }
    }

    return catalog;
  }

  mapOperationIdToMethod(operationId) {
    // Common patterns:
    // listDevices -> listDevices
    // getDevice -> getDevice
    // getCellularUtilizationReport -> getCellularUtilizationReport
    
    // Handle special cases
    const mappings = {
      'listDevicesBulk': 'listDevicesBulk',
      'getDeviceChannel': 'getDeviceChannel',
      'listDeviceChannels': 'listDeviceChannels',
      'listReportTypes': 'listReports',
      'getConnectionReport': 'getConnectionReport',
      'getAlertReport': 'getAlertReport',
      'getDeviceReport': 'getDeviceReport',
      'listConfigurations': 'listConfigs',
      'getConfiguration': 'getConfig',
    };

    if (mappings[operationId]) {
      return mappings[operationId];
    }

    // Default: keep as-is (already in correct format)
    return operationId;
  }

  extractParamsFromOpenAPI(operation, path) {
    const params = [];

    // Extract path parameters
    const pathParamRegex = /\{([^}]+)\}/g;
    let match;
    while ((match = pathParamRegex.exec(path)) !== null) {
      const paramName = match[1];
      params.push({
        name: paramName,
        type: 'string',
        required: true,
        description: `Path parameter: ${paramName}`,
        in: 'path'
      });
    }

    // Extract query parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        const p = param.$ref ? this.resolveRef(param.$ref) : param;
        
        if (p.in === 'path') {
          // Already handled above, but update with OpenAPI details
          const existing = params.find(pr => pr.name === p.name);
          if (existing) {
            existing.description = p.description || existing.description;
            existing.type = p.schema?.type || existing.type;
            if (p.example || p.schema?.example) {
              existing.example = p.example || p.schema?.example;
            }
          }
        } else if (p.in === 'query') {
          params.push({
            name: p.name,
            type: p.schema?.type || 'string',
            required: p.required || false,
            description: p.description || '',
            example: p.example || p.schema?.example,
            in: 'query'
          });
        }
      }
    }

    return params;
  }

  resolveRef(ref) {
    // Resolve $ref pointers like #/components/parameters/deviceId
    const path = ref.replace('#/', '').split('/');
    let current = this.openApiSpec;
    for (const segment of path) {
      current = current[segment];
      if (!current) return {};
    }
    return current;
  }

  buildFallbackCatalog() {
    // Minimal fallback catalog if OpenAPI spec fails to load
    console.error("⚠ Using minimal fallback catalog");
    return [
      {
        operation_id: "list_devices",
        category: "devices",
        description: "List all devices",
        method: this.listDevices.bind(this),
        params: [
          { name: "query", type: "string", required: false, description: "Query filter" },
          { name: "size", type: "number", required: false, description: "Number of results" }
        ]
      },
      {
        operation_id: "get_device",
        category: "devices",
        description: "Get device by ID",
        method: this.getDevice.bind(this),
        params: [
          { name: "device_id", type: "string", required: true, description: "Device ID" }
        ]
      }
    ];
  }

  enableHotReload() {
    import('chokidar').then(({ default: chokidar }) => {
      console.error(`🔥 Hot reload enabled for ${OPENAPI_SPEC_PATH}`);
      chokidar.watch(OPENAPI_SPEC_PATH).on('change', () => {
        console.error('📝 OpenAPI spec changed, reloading catalog...');
        try {
          this.openApiSpec = this.loadOpenAPISpec(OPENAPI_SPEC_PATH);
          this.endpointCatalog = this.buildEndpointCatalogFromOpenAPI();
          console.error(`✓ Reloaded ${this.endpointCatalog.length} endpoints`);
        } catch (error) {
          console.error('✗ Failed to reload:', error.message);
        }
      });
    }).catch(() => {
      console.error('⚠ chokidar not installed, hot reload disabled');
    });
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "discover_endpoints",
          description: `Discover available DRM API endpoints. Use this FIRST to find the right endpoint for your task.

Filter by category:
- devices: List/get devices, device logs
- streams: Data streams, history, rollups (formerly "data streams")
- groups: Device organization
- alerts: Alert configurations
- monitors: Webhooks and monitoring
- automations: Automation workflows, runs, schedules
- jobs: Background jobs (firmware updates, configs)
- firmware: Firmware versions and updates
- reports: Connection, alert, device, cellular, availability reports
- configurations: Configuration templates (formerly "templates")
- health: Health monitoring configs
- events: Audit trail and event logs
- users: User management
- files: File storage
- account: Account information and settings

Search by keyword to find specific functionality (e.g., "cellular", "logs", "availability").

Returns: List of matching endpoints with descriptions and required parameters.`,
          inputSchema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                description: "Filter by category",
                enum: ["devices", "streams", "groups", "alerts", "monitors", "automations", 
                       "jobs", "firmware", "reports", "configurations", "health", "events", 
                       "users", "files", "account", "device data", "meta"]
              },
              query: {
                type: "string",
                description: "Search keyword (e.g., 'cellular', 'logs', 'availability')"
              },
              limit: {
                type: "number",
                description: "Maximum results to return (default: 20)",
                default: 20
              }
            }
          }
        },
        {
          name: "get_endpoint_details",
          description: `Get detailed information about a specific API endpoint.

Use this after discover_endpoints to see:
- Full description
- All parameters (required and optional)
- Parameter types and examples
- Usage notes

Provide the operation_id from discover_endpoints (e.g., "listDevices", "getCellularUtilizationReport").`,
          inputSchema: {
            type: "object",
            properties: {
              operation_id: {
                type: "string",
                description: "The operation ID from discover_endpoints"
              }
            },
            required: ["operation_id"]
          }
        },
        {
          name: "call_drm_endpoint",
          description: `Execute a DRM API endpoint with parameters.

This is the main tool for retrieving data. Use discover_endpoints first to find the right endpoint.

Common usage patterns:

1. List connected devices:
   operation_id: "listDevices"
   params: {query: "connection_status='connected'", size: 100}

2. Get device details:
   operation_id: "getDevice"
   params: {device_id: "00000000-00000000-00409DFF-FF123456"}

3. Get cellular usage report:
   operation_id: "getCellularUtilizationReport"
   params: {start_time: "2025-10-01T00:00:00Z", end_time: "2025-10-16T23:59:59Z"}

4. List streams for a device:
   operation_id: "listStreams"
   params: {query: "device_id='00000000-00000000-00409DFF-FF123456'"}

5. Get stream history:
   operation_id: "getStreamHistory"
   params: {stream_id: "stream-id-here", start_time: "-7d"}

Query language operators: =, !=, <, >, <=, >=, startsWith, endsWith, contains
Time formats: ISO 8601 or relative like "-1d", "-24h", "-7d"`,
          inputSchema: {
            type: "object",
            properties: {
              operation_id: {
                type: "string",
                description: "The endpoint operation ID (from discover_endpoints)"
              },
              params: {
                type: "object",
                description: "Parameters for the endpoint (e.g., {device_id: 'xxx', query: 'yyy', size: 100})",
                additionalProperties: true
              }
            },
            required: ["operation_id"]
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case "discover_endpoints":
            return this.discoverEndpoints(args);
          
          case "get_endpoint_details":
            return this.getEndpointDetails(args);
          
          case "call_drm_endpoint":
            return this.callDrmEndpoint(args);
          
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

  discoverEndpoints(args) {
    const { category, query, limit = 20 } = args;
    
    let filtered = this.endpointCatalog;
    
    // Filter by category
    if (category) {
      filtered = filtered.filter(e => e.category === category.toLowerCase());
    }
    
    // Search by keyword
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(e => 
        e.operation_id.toLowerCase().includes(lowerQuery) ||
        e.description.toLowerCase().includes(lowerQuery) ||
        e.category.toLowerCase().includes(lowerQuery)
      );
    }
    
    const limited = filtered.slice(0, limit);
    
    let result = `Found ${filtered.length} matching endpoint${filtered.length !== 1 ? 's' : ''}`;
    if (limited.length < filtered.length) {
      result += ` (showing first ${limit})`;
    }
    result += `:\n\n`;
    
    for (const endpoint of limited) {
      result += `## ${endpoint.operation_id}\n`;
      result += `**Category:** ${endpoint.category}\n`;
      result += `**Description:** ${endpoint.description}\n`;
      
      const requiredParams = endpoint.params.filter(p => p.required);
      const optionalParams = endpoint.params.filter(p => !p.required);
      
      if (requiredParams.length > 0) {
        result += `**Required:** ${requiredParams.map(p => p.name).join(', ')}\n`;
      }
      if (optionalParams.length > 0) {
        result += `**Optional:** ${optionalParams.map(p => p.name).join(', ')}\n`;
      }
      
      result += `\n`;
    }
    
    if (limited.length < filtered.length) {
      result += `\n... and ${filtered.length - limited.length} more endpoint${filtered.length - limited.length !== 1 ? 's' : ''}.\n`;
      result += `Use a more specific category or query to narrow results.\n`;
    }
    
    result += `\n**Next step:** Use get_endpoint_details with the operation_id to see full parameter information before calling.`;
    
    return {
      content: [{ type: "text", text: result }]
    };
  }

  getEndpointDetails(args) {
    const { operation_id } = args;
    
    const endpoint = this.endpointCatalog.find(e => e.operation_id === operation_id);
    
    if (!endpoint) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: Endpoint '${operation_id}' not found.\n\nUse discover_endpoints to find available endpoints.` 
        }],
        isError: true
      };
    }
    
    let details = `# ${endpoint.operation_id}\n\n`;
    details += `**Category:** ${endpoint.category}\n`;
    details += `**HTTP:** ${endpoint.httpMethod} ${endpoint.path}\n\n`;
    details += `**Description:**\n${endpoint.description}\n\n`;
    
    if (endpoint.params.length > 0) {
      details += `**Parameters:**\n\n`;
      
      const requiredParams = endpoint.params.filter(p => p.required);
      const optionalParams = endpoint.params.filter(p => !p.required);
      
      if (requiredParams.length > 0) {
        details += `*Required:*\n`;
        for (const param of requiredParams) {
          details += `- **${param.name}** (${param.type}): ${param.description}\n`;
          if (param.example) {
            details += `  Example: \`${param.example}\`\n`;
          }
        }
        details += `\n`;
      }
      
      if (optionalParams.length > 0) {
        details += `*Optional:*\n`;
        for (const param of optionalParams) {
          details += `- **${param.name}** (${param.type}): ${param.description}\n`;
          if (param.example) {
            details += `  Example: \`${param.example}\`\n`;
          }
        }
      }
    } else {
      details += `**Parameters:** None\n`;
    }
    
    details += `\n**Usage:**\n`;
    details += `Use call_drm_endpoint with:\n`;
    details += `\`\`\`json\n`;
    details += `{\n`;
    details += `  "operation_id": "${operation_id}",\n`;
    details += `  "params": {\n`;
    
    const exampleParams = endpoint.params
      .filter(p => p.required || p.example)
      .slice(0, 3);
    
    if (exampleParams.length > 0) {
      for (let i = 0; i < exampleParams.length; i++) {
        const param = exampleParams[i];
        const value = param.example || (param.type === 'string' ? '"value"' : param.type === 'number' ? '100' : 'true');
        details += `    "${param.name}": ${param.type === 'string' && !param.example ? value : JSON.stringify(value)}`;
        if (i < exampleParams.length - 1) details += ',';
        details += `\n`;
      }
    }
    
    details += `  }\n`;
    details += `}\n`;
    details += `\`\`\``;
    
    return {
      content: [{ type: "text", text: details }]
    };
  }

  async callDrmEndpoint(args) {
    const { operation_id, params = {} } = args;
    
    const endpoint = this.endpointCatalog.find(e => e.operation_id === operation_id);
    
    if (!endpoint) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: Endpoint '${operation_id}' not found.\n\nUse discover_endpoints to find available endpoints.` 
        }],
        isError: true
      };
    }
    
    // Validate required parameters
    const requiredParams = endpoint.params.filter(p => p.required);
    const missingParams = requiredParams.filter(p => params[p.name] === undefined);
    
    if (missingParams.length > 0) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: Missing required parameters: ${missingParams.map(p => p.name).join(', ')}\n\nUse get_endpoint_details('${operation_id}') to see all required parameters.` 
        }],
        isError: true
      };
    }
    
    // Call the actual method
    try {
      const result = await endpoint.method(params);
      
      // Add a summary header for better readability
      let responseText = `✓ **${operation_id}** executed successfully\n\n`;
      
      // Check if result has data to parse
      if (result.content && result.content[0]) {
        const content = result.content[0].text;
        
        // Try to parse as JSON to add helpful summary
        try {
          const data = JSON.parse(content);
          
          // Add contextual summary based on response type
          if (data.items && Array.isArray(data.items)) {
            responseText += `**Summary:** Returned ${data.items.length} item${data.items.length !== 1 ? 's' : ''}`;
            if (data.total) {
              responseText += ` of ${data.total} total`;
            }
            if (data.cursor) {
              responseText += ` (paginated)`;
            }
            responseText += `\n\n`;
          } else if (data.count !== undefined) {
            responseText += `**Summary:** ${data.count} item${data.count !== 1 ? 's' : ''}\n\n`;
          } else if (data.id) {
            responseText += `**Resource ID:** ${data.id}\n\n`;
          }
          
          responseText += `**Response:**\n\`\`\`json\n${content}\n\`\`\``;
        } catch (e) {
          // Not JSON (probably CSV), just return as-is
          responseText += `**Response:**\n\`\`\`\n${content}\n\`\`\``;
        }
      }
      
      return {
        content: [{ type: "text", text: responseText }]
      };
    } catch (error) {
      throw error; // Let the main error handler deal with it
    }
  }

  // ============================================
  // UTILITY METHODS
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
  // API IMPLEMENTATION METHODS
  // Keep all your existing 51 methods here
  // ============================================

  async listDevices(args) {
    const params = this.buildParams(args, ["query", "size", "cursor", "orderby", "group", "child_groups", "tag", "type"]);
    const response = await this.axiosClient.get("/v1/devices/inventory", { params });
    return this.formatResponse(response.data);
  }

  async listDevicesBulk(args) {
    const params = this.buildParams(args, ["query", "fields", "orderby"]);
    const response = await this.axiosClient.get("/v1/devices/bulk", { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getDevice(args) {
    const response = await this.axiosClient.get(`/v1/devices/inventory/${args.device_id || args.id}`);
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
    const response = await this.axiosClient.get(`/v1/streams/inventory/${args.stream_id || args.device_id + '/' + args.stream_id}`);
    return this.formatResponse(response.data);
  }

  async getStreamHistory(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "size", "cursor", "order"]);
    const streamPath = args.stream_id.includes('/') ? args.stream_id : `${args.device_id}/${args.stream_id}`;
    const response = await this.axiosClient.get(`/v1/streams/history/${streamPath}`, { params });
    return this.formatResponse(response.data);
  }

  async getStreamHistoryBulk(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "fields", "order"]);
    const streamPath = args.stream_id.includes('/') ? args.stream_id : `${args.device_id}/${args.stream_id}`;
    const response = await this.axiosClient.get(`/v1/streams/bulk/history/${streamPath}`, { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getStreamRollups(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "interval", "method", "size", "cursor", "rollup_interval"]);
    const streamPath = args.stream_id.includes('/') ? args.stream_id : `${args.device_id}/${args.stream_id}`;
    const response = await this.axiosClient.get(`/v1/streams/rollups/${streamPath}`, { params });
    return this.formatResponse(response.data);
  }

  async getStreamRollupsBulk(args) {
    const params = this.buildParams(args, ["interval", "method", "rollup_interval"]);
    const streamPath = args.stream_id.includes('/') ? args.stream_id : `${args.device_id}/${args.stream_id}`;
    const response = await this.axiosClient.get(`/v1/streams/bulk/rollups/${streamPath}`, { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getDeviceLogs(args) {
    const params = this.buildParams(args, ["start_time", "size", "end_time"]);
    const response = await this.axiosClient.get(`/v1/device_logs/inventory/${args.device_id || args.id}`, { params });
    return this.formatResponse(response.data);
  }

  async listGroups(args) {
    const params = this.buildParams(args, ["query", "orderby", "size", "cursor"]);
    const response = await this.axiosClient.get("/v1/groups/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getGroup(args) {
    const response = await this.axiosClient.get(`/v1/groups/inventory/${args.group_id || args.id}`);
    return this.formatResponse(response.data);
  }

  async listAlerts(args) {
    const params = this.buildParams(args, ["query", "size", "orderby", "cursor"]);
    const response = await this.axiosClient.get("/v1/alerts/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAlert(args) {
    const response = await this.axiosClient.get(`/v1/alerts/inventory/${args.alert_id || args.id}`);
    return this.formatResponse(response.data);
  }

  async listMonitors(args) {
    const params = this.buildParams(args, ["query", "orderby", "size", "cursor"]);
    const response = await this.axiosClient.get("/v1/monitors/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getMonitor(args) {
    const response = await this.axiosClient.get(`/v1/monitors/inventory/${args.monitor_id || args.id}`);
    return this.formatResponse(response.data);
  }

  async getMonitorHistory(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "size"]);
    const response = await this.axiosClient.get(`/v1/monitors/history/${args.monitor_id || args.id}`, { params });
    return this.formatResponse(response.data);
  }

  async listAutomations(args) {
    const params = this.buildParams(args, ["query", "orderby", "size", "cursor"]);
    const response = await this.axiosClient.get("/v1/automations/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAutomation(args) {
    const response = await this.axiosClient.get(`/v1/automations/inventory/${args.automation_id || args.id}`);
    return this.formatResponse(response.data);
  }

  async listAutomationRuns(args) {
    const params = this.buildParams(args, ["query", "size", "orderby", "cursor"]);
    const response = await this.axiosClient.get("/v1/automations/runs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAutomationRun(args) {
    const response = await this.axiosClient.get(`/v1/automations/runs/inventory/${args.run_id || args.id}`);
    return this.formatResponse(response.data);
  }

  async listAutomationSchedules(args) {
    const params = this.buildParams(args, ["query", "orderby", "size", "cursor"]);
    const response = await this.axiosClient.get("/v1/automations/schedules/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getAutomationSchedule(args) {
    const response = await this.axiosClient.get(`/v1/automations/schedules/inventory/${args.schedule_id || args.id}`);
    return this.formatResponse(response.data);
  }

  async listJobs(args) {
    const params = this.buildParams(args, ["query", "size", "cursor", "orderby", "status"]);
    const response = await this.axiosClient.get("/v1/jobs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async listJobsBulk(args) {
    const params = this.buildParams(args, ["query", "fields"]);
    const response = await this.axiosClient.get("/v1/jobs/bulk", { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async getJob(args) {
    const response = await this.axiosClient.get(`/v1/jobs/inventory/${args.job_id || args.id}`);
    return this.formatResponse(response.data);
  }

  async listFirmware(args) {
    const params = this.buildParams(args, ["query", "orderby", "vendor_id", "device_type", "include_non_production"]);
    const response = await this.axiosClient.get("/v1/firmware/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getFirmware(args) {
    const response = await this.axiosClient.get(`/v1/firmware/inventory/${args.firmware_id || args.vendor_id + '/' + args.device_type}`);
    return this.formatResponse(response.data);
  }

  async listFirmwareUpdates(args) {
    const params = this.buildParams(args, ["query", "size", "orderby", "cursor"]);
    const response = await this.axiosClient.get("/v1/firmware_updates/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getFirmwareUpdate(args) {
    const response = await this.axiosClient.get(`/v1/firmware_updates/inventory/${args.update_id || args.id}`);
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
    const params = this.buildParams(args, ["start_time", "end_time", "query", "group", "child_groups", "groupby"]);
    const response = await this.axiosClient.get("/v1/reports/cellular_utilization", { params });
    return this.formatResponse(response.data);
  }

  async getDeviceAvailabilityReport(args) {
    const params = this.buildParams(args, ["start_time", "end_time", "query", "group", "child_groups", "size"]);
    const response = await this.axiosClient.get("/v1/reports/device_availability", { params });
    return this.formatResponse(response.data);
  }

  async listConfigs(args) {
    const params = this.buildParams(args, ["query", "orderby", "size", "cursor"]);
    const response = await this.axiosClient.get("/v1/configs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getConfig(args) {
    const response = await this.axiosClient.get(`/v1/configs/inventory/${args.config_id || args.id}`);
    return this.formatResponse(response.data);
  }

  async listHealthConfigs(args) {
    const params = this.buildParams(args, ["query", "orderby", "size", "cursor"]);
    const response = await this.axiosClient.get("/v1/health_configs/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getHealthConfig(args) {
    const response = await this.axiosClient.get(`/v1/health_configs/inventory/${args.health_config_id || args.id}`);
    return this.formatResponse(response.data);
  }

  async listEvents(args) {
    const params = this.buildParams(args, ["query", "start_time", "end_time", "size", "cursor", "event_type", "device_id"]);
    const response = await this.axiosClient.get("/v1/events/inventory", { params });
    return this.formatResponse(response.data);
  }

  async listEventsBulk(args) {
    const params = this.buildParams(args, ["query", "start_time", "end_time", "fields"]);
    const response = await this.axiosClient.get("/v1/events/bulk", { params });
    return { content: [{ type: "text", text: response.data }] };
  }

  async listUsers(args) {
    const params = this.buildParams(args, ["query", "orderby", "size", "cursor"]);
    const response = await this.axiosClient.get("/v1/users/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getUser(args) {
    const response = await this.axiosClient.get(`/v1/users/inventory/${args.user_id || args.id}`);
    return this.formatResponse(response.data);
  }

  async listApiKeys(args) {
    const params = this.buildParams(args, ["orderby"]);
    const response = await this.axiosClient.get("/v1/api_keys/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getApiKey(args) {
    const response = await this.axiosClient.get(`/v1/api_keys/inventory/${args.api_key_id || args.id}`);
    return this.formatResponse(response.data);
  }

  async listFiles(args) {
    const params = this.buildParams(args, ["query", "orderby", "device_id", "size", "cursor"]);
    const response = await this.axiosClient.get("/v1/files/inventory", { params });
    return this.formatResponse(response.data);
  }

  async getFile(args) {
    const response = await this.axiosClient.get(`/v1/files/inventory/${args.file_id || args.id}`);
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
  // TRANSPORT LAYER
  // ============================================

  async run() {
    const transportType = process.env.MCP_TRANSPORT || 'stdio';
    
    if (transportType === 'http') {
      const PORT = process.env.MCP_PORT || 3000;
      await this.startHttpServer(PORT);
    } else {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("✓ Digi Remote Manager MCP server running on stdio");
      console.error(`✓ Dynamic tools with ${this.endpointCatalog.length} endpoints`);
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
        version: '3.0.0',
        transport: 'streamable-http',
        endpoint: '/mcp',
        tools: 3,
        endpoints: this.endpointCatalog.length,
        openapi_spec: OPENAPI_SPEC_PATH
      });
    });
    
    // Debug endpoint to see all available endpoints
    app.get('/endpoints', (req, res) => {
      res.json({
        count: this.endpointCatalog.length,
        endpoints: this.endpointCatalog.map(e => ({
          operation_id: e.operation_id,
          category: e.category,
          description: e.description,
          path: e.path,
          method: e.httpMethod,
          required_params: e.params.filter(p => p.required).map(p => p.name),
          optional_params: e.params.filter(p => !p.required).map(p => p.name)
        }))
      });
    });
    
    app.listen(port, () => {
      console.error(`✓ Digi Remote Manager MCP server running on HTTP port ${port}`);
      console.error(`✓ Streamable HTTP endpoint: http://localhost:${port}/mcp`);
      console.error(`✓ Health check: http://localhost:${port}/health`);
      console.error(`✓ Endpoints list: http://localhost:${port}/endpoints`);
      console.error(`✓ Dynamic tools with ${this.endpointCatalog.length} endpoints`);
    });
  }
}

// ============================================
// START SERVER
// ============================================

const server = new DigiRemoteManagerServer();
server.run().catch(console.error);
