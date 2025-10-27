/**
 * Authentication and Multi-Tenant Types
 */

/**
 * User credentials for Digi Remote Manager API
 */
export interface UserCredentials {
  api_key_id: string;
  api_key_secret: string;
}

/**
 * Multi-tenant credentials configuration
 * Maps user IDs to their API credentials
 */
export interface UserCredentialsConfig {
  [userId: string]: UserCredentials;
}

/**
 * Request metadata containing user identification and credentials
 * Extracted from HTTP headers
 */
export interface RequestMetadata {
  'X-User-Id'?: string;
  'X-DRM-API-Key-Id'?: string;
  'X-DRM-API-Key-Secret'?: string;
  [key: string]: string | undefined;
}

/**
 * User context stored in AsyncLocalStorage
 */
export interface UserContextStore {
  userId: string;
  metadata?: RequestMetadata;
}
