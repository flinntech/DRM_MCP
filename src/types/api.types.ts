/**
 * Digi Remote Manager API Response Types
 */

/**
 * Common pagination metadata
 */
export interface PaginationMetadata {
  size?: number;
  cursor?: string;
  hasMore?: boolean;
  totalCount?: number;
}

/**
 * Common API list response wrapper
 */
export interface ApiListResponse<T> {
  items?: T[];
  result?: {
    resultTotalRows?: string;
    requestedStartRow?: string;
    resultSize?: string;
  };
  paginate?: PaginationMetadata;
}

/**
 * Device information
 */
export interface Device {
  devConnectwareId: string;
  devMac?: string;
  devVendorId?: string;
  devIp?: string;
  devStatus?: string;
  devLastKnownIp?: string;
  devLastKnownLat?: string;
  devLastKnownLong?: string;
  devLastDataTime?: string;
  devLastDisconnectTime?: string;
  devLastConnectTime?: string;
  dpDescription?: string;
  dpLastUpdateDate?: string;
  dpContact?: string;
  dpLocation?: string;
  dpUserMetaData?: string;
  dpMapLat?: string;
  dpMapLong?: string;
  dpZoneId?: string;
  grpPath?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Stream information
 */
export interface Stream {
  streamId: string;
  streamType?: string;
  description?: string;
  dataType?: string;
  units?: string;
  forwardTo?: string;
  currentValue?: {
    data?: string;
    timestamp?: string;
    quality?: number;
  };
  [key: string]: unknown;
}

/**
 * Stream data point
 */
export interface StreamDataPoint {
  timestamp: string;
  data: string | number | boolean;
  quality?: number;
  serverTimestamp?: string;
}

/**
 * Stream rollup data point
 */
export interface StreamRollup {
  timestamp: string;
  value: number;
  count?: number;
}

/**
 * Group information
 */
export interface Group {
  grpId: string;
  grpName: string;
  grpPath: string;
  grpDescription?: string;
  grpParentId?: string;
  deviceCount?: number;
}

/**
 * Alert information
 */
export interface Alert {
  alertId: string;
  alertType: string;
  alertDescription?: string;
  alertStatus?: string;
  deviceId?: string;
  streamId?: string;
  timestamp?: string;
  severity?: string;
}

/**
 * Monitor (webhook) information
 */
export interface Monitor {
  monId: string;
  monDescription: string;
  monUrl: string;
  monEnabled: boolean;
  monTopics?: string[];
  monBatchSize?: number;
  monBatchDuration?: number;
}

/**
 * Automation information
 */
export interface Automation {
  autoId: string;
  autoName: string;
  autoDescription?: string;
  autoEnabled: boolean;
  autoTrigger?: Record<string, unknown>;
  autoActions?: Array<Record<string, unknown>>;
}

/**
 * Automation run information
 */
export interface AutomationRun {
  runId: string;
  autoId: string;
  status: string;
  startTime?: string;
  endTime?: string;
  triggeredBy?: string;
}

/**
 * Job information
 */
export interface Job {
  jobId: string;
  jobType: string;
  jobStatus: string;
  jobDescription?: string;
  jobCreated?: string;
  jobStarted?: string;
  jobCompleted?: string;
  jobProgress?: number;
  deviceId?: string;
}

/**
 * Firmware information
 */
export interface Firmware {
  fwId: string;
  fwVersion: string;
  fwDescription?: string;
  fwSize?: number;
  fwUploadDate?: string;
  fwDeviceType?: string;
}

/**
 * Firmware update information
 */
export interface FirmwareUpdate {
  updateId: string;
  fwId: string;
  status: string;
  startTime?: string;
  completionTime?: string;
  deviceCount?: number;
  successCount?: number;
  failureCount?: number;
}

/**
 * Configuration template information
 */
export interface Template {
  configId: string;
  configName: string;
  configDescription?: string;
  configVersion?: number;
  configContent?: Record<string, unknown>;
}

/**
 * Health configuration information
 */
export interface HealthConfig {
  healthConfigId: string;
  healthConfigName: string;
  healthConfigDescription?: string;
  rules?: Array<Record<string, unknown>>;
}

/**
 * Event (audit trail) information
 */
export interface Event {
  eventId: string;
  timestamp: string;
  facility?: string;
  operation?: string;
  userId?: string;
  deviceId?: string;
  details?: string;
  ipAddress?: string;
}

/**
 * User information
 */
export interface User {
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  userEnabled?: boolean;
  userLastLogin?: string;
}

/**
 * File information
 */
export interface FileInfo {
  fileId: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  uploadDate?: string;
  description?: string;
}

/**
 * Account information
 */
export interface AccountInfo {
  accountId: string;
  accountName: string;
  accountType?: string;
  deviceLimit?: number;
  deviceCount?: number;
  features?: string[];
}

/**
 * Account security information
 */
export interface AccountSecurity {
  passwordPolicy?: Record<string, unknown>;
  mfaEnabled?: boolean;
  ipWhitelist?: string[];
  sessionTimeout?: number;
}

/**
 * API information
 */
export interface ApiInfo {
  version: string;
  endpoints?: string[];
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: string;
  };
}

/**
 * Device log entry
 */
export interface DeviceLog {
  timestamp: string;
  level: string;
  message: string;
  facility?: string;
}

/**
 * Axios response wrapper
 */
export interface AxiosResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Axios error response
 */
export interface AxiosError {
  response?: {
    status: number;
    data?: unknown;
  };
  message: string;
}
