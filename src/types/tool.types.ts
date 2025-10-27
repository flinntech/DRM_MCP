/**
 * Tool System Types
 */

/**
 * Tool response content item
 */
export interface ToolContentItem {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
}

/**
 * Tool execution response
 */
export interface ToolResponse {
  content: ToolContentItem[];
  isError?: boolean;
}

/**
 * Tool category metadata
 */
export interface ToolCategory {
  name: string;
  display_name: string;
  description: string;
  tool_count: number;
  tools: string[];
}

/**
 * Tool definition with schema
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      default?: any;
    }>;
    required?: string[];
  };
}

/**
 * Base arguments for pagination
 */
export interface PaginationArgs {
  size?: number;
  cursor?: string;
  offset?: number;
}

/**
 * Base arguments for query operations
 */
export interface QueryArgs extends PaginationArgs {
  query?: string;
  orderby?: string;
}

/**
 * Base arguments for bulk export operations
 */
export interface BulkExportArgs {
  query?: string;
  fields?: string;
  orderby?: string;
}

/**
 * Time range arguments
 */
export interface TimeRangeArgs {
  start_time?: string;
  end_time?: string;
}

// ============================================
// Specific Tool Arguments
// ============================================

export interface ListDevicesArgs extends QueryArgs {
  category?: string;
}

export interface GetDeviceArgs {
  device_id: string;
}

export interface ListStreamArgs extends QueryArgs {
  category?: string;
}

export interface GetStreamArgs {
  stream_id: string;
}

export interface GetStreamHistoryArgs extends TimeRangeArgs, PaginationArgs {
  stream_id: string;
  order?: 'asc' | 'desc';
}

export interface GetStreamRollupsArgs extends TimeRangeArgs, PaginationArgs {
  stream_id: string;
  interval?: string;
  method?: 'min' | 'max' | 'avg' | 'sum' | 'count';
}

export interface GetDeviceLogsArgs extends TimeRangeArgs {
  device_id: string;
  size?: number;
}

export interface ListGroupsArgs extends QueryArgs {}

export interface GetGroupArgs {
  group_id: string;
}

export interface ListAlertsArgs extends QueryArgs {}

export interface GetAlertArgs {
  alert_id: string;
}

export interface ListMonitorsArgs extends QueryArgs {}

export interface GetMonitorArgs {
  monitor_id: string;
}

export interface GetMonitorHistoryArgs extends TimeRangeArgs {
  monitor_id: string;
  size?: number;
}

export interface ListAutomationsArgs extends QueryArgs {}

export interface GetAutomationArgs {
  automation_id: string;
}

export interface ListAutomationRunsArgs extends QueryArgs {}

export interface GetAutomationRunArgs {
  run_id: string;
}

export interface ListAutomationSchedulesArgs extends QueryArgs {}

export interface GetAutomationScheduleArgs {
  schedule_id: string;
}

export interface ListJobsArgs extends QueryArgs {}

export interface GetJobArgs {
  job_id: string;
}

export interface ListFirmwareArgs extends QueryArgs {}

export interface GetFirmwareArgs {
  firmware_id: string;
}

export interface ListFirmwareUpdatesArgs extends QueryArgs {}

export interface GetFirmwareUpdateArgs {
  update_id: string;
}

export interface ListTemplatesArgs extends QueryArgs {}

export interface GetTemplateArgs {
  config_id: string;
}

export interface ListHealthConfigsArgs extends QueryArgs {}

export interface GetHealthConfigArgs {
  health_config_id: string;
}

export interface ListEventsArgs extends TimeRangeArgs, PaginationArgs {
  query?: string;
}

export interface ListUsersArgs extends QueryArgs {}

export interface GetUserArgs {
  user_id: string;
}

export interface ListFilesArgs extends QueryArgs {}

export interface GetFileArgs {
  file_id: string;
}

export interface GetAccountInfoArgs {}

export interface GetAccountSecurityArgs {}

export interface GetApiInfoArgs {}

// ============================================
// SCI Tool Arguments
// ============================================

export interface SciQueryDeviceStateArgs {
  device_id: string;
}

export interface SciQueryDeviceSettingsArgs {
  device_id: string;
  group_name?: string;
}

export interface SciQueryDescriptorArgs {
  device_id: string;
  descriptor_type?: string;
}

export interface SciQueryMultipleDevicesArgs {
  device_ids: string[];
  query_type: 'state' | 'settings' | 'descriptor';
  group_name?: string;
}

export interface SciListDeviceFilesArgs {
  device_id: string;
  path?: string;
}

export interface SciGetDeviceFileArgs {
  device_id: string;
  path: string;
}

export interface SciQueryFirmwareTargetsArgs {
  device_id: string;
}

export interface SciGetJobStatusArgs {
  job_id: string;
}

export interface SciGetDataServiceFileArgs {
  device_id: string;
  file_path: string;
}

// ============================================
// Bulk Export Tool Arguments
// ============================================

export interface ListDevicesBulkArgs extends BulkExportArgs {}

export interface ListStreamsBulkArgs extends BulkExportArgs {}

export interface GetStreamHistoryBulkArgs extends TimeRangeArgs {
  stream_id: string;
  fields?: string;
  order?: string;
}

export interface GetStreamRollupsBulkArgs {
  stream_id: string;
  interval?: string;
  method?: string;
}

export interface ListJobsBulkArgs extends BulkExportArgs {}

export interface ListEventsBulkArgs extends BulkExportArgs {}

// ============================================
// Dynamic Tool Management
// ============================================

export interface EnableToolCategoryArgs {
  category: string;
}

export interface ValidateQuerySyntaxArgs {
  query: string;
}
