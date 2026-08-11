/**
 * API Client
 * Migrated from salmon-wallet-v2/src/adapter/services/axios-wrapper.js
 * and salmon-wallet-v2/src/adapter/services/network-service.js
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { getApiUrl, getStaticApiUrl, Environment } from './config';

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * API error response structure
 * Supports both v3 format ({ message, code, details }) and
 * backend OAuth 2.0 format ({ error, error_description })
 */
export interface ApiErrorResponse {
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
  error?: string;
  error_description?: string;
}

/**
 * Custom API error class with typed response
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;
  public readonly originalError?: AxiosError;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>,
    originalError?: AxiosError
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.originalError = originalError;
  }

  /**
   * Check if the error is a network error (no response received)
   */
  isNetworkError(): boolean {
    return this.status === 0;
  }

  /**
   * Check if the error is a client error (4xx)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if the error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if the error is an authentication error (401)
   */
  isAuthError(): boolean {
    return this.status === 401;
  }

  /**
   * Check if the error is a forbidden error (403)
   */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * Check if the error is a not found error (404)
   */
  isNotFound(): boolean {
    return this.status === 404;
  }
}

// ============================================================================
// Client Configuration Types
// ============================================================================

/**
 * Configuration options for creating an API client
 */
export interface ApiClientConfig {
  /** Base URL for the API (overrides environment-based URL) */
  baseUrl?: string;
  /** Environment to use for URL resolution */
  environment?: Environment;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Retries for idempotent requests that failed without a response or with a 5xx (default: 2) */
  retries?: number;
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
  /** Enable request/response logging (default: false) */
  debug?: boolean;
  /** Custom error handler */
  onError?: (error: ApiError) => void;
  /** Custom request interceptor */
  onRequest?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  /** Custom response interceptor */
  onResponse?: <T>(response: AxiosResponse<T>) => AxiosResponse<T>;
  /** Skip default Content-Type and Accept headers (useful for CDN/static API requests) */
  skipContentTypeHeaders?: boolean;
}

// ============================================================================
// Client Factory
// ============================================================================

/**
 * Create a configured axios instance with interceptors
 */
export function createApiClient(config: ApiClientConfig = {}): AxiosInstance {
  const {
    baseUrl,
    environment,
    timeout = 10000,
    retries = 2,
    headers = {},
    debug = false,
    onError,
    onRequest,
    onResponse,
    skipContentTypeHeaders = false,
  } = config;

  // Resolve base URL
  const resolvedBaseUrl = baseUrl ?? getApiUrl(environment);

  // Build headers - skip Content-Type and Accept for static/CDN requests
  const defaultHeaders = skipContentTypeHeaders
    ? { ...headers }
    : {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      };

  // Create axios instance
  const client = axios.create({
    baseURL: resolvedBaseUrl,
    timeout,
    headers: defaultHeaders,
  });

  // Request interceptor
  client.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      if (debug) {
        console.log(`[API Request] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`, {
          params: requestConfig.params,
          data: requestConfig.data,
        });
      }

      // Apply custom request interceptor if provided
      if (onRequest) {
        return onRequest(requestConfig);
      }

      return requestConfig;
    },
    (error: AxiosError) => {
      if (debug) {
        console.error('[API Request Error]', error.message);
      }
      return Promise.reject(error);
    }
  );

  // Bounded retry for idempotent requests that failed without a response
  // (status 0: DNS, TLS, dropped connection, timeout) or with a 5xx. Backoff
  // with jitter so a backend hiccup does not turn every client into a
  // synchronized retry storm.
  client.interceptors.response.use(undefined, async (error: AxiosError<ApiErrorResponse>) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retryCount?: number }) | undefined;
    const method = config?.method?.toLowerCase();
    const status = error.response?.status ?? 0;
    const retryable = method === 'get' && (status === 0 || status >= 500);
    const attempt = config?._retryCount ?? 0;

    if (!config || !retryable || attempt >= retries) {
      return Promise.reject(error);
    }

    config._retryCount = attempt + 1;
    const backoff = 500 * 2 ** attempt + Math.random() * 250;
    await new Promise((resolve) => setTimeout(resolve, backoff));
    return client.request(config);
  });

  // Response interceptor
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (debug) {
        console.log(`[API Response] ${response.status} ${response.config.url}`, {
          data: response.data,
        });
      }

      // Apply custom response interceptor if provided
      if (onResponse) {
        return onResponse(response);
      }

      return response;
    },
    (error: AxiosError<ApiErrorResponse>) => {
      const apiError = transformError(error);

      if (debug) {
        console.error('[API Response Error]', {
          status: apiError.status,
          message: apiError.message,
          code: apiError.code,
          details: apiError.details,
        });
      }

      // Call custom error handler if provided
      if (onError) {
        onError(apiError);
      }

      return Promise.reject(apiError);
    }
  );

  return client;
}

/**
 * Transform axios error to ApiError
 */
function transformError(error: AxiosError<ApiErrorResponse>): ApiError {
  if (error.response) {
    // Server responded with an error status
    const { status, data } = error.response;
    const message = data?.message || data?.error_description || error.message || 'An error occurred';
    const code = data?.code || data?.error;
    const details = data?.details;

    return new ApiError(message, status, code, details, error);
  } else if (error.request) {
    // Request was made but no response received (network error)
    return new ApiError(
      'Network error: Unable to reach the server',
      0,
      'NETWORK_ERROR',
      undefined,
      error
    );
  } else {
    // Error setting up the request
    return new ApiError(error.message || 'Request configuration error', 0, 'REQUEST_ERROR', undefined, error);
  }
}

// ============================================================================
// Pre-configured Client Instances
// ============================================================================

/**
 * Default API client using environment-based configuration
 */
export const apiClient = createApiClient();

/**
 * Static API client for static content endpoints (CDN)
 * Does not send Content-Type/Accept headers which can cause 404 on CloudFront
 */
export const staticApiClient = createApiClient({
  baseUrl: getStaticApiUrl(),
  skipContentTypeHeaders: true,
});

// ============================================================================
// Typed Request Helpers
// ============================================================================

/**
 * Make a typed GET request
 */
export async function get<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.get<T>(url, config);
  return response.data;
}

/**
 * Make a typed POST request
 */
export async function post<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.post<T>(url, data, config);
  return response.data;
}

/**
 * Make a typed PUT request
 */
export async function put<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.put<T>(url, data, config);
  return response.data;
}

/**
 * Make a typed PATCH request
 */
export async function patch<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.patch<T>(url, data, config);
  return response.data;
}

/**
 * Make a typed DELETE request
 */
export async function del<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.delete<T>(url, config);
  return response.data;
}

// ============================================================================
// Export axios for advanced usage
// ============================================================================

export { axios };
export type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError };
