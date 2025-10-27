/**
 * Server Configuration and Transport Types
 */

import type { Request } from 'express';
import type { RequestMetadata } from './auth.types.js';

/**
 * Transport type configuration
 */
export type TransportType = 'stdio' | 'http';

/**
 * Server configuration
 */
export interface ServerConfig {
  name: string;
  version: string;
  transport?: TransportType;
  port?: number;
}

/**
 * Extended Express Request with user context
 */
export interface McpRequest extends Request {
  userId?: string;
  metadata?: RequestMetadata;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  server: string;
  version: string;
  transport: string;
  endpoint?: string;
  multi_tenant: boolean;
  configured_users: number;
  dynamic_tools: boolean;
  core_tools: number;
  total_tools: number;
  categories: number;
  active_users: number;
}

/**
 * Tool category with enabled status
 */
export interface ToolCategoryWithStatus {
  name: string;
  display_name: string;
  description: string;
  tool_count: number;
  enabled: boolean;
  tools: string[];
}

/**
 * Discover categories response
 */
export interface DiscoverCategoriesResponse {
  total_categories: number;
  enabled_categories: number;
  core_tools_count: number;
  categories: ToolCategoryWithStatus[];
}
