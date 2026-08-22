/**
 * API Configuration
 * Migrated from salmon-wallet-v2/src/adapter/constants/environment.js
 *
 * Environments:
 * - local: For local development, supports Docker via env vars
 * - staging: Staging environment (TODO: update when ready)
 * - production: Production environment (TODO: update when ready)
 */

// Environment types supported by the application
// Note: 'development' environment has been deprecated and removed
export type Environment = 'local' | 'staging' | 'production';

// Valid environment values for type guards
const VALID_ENVIRONMENTS: Environment[] = ['local', 'staging', 'production'];

// Default ports and hosts for local development
const DEFAULT_LOCAL_HOST = 'localhost';

/** What the Android emulator maps to the host machine's loopback interface. */
const ANDROID_EMULATOR_HOST = '10.0.2.2';
const DEFAULT_LOCAL_PORT = 3000;

// API URL configuration by environment
// Note: Local uses /local prefix because serverless-offline adds it to all routes
const API_URLS: Record<Environment, string> = {
  local: `http://${DEFAULT_LOCAL_HOST}:${DEFAULT_LOCAL_PORT}/local`,
  staging: 'https://te4x28v8e0.execute-api.us-east-1.amazonaws.com/prod',
  production: 'https://te4x28v8e0.execute-api.us-east-1.amazonaws.com/prod',
};

// Static API URL configuration by environment
// Note: Local uses /local prefix because serverless-offline adds it to all routes
const STATIC_API_URLS: Record<Environment, string> = {
  local: `http://${DEFAULT_LOCAL_HOST}:${DEFAULT_LOCAL_PORT}/local`,
  staging: 'https://d1fh2pwo7kzely.cloudfront.net',
  production: 'https://d1fh2pwo7kzely.cloudfront.net',
};

/**
 * Get environment variable value, supporting both Expo (mobile) and Vite (extension/web) formats
 *
 * IMPORTANT: babel-preset-expo only inlines STATIC dot-notation references to process.env.
 * Dynamic access like process.env[key] is NOT replaced and returns undefined at runtime.
 * The static map below ensures each EXPO_PUBLIC_* variable is referenced with dot notation
 * so babel can inline the values. The resulting JS object supports dynamic key lookup.
 *
 * For Vite environments:
 * - process.env is defined as a real JSON object at build time (via vite.config.ts define)
 * - Both static and dynamic access work, so the fallback path handles Vite correctly
 */
function getEnvVar(name: string): string | undefined {
  // Static dot-notation references required for babel-preset-expo inline replacement.
  // Each value is inlined at compile time in Expo/Metro builds.
  // In Vite builds these resolve to undefined (no EXPO_PUBLIC_ vars), falling through below.
  // In tests (Node.js) these read from the real process.env object at call time.
  const expoValue = (
    {
      SALMON_ENV: process.env.EXPO_PUBLIC_SALMON_ENV,
      API_HOST: process.env.EXPO_PUBLIC_API_HOST,
      API_PORT: process.env.EXPO_PUBLIC_API_PORT,
      API_URL: process.env.EXPO_PUBLIC_API_URL,
      STATIC_API_URL: process.env.EXPO_PUBLIC_STATIC_API_URL,
      ANALYTICS_URL: process.env.EXPO_PUBLIC_ANALYTICS_URL,
    } as Record<string, string | undefined>
  )[name];

  if (expoValue) return expoValue;

  // Vite replaces STATIC `process.env.VITE_*` member accesses at build time via
  // its `define`. A DYNAMIC `process.env[`VITE_${name}`]` is NOT statically
  // replaced — and the `process` shim leaves its env empty — so the web build
  // silently fell back to prod. The static map below is required for Vite.
  const viteValue = (
    {
      SALMON_ENV: process.env.VITE_SALMON_ENV,
      API_HOST: process.env.VITE_API_HOST,
      API_PORT: process.env.VITE_API_PORT,
      API_URL: process.env.VITE_API_URL,
      STATIC_API_URL: process.env.VITE_STATIC_API_URL,
      ANALYTICS_URL: process.env.VITE_ANALYTICS_URL,
    } as Record<string, string | undefined>
  )[name];

  if (viteValue) return viteValue;

  // Fallback: dynamic access for Node.js (tests, SSR) where process.env is real.
  if (typeof process !== 'undefined' && process.env) {
    return process.env[`VITE_${name}`] || process.env[name];
  }

  return undefined;
}

/**
 * Helper function to construct local API URL for Docker flexibility
 * Reads from EXPO_PUBLIC_API_HOST/VITE_API_HOST and EXPO_PUBLIC_API_PORT/VITE_API_PORT env vars
 *
 * @param host - Optional host override (defaults to env var or localhost)
 * @param port - Optional port override (defaults to env var or 3000)
 * @returns The constructed local API URL
 *
 * @example
 * // With no args, uses env vars or defaults
 * getLocalApiUrl() // "http://localhost:3000"
 *
 * // Docker on different host
 * getLocalApiUrl('host.docker.internal', 3001) // "http://host.docker.internal:3001"
 *
 * // Or set EXPO_PUBLIC_API_HOST=host.docker.internal in .env
 */
export function getLocalApiUrl(host?: string, port?: number): string {
  const envHost = getEnvVar('API_HOST');
  const envPort = getEnvVar('API_PORT');

  const explicitHost = host ?? envHost;
  let finalHost = explicitHost ?? DEFAULT_LOCAL_HOST;
  const finalPort = port ?? (envPort ? parseInt(envPort, 10) : DEFAULT_LOCAL_PORT);

  // The Android emulator runs in a VM where localhost/127.0.0.1 is the
  // emulator itself, not the host machine; 10.0.2.2 is the alias it maps to
  // the host's loopback. A physical Android device reports the same
  // `EXPO_OS`, and there 10.0.2.2 resolves to nothing at all — while
  // 127.0.0.1 is exactly right, because `adb reverse tcp:3001 tcp:3001`
  // makes it reach the host. So the rewrite only applies to the default: a
  // host someone typed into `.env` or passed as an argument is a decision,
  // and silently replacing it is how a device build ends up unable to reach
  // a backend that is running fine.
  // Note: process.env.EXPO_OS (without optional chaining) is required for
  // babel-preset-expo to inline it at build time.
  const expoOS = typeof process !== 'undefined' && process.env ? process.env.EXPO_OS : undefined;
  if (explicitHost === undefined && expoOS === 'android') {
    finalHost = ANDROID_EMULATOR_HOST;
  }

  // Note: /local prefix is required because serverless-offline adds it to all routes
  return `http://${finalHost}:${finalPort}/local`;
}

/**
 * Detect the current environment from environment variables
 */
export function detectEnvironment(): Environment {
  const envOverride = getEnvVar('SALMON_ENV');
  if (envOverride && isValidEnvironment(envOverride)) {
    return envOverride;
  }

  // Check NODE_ENV as fallback
  const nodeEnv = typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined;

  switch (nodeEnv) {
    case 'production':
      return 'production';
    case 'test':
    case 'development': // Map deprecated NODE_ENV=development to 'local'
      return 'local';
    default:
      // Handles any non-standard NODE_ENV values (including 'local' if ever set)
      return 'local';
  }
}

/**
 * Type guard to check if a string is a valid Environment
 */
function isValidEnvironment(value: string): value is Environment {
  return VALID_ENVIRONMENTS.includes(value as Environment);
}

/**
 * Get the API URL for a given environment
 * Supports environment variable override via EXPO_PUBLIC_API_URL or VITE_API_URL
 *
 * For local development with Docker, you can also use:
 * - EXPO_PUBLIC_API_HOST / VITE_API_HOST
 * - EXPO_PUBLIC_API_PORT / VITE_API_PORT
 */
export function getApiUrl(env?: Environment): string {
  // Check for full URL override first
  const override = getEnvVar('API_URL');
  if (override) {
    return override;
  }

  const environment = env ?? detectEnvironment();

  // For local environment, use the helper to support Docker env vars
  if (environment === 'local') {
    return getLocalApiUrl();
  }

  return API_URLS[environment];
}

/**
 * Get the static API URL for a given environment
 * Supports environment variable override via EXPO_PUBLIC_STATIC_API_URL or VITE_STATIC_API_URL
 */
export function getStaticApiUrl(env?: Environment): string {
  // Check for environment variable override
  const override = getEnvVar('STATIC_API_URL');
  if (override) {
    return override;
  }

  const environment = env ?? detectEnvironment();

  // For local environment, use the helper to support Docker env vars
  if (environment === 'local') {
    return getLocalApiUrl();
  }

  return STATIC_API_URLS[environment];
}

/**
 * Optional dedicated ingest URL for anonymous usage analytics.
 *
 * When set (`EXPO_PUBLIC_ANALYTICS_URL` / `VITE_ANALYTICS_URL`), analytics
 * batches POST here instead of the wallet's `API_URL`. This lets the wallet keep
 * talking to its normal backend (e.g. prod, so onboarding still loads balances)
 * while events are routed to a separate sink — a local dev server, for example.
 *
 * Returns `undefined` when unset; the transport then falls back to the shared
 * API client / `API_URL`.
 */
export function getAnalyticsUrl(): string | undefined {
  return getEnvVar('ANALYTICS_URL');
}

/**
 * API configuration object for backward compatibility
 */
export const apiConfig = {
  get baseUrl(): string {
    return getApiUrl();
  },
  get staticBaseUrl(): string {
    return getStaticApiUrl();
  },
  get environment(): Environment {
    return detectEnvironment();
  },
};

// Export constants for direct access
export const API_URL_MAP = API_URLS;
export const STATIC_API_URL_MAP = STATIC_API_URLS;
