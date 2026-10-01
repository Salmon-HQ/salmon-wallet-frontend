/**
 * API Module Exports
 * Provides API client, configuration, and network services
 */

// Configuration exports
export {
  type Environment,
  getApiUrl,
  getStaticApiUrl,
  detectEnvironment,
  apiConfig,
  API_URL_MAP,
  STATIC_API_URL_MAP,
} from './config';

// Client exports
export {
  // Types
  type ApiResponse,
  type ApiErrorResponse,
  type ApiClientConfig,

  // Error class
  ApiError,

  // Client factory and instances
  createApiClient,
  apiClient,
  staticApiClient,

  // Typed request helpers
  get,
  post,
  put,
  patch,
  del,

  // Axios re-exports for advanced usage
  axios,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from './client';

// Services exports
export * from './services';

// The platform header the backend's availability gate reads (spec 018).
export { setApiPlatform, getApiPlatform, PLATFORM_HEADER } from './client';
export type { ApiPlatform } from './client';
