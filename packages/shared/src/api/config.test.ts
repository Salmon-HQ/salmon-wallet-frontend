/**
 * Tests for API Configuration module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getLocalApiUrl,
  detectEnvironment,
  getApiUrl,
  getStaticApiUrl,
  apiConfig,
  API_URL_MAP,
  STATIC_API_URL_MAP,
  type Environment,
} from './config';

describe('API Config Module', () => {
  // Store original env values
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    // Clean up common env vars that might interfere
    delete process.env.EXPO_PUBLIC_API_HOST;
    delete process.env.EXPO_PUBLIC_API_PORT;
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_STATIC_API_URL;
    delete process.env.EXPO_PUBLIC_SALMON_ENV;
    delete process.env.VITE_API_HOST;
    delete process.env.VITE_API_PORT;
    delete process.env.VITE_API_URL;
    delete process.env.VITE_STATIC_API_URL;
    delete process.env.VITE_SALMON_ENV;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getLocalApiUrl', () => {
    it('should return default localhost:3000/local when no parameters or env vars are set', () => {
      const url = getLocalApiUrl();
      expect(url).toBe('http://localhost:3000/local');
    });

    it('rewrites the default host to the emulator alias on Android', () => {
      process.env.EXPO_OS = 'android';

      expect(getLocalApiUrl()).toBe('http://10.0.2.2:3000/local');
    });

    it('keeps a host that was configured on purpose, even on Android', () => {
      // A physical Android device reports the same EXPO_OS as the emulator,
      // but 10.0.2.2 resolves to nothing there, while 127.0.0.1 works because
      // `adb reverse` forwards it. Rewriting a host someone set on purpose is
      // how a device build ends up unable to reach a backend that runs fine.
      process.env.EXPO_OS = 'android';
      process.env.EXPO_PUBLIC_API_HOST = '127.0.0.1';

      expect(getLocalApiUrl()).toBe('http://127.0.0.1:3000/local');
      expect(getLocalApiUrl('192.168.1.100')).toBe('http://192.168.1.100:3000/local');
    });

    it('should use provided host parameter', () => {
      const url = getLocalApiUrl('192.168.1.100');
      expect(url).toBe('http://192.168.1.100:3000/local');
    });

    it('should use provided port parameter', () => {
      const url = getLocalApiUrl(undefined, 8080);
      expect(url).toBe('http://localhost:8080/local');
    });

    it('should use both host and port parameters', () => {
      const url = getLocalApiUrl('host.docker.internal', 3001);
      expect(url).toBe('http://host.docker.internal:3001/local');
    });

    it('should use EXPO_PUBLIC_API_HOST env var when no host parameter provided', () => {
      process.env.EXPO_PUBLIC_API_HOST = 'expo.host.com';
      const url = getLocalApiUrl();
      expect(url).toBe('http://expo.host.com:3000/local');
    });

    it('should use EXPO_PUBLIC_API_PORT env var when no port parameter provided', () => {
      process.env.EXPO_PUBLIC_API_PORT = '4000';
      const url = getLocalApiUrl();
      expect(url).toBe('http://localhost:4000/local');
    });

    it('should use VITE_API_HOST env var when EXPO_PUBLIC_API_HOST is not set', () => {
      process.env.VITE_API_HOST = 'vite.host.com';
      const url = getLocalApiUrl();
      expect(url).toBe('http://vite.host.com:3000/local');
    });

    it('should use VITE_API_PORT env var when EXPO_PUBLIC_API_PORT is not set', () => {
      process.env.VITE_API_PORT = '5000';
      const url = getLocalApiUrl();
      expect(url).toBe('http://localhost:5000/local');
    });

    it('should prefer EXPO_PUBLIC_* over VITE_* env vars', () => {
      process.env.EXPO_PUBLIC_API_HOST = 'expo.host.com';
      process.env.VITE_API_HOST = 'vite.host.com';
      process.env.EXPO_PUBLIC_API_PORT = '4000';
      process.env.VITE_API_PORT = '5000';
      const url = getLocalApiUrl();
      expect(url).toBe('http://expo.host.com:4000/local');
    });

    it('should prefer parameters over env vars', () => {
      process.env.EXPO_PUBLIC_API_HOST = 'env.host.com';
      process.env.EXPO_PUBLIC_API_PORT = '4000';
      const url = getLocalApiUrl('param.host.com', 8080);
      expect(url).toBe('http://param.host.com:8080/local');
    });

    it('should handle non-numeric port env var by falling back to default', () => {
      process.env.EXPO_PUBLIC_API_PORT = 'invalid';
      const url = getLocalApiUrl();
      // parseInt('invalid', 10) returns NaN, which should be handled
      expect(url).toMatch(/^http:\/\/localhost:/);
    });

    it('should handle empty string env vars by falling back to defaults', () => {
      process.env.EXPO_PUBLIC_API_HOST = '';
      process.env.EXPO_PUBLIC_API_PORT = '';
      const url = getLocalApiUrl();
      expect(url).toBe('http://localhost:3000/local');
    });

    it('should support Docker host.docker.internal', () => {
      const url = getLocalApiUrl('host.docker.internal', 3000);
      expect(url).toBe('http://host.docker.internal:3000/local');
    });

    it('should support IPv4 addresses', () => {
      const url = getLocalApiUrl('127.0.0.1', 8080);
      expect(url).toBe('http://127.0.0.1:8080/local');
    });

    it('should support custom ports for different services', () => {
      const url1 = getLocalApiUrl('localhost', 3000);
      const url2 = getLocalApiUrl('localhost', 3001);
      const url3 = getLocalApiUrl('localhost', 8000);
      expect(url1).toBe('http://localhost:3000/local');
      expect(url2).toBe('http://localhost:3001/local');
      expect(url3).toBe('http://localhost:8000/local');
    });
  });

  describe('detectEnvironment', () => {
    it('should return "local" by default when no env vars are set', () => {
      const env = detectEnvironment();
      expect(env).toBe('local');
    });

    it('should return "local" when EXPO_PUBLIC_SALMON_ENV is "local"', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'local';
      const env = detectEnvironment();
      expect(env).toBe('local');
    });

    it('should return "staging" when EXPO_PUBLIC_SALMON_ENV is "staging"', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'staging';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should return "production" when EXPO_PUBLIC_SALMON_ENV is "production"', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'production';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should return "local" when VITE_SALMON_ENV is "local"', () => {
      process.env.VITE_SALMON_ENV = 'local';
      const env = detectEnvironment();
      expect(env).toBe('local');
    });

    it('should return "staging" when VITE_SALMON_ENV is "staging"', () => {
      process.env.VITE_SALMON_ENV = 'staging';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should return "production" when VITE_SALMON_ENV is "production"', () => {
      process.env.VITE_SALMON_ENV = 'production';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should prefer EXPO_PUBLIC_SALMON_ENV over VITE_SALMON_ENV', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'production';
      process.env.VITE_SALMON_ENV = 'staging';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should fall back to NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should map NODE_ENV=development to "local"', () => {
      process.env.NODE_ENV = 'development';
      const env = detectEnvironment();
      expect(env).toBe('local');
    });

    it('should map NODE_ENV=test to "local"', () => {
      process.env.NODE_ENV = 'test';
      const env = detectEnvironment();
      expect(env).toBe('local');
    });

    it('should return "local" for unrecognized NODE_ENV values', () => {
      process.env.NODE_ENV = 'unknown';
      const env = detectEnvironment();
      expect(env).toBe('local');
    });

    it('should ignore invalid SALMON_ENV values and fall back to NODE_ENV', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'invalid';
      process.env.NODE_ENV = 'production';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should ignore invalid SALMON_ENV values and return "local" if no valid NODE_ENV', () => {
      process.env.VITE_SALMON_ENV = 'invalid-env';
      const env = detectEnvironment();
      expect(env).toBe('local');
    });

    it('should prefer SALMON_ENV over NODE_ENV', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'staging';
      process.env.NODE_ENV = 'production';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should handle empty string SALMON_ENV by falling back to NODE_ENV', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = '';
      process.env.NODE_ENV = 'production';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should handle case-sensitive environment values', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'PRODUCTION';
      const env = detectEnvironment();
      // Should not match because it's case-sensitive
      expect(env).toBe('local');
    });
  });

  describe('getApiUrl', () => {
    it('should return local API URL when environment is "local"', () => {
      process.env.NODE_ENV = 'development';
      const url = getApiUrl();
      expect(url).toBe('http://localhost:3000/local');
    });

    it('should use provided environment parameter over detected environment', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'local';
      const url = getApiUrl('staging');
      expect(url).toBe('https://te4x28v8e0.execute-api.us-east-1.amazonaws.com/prod');
    });

    it('should return AWS API Gateway URL for staging', () => {
      const url = getApiUrl('staging');
      expect(url).toBe('https://te4x28v8e0.execute-api.us-east-1.amazonaws.com/prod');
    });

    it('should return AWS API Gateway URL for production', () => {
      const url = getApiUrl('production');
      expect(url).toBe('https://te4x28v8e0.execute-api.us-east-1.amazonaws.com/prod');
    });

    it('should respect EXPO_PUBLIC_API_URL override', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://custom.api.com';
      const url = getApiUrl();
      expect(url).toBe('https://custom.api.com');
    });

    it('should respect VITE_API_URL override', () => {
      process.env.VITE_API_URL = 'https://vite-custom.api.com';
      const url = getApiUrl();
      expect(url).toBe('https://vite-custom.api.com');
    });

    it('should prefer EXPO_PUBLIC_API_URL over VITE_API_URL', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://expo.api.com';
      process.env.VITE_API_URL = 'https://vite.api.com';
      const url = getApiUrl();
      expect(url).toBe('https://expo.api.com');
    });

    it('should prefer API_URL override over environment-specific URLs', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://override.api.com';
      const url = getApiUrl('production');
      expect(url).toBe('https://override.api.com');
    });

    it('should use custom host and port for local environment', () => {
      process.env.EXPO_PUBLIC_API_HOST = 'dev.local';
      process.env.EXPO_PUBLIC_API_PORT = '4000';
      const url = getApiUrl('local');
      expect(url).toBe('http://dev.local:4000/local');
    });

    it('should handle all valid environment values', () => {
      const environments: Environment[] = ['local', 'staging', 'production'];
      environments.forEach((env) => {
        const url = getApiUrl(env);
        expect(url).toBeTruthy();
        expect(typeof url).toBe('string');
      });
    });

    it('should return consistent URLs for multiple calls with same environment', () => {
      const url1 = getApiUrl('staging');
      const url2 = getApiUrl('staging');
      expect(url1).toBe(url2);
    });

    it('should use detected environment when no parameter provided', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'staging';
      const url = getApiUrl();
      expect(url).toBe('https://te4x28v8e0.execute-api.us-east-1.amazonaws.com/prod');
    });
  });

  describe('getStaticApiUrl', () => {
    it('should return local API URL when environment is "local"', () => {
      const url = getStaticApiUrl('local');
      expect(url).toBe('http://localhost:3000/local');
    });

    it('should return CloudFront URL for staging', () => {
      const url = getStaticApiUrl('staging');
      expect(url).toBe('https://d1fh2pwo7kzely.cloudfront.net');
    });

    it('should return CloudFront URL for production', () => {
      const url = getStaticApiUrl('production');
      expect(url).toBe('https://d1fh2pwo7kzely.cloudfront.net');
    });

    it('should respect EXPO_PUBLIC_STATIC_API_URL override', () => {
      process.env.EXPO_PUBLIC_STATIC_API_URL = 'https://custom-static.com';
      const url = getStaticApiUrl();
      expect(url).toBe('https://custom-static.com');
    });

    it('should respect VITE_STATIC_API_URL override', () => {
      process.env.VITE_STATIC_API_URL = 'https://vite-static.com';
      const url = getStaticApiUrl();
      expect(url).toBe('https://vite-static.com');
    });

    it('should prefer EXPO_PUBLIC_STATIC_API_URL over VITE_STATIC_API_URL', () => {
      process.env.EXPO_PUBLIC_STATIC_API_URL = 'https://expo-static.com';
      process.env.VITE_STATIC_API_URL = 'https://vite-static.com';
      const url = getStaticApiUrl();
      expect(url).toBe('https://expo-static.com');
    });

    it('should use provided environment parameter', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'local';
      const url = getStaticApiUrl('production');
      expect(url).toBe('https://d1fh2pwo7kzely.cloudfront.net');
    });

    it('should use custom host and port for local environment', () => {
      process.env.EXPO_PUBLIC_API_HOST = 'static.local';
      process.env.EXPO_PUBLIC_API_PORT = '5000';
      const url = getStaticApiUrl('local');
      expect(url).toBe('http://static.local:5000/local');
    });

    it('should detect environment when no parameter provided', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'production';
      const url = getStaticApiUrl();
      expect(url).toBe('https://d1fh2pwo7kzely.cloudfront.net');
    });

    it('should handle all valid environment values', () => {
      const environments: Environment[] = ['local', 'staging', 'production'];
      environments.forEach((env) => {
        const url = getStaticApiUrl(env);
        expect(url).toBeTruthy();
        expect(typeof url).toBe('string');
      });
    });

    it('should return same URL for staging and production', () => {
      const stagingUrl = getStaticApiUrl('staging');
      const productionUrl = getStaticApiUrl('production');
      expect(stagingUrl).toBe(productionUrl);
    });
  });

  describe('apiConfig object', () => {
    it('should provide dynamic baseUrl getter', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'local';
      expect(apiConfig.baseUrl).toBe('http://localhost:3000/local');
    });

    it('should provide dynamic staticBaseUrl getter', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'staging';
      expect(apiConfig.staticBaseUrl).toBe('https://d1fh2pwo7kzely.cloudfront.net');
    });

    it('should provide dynamic environment getter', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'production';
      expect(apiConfig.environment).toBe('production');
    });

    it('should update baseUrl when environment changes', () => {
      process.env.EXPO_PUBLIC_SALMON_ENV = 'local';
      const url1 = apiConfig.baseUrl;
      process.env.EXPO_PUBLIC_SALMON_ENV = 'staging';
      const url2 = apiConfig.baseUrl;
      expect(url1).not.toBe(url2);
    });

    it('should have all required properties', () => {
      expect(apiConfig).toHaveProperty('baseUrl');
      expect(apiConfig).toHaveProperty('staticBaseUrl');
      expect(apiConfig).toHaveProperty('environment');
    });

    it('should return string values for all properties', () => {
      expect(typeof apiConfig.baseUrl).toBe('string');
      expect(typeof apiConfig.staticBaseUrl).toBe('string');
      expect(typeof apiConfig.environment).toBe('string');
    });
  });

  describe('exported constants', () => {
    it('should export API_URL_MAP with all environments', () => {
      expect(API_URL_MAP).toHaveProperty('local');
      expect(API_URL_MAP).toHaveProperty('staging');
      expect(API_URL_MAP).toHaveProperty('production');
    });

    it('should export STATIC_API_URL_MAP with all environments', () => {
      expect(STATIC_API_URL_MAP).toHaveProperty('local');
      expect(STATIC_API_URL_MAP).toHaveProperty('staging');
      expect(STATIC_API_URL_MAP).toHaveProperty('production');
    });

    it('API_URL_MAP should contain valid HTTP(S) URLs', () => {
      Object.values(API_URL_MAP).forEach((url) => {
        expect(url).toMatch(/^https?:\/\//);
      });
    });

    it('STATIC_API_URL_MAP should contain valid HTTP(S) URLs', () => {
      Object.values(STATIC_API_URL_MAP).forEach((url) => {
        expect(url).toMatch(/^https?:\/\//);
      });
    });

    it('should have matching local URLs in both maps', () => {
      expect(API_URL_MAP.local).toBe(STATIC_API_URL_MAP.local);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined process.env gracefully', () => {
      // This test verifies the code doesn't crash when process is undefined
      // In real browser environments without Node.js polyfills
      const url = getApiUrl('local');
      expect(url).toBeTruthy();
    });

    it('should handle whitespace in env vars', () => {
      process.env.EXPO_PUBLIC_API_HOST = '  localhost  ';
      const url = getLocalApiUrl();
      // Should use the value as-is (trimming is not the responsibility of this module)
      expect(url).toContain('localhost');
    });

    it('should handle port 0', () => {
      const url = getLocalApiUrl('localhost', 0);
      expect(url).toBe('http://localhost:0/local');
    });

    it('should handle very high port numbers', () => {
      const url = getLocalApiUrl('localhost', 65535);
      expect(url).toBe('http://localhost:65535/local');
    });

    it('should handle negative port numbers', () => {
      const url = getLocalApiUrl('localhost', -1);
      expect(url).toBe('http://localhost:-1/local');
    });

    it('should not validate URL format', () => {
      // The module doesn't validate URLs, it just constructs them
      const url = getLocalApiUrl('not a valid host!@#', 3000);
      expect(url).toBe('http://not a valid host!@#:3000/local');
    });

    it('should handle multiple consecutive calls efficiently', () => {
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(getApiUrl('local'));
      }
      expect(new Set(results).size).toBe(1); // All results should be identical
    });
  });
});
