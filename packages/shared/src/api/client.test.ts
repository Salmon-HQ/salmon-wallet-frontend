/**
 * Tests for API Client module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Mock axios BEFORE importing the client module
vi.mock('axios', () => {
  const mockCreate = vi.fn(() => ({
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }));

  return {
    default: {
      create: mockCreate,
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
    create: mockCreate,
    get: vi.fn(),
  };
});

import axios from 'axios';
import {
  ApiError,
  createApiClient,
  get,
  post,
  put,
  patch,
  del,
  apiClient,
  staticApiClient,
} from './client';
const mockedAxios = vi.mocked(axios, { deep: true });

describe('API Client Module', () => {
  describe('ApiError class', () => {
    describe('constructor', () => {
      it('should create an instance with all required properties', () => {
        const error = new ApiError('Test error', 400);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.message).toBe('Test error');
        expect(error.status).toBe(400);
        expect(error.name).toBe('ApiError');
      });

      it('should create an instance with optional code parameter', () => {
        const error = new ApiError('Test error', 400, 'VALIDATION_ERROR');
        expect(error.code).toBe('VALIDATION_ERROR');
      });

      it('should create an instance with optional details parameter', () => {
        const details = { field: 'email', reason: 'invalid format' };
        const error = new ApiError('Test error', 400, undefined, details);
        expect(error.details).toEqual(details);
      });

      it('should create an instance with optional originalError parameter', () => {
        const axiosError = new Error('Axios error') as AxiosError;
        const error = new ApiError('Test error', 500, undefined, undefined, axiosError);
        expect(error.originalError).toBe(axiosError);
      });

      it('should create an instance with all optional parameters', () => {
        const details = { userId: 123 };
        const axiosError = new Error('Network failure') as AxiosError;
        const error = new ApiError('Complete error', 503, 'SERVICE_UNAVAILABLE', details, axiosError);

        expect(error.message).toBe('Complete error');
        expect(error.status).toBe(503);
        expect(error.code).toBe('SERVICE_UNAVAILABLE');
        expect(error.details).toEqual(details);
        expect(error.originalError).toBe(axiosError);
      });

      it('should handle empty message', () => {
        const error = new ApiError('', 400);
        expect(error.message).toBe('');
      });

      it('should handle status code 0', () => {
        const error = new ApiError('Network error', 0);
        expect(error.status).toBe(0);
      });

      it('should preserve error stack trace', () => {
        const error = new ApiError('Test error', 500);
        expect(error.stack).toBeDefined();
      });

      it('should handle complex details objects', () => {
        const details = {
          errors: [
            { field: 'email', message: 'Invalid email' },
            { field: 'password', message: 'Too short' },
          ],
          timestamp: Date.now(),
          requestId: 'req-123',
        };
        const error = new ApiError('Validation failed', 422, 'VALIDATION_ERROR', details);
        expect(error.details).toEqual(details);
      });

      it('should handle undefined details', () => {
        const error = new ApiError('Test error', 400, 'CODE', undefined);
        expect(error.details).toBeUndefined();
      });

      it('should handle null-like values in details', () => {
        const details = { value: null, optional: undefined };
        const error = new ApiError('Test', 400, undefined, details);
        expect(error.details).toEqual(details);
      });
    });

    describe('isNetworkError()', () => {
      it('should return true for status 0', () => {
        const error = new ApiError('Network error', 0);
        expect(error.isNetworkError()).toBe(true);
      });

      it('should return false for status 400', () => {
        const error = new ApiError('Bad request', 400);
        expect(error.isNetworkError()).toBe(false);
      });

      it('should return false for status 500', () => {
        const error = new ApiError('Server error', 500);
        expect(error.isNetworkError()).toBe(false);
      });

      it('should return false for any non-zero status', () => {
        const statuses = [100, 200, 201, 301, 400, 404, 500, 503];
        statuses.forEach((status) => {
          const error = new ApiError('Test', status);
          expect(error.isNetworkError()).toBe(false);
        });
      });

      it('should work consistently across multiple calls', () => {
        const error = new ApiError('Network error', 0);
        expect(error.isNetworkError()).toBe(true);
        expect(error.isNetworkError()).toBe(true);
        expect(error.isNetworkError()).toBe(true);
      });
    });

    describe('isClientError()', () => {
      it('should return true for status 400', () => {
        const error = new ApiError('Bad request', 400);
        expect(error.isClientError()).toBe(true);
      });

      it('should return true for status 401', () => {
        const error = new ApiError('Unauthorized', 401);
        expect(error.isClientError()).toBe(true);
      });

      it('should return true for status 403', () => {
        const error = new ApiError('Forbidden', 403);
        expect(error.isClientError()).toBe(true);
      });

      it('should return true for status 404', () => {
        const error = new ApiError('Not found', 404);
        expect(error.isClientError()).toBe(true);
      });

      it('should return true for status 422', () => {
        const error = new ApiError('Unprocessable entity', 422);
        expect(error.isClientError()).toBe(true);
      });

      it('should return true for status 429', () => {
        const error = new ApiError('Too many requests', 429);
        expect(error.isClientError()).toBe(true);
      });

      it('should return true for status 499 (edge of range)', () => {
        const error = new ApiError('Client error', 499);
        expect(error.isClientError()).toBe(true);
      });

      it('should return false for status 399 (just below range)', () => {
        const error = new ApiError('Not client error', 399);
        expect(error.isClientError()).toBe(false);
      });

      it('should return false for status 500 (just above range)', () => {
        const error = new ApiError('Server error', 500);
        expect(error.isClientError()).toBe(false);
      });

      it('should return false for status 0', () => {
        const error = new ApiError('Network error', 0);
        expect(error.isClientError()).toBe(false);
      });

      it('should return false for status 200', () => {
        const error = new ApiError('Success', 200);
        expect(error.isClientError()).toBe(false);
      });

      it('should return false for status 300', () => {
        const error = new ApiError('Redirect', 300);
        expect(error.isClientError()).toBe(false);
      });

      it('should test all 4xx status codes', () => {
        for (let status = 400; status < 500; status++) {
          const error = new ApiError('Client error', status);
          expect(error.isClientError()).toBe(true);
        }
      });
    });

    describe('isServerError()', () => {
      it('should return true for status 500', () => {
        const error = new ApiError('Internal server error', 500);
        expect(error.isServerError()).toBe(true);
      });

      it('should return true for status 501', () => {
        const error = new ApiError('Not implemented', 501);
        expect(error.isServerError()).toBe(true);
      });

      it('should return true for status 502', () => {
        const error = new ApiError('Bad gateway', 502);
        expect(error.isServerError()).toBe(true);
      });

      it('should return true for status 503', () => {
        const error = new ApiError('Service unavailable', 503);
        expect(error.isServerError()).toBe(true);
      });

      it('should return true for status 504', () => {
        const error = new ApiError('Gateway timeout', 504);
        expect(error.isServerError()).toBe(true);
      });

      it('should return true for high status codes (599)', () => {
        const error = new ApiError('Server error', 599);
        expect(error.isServerError()).toBe(true);
      });

      it('should return true for very high status codes (999)', () => {
        const error = new ApiError('Server error', 999);
        expect(error.isServerError()).toBe(true);
      });

      it('should return false for status 499 (just below range)', () => {
        const error = new ApiError('Client error', 499);
        expect(error.isServerError()).toBe(false);
      });

      it('should return false for status 0', () => {
        const error = new ApiError('Network error', 0);
        expect(error.isServerError()).toBe(false);
      });

      it('should return false for status 400', () => {
        const error = new ApiError('Bad request', 400);
        expect(error.isServerError()).toBe(false);
      });

      it('should return false for status 200', () => {
        const error = new ApiError('Success', 200);
        expect(error.isServerError()).toBe(false);
      });

      it('should test common 5xx status codes', () => {
        const serverStatuses = [500, 501, 502, 503, 504];
        serverStatuses.forEach((status) => {
          const error = new ApiError('Server error', status);
          expect(error.isServerError()).toBe(true);
        });
      });
    });

    describe('isAuthError()', () => {
      it('should return true for status 401', () => {
        const error = new ApiError('Unauthorized', 401);
        expect(error.isAuthError()).toBe(true);
      });

      it('should return false for status 400', () => {
        const error = new ApiError('Bad request', 400);
        expect(error.isAuthError()).toBe(false);
      });

      it('should return false for status 402', () => {
        const error = new ApiError('Payment required', 402);
        expect(error.isAuthError()).toBe(false);
      });

      it('should return false for status 403', () => {
        const error = new ApiError('Forbidden', 403);
        expect(error.isAuthError()).toBe(false);
      });

      it('should return false for status 500', () => {
        const error = new ApiError('Server error', 500);
        expect(error.isAuthError()).toBe(false);
      });

      it('should return false for status 0', () => {
        const error = new ApiError('Network error', 0);
        expect(error.isAuthError()).toBe(false);
      });

      it('should work with auth-related error codes', () => {
        const error = new ApiError('Token expired', 401, 'TOKEN_EXPIRED');
        expect(error.isAuthError()).toBe(true);
        expect(error.code).toBe('TOKEN_EXPIRED');
      });

      it('should work consistently across multiple calls', () => {
        const error = new ApiError('Unauthorized', 401);
        expect(error.isAuthError()).toBe(true);
        expect(error.isAuthError()).toBe(true);
      });
    });

    describe('isForbidden()', () => {
      it('should return true for status 403', () => {
        const error = new ApiError('Forbidden', 403);
        expect(error.isForbidden()).toBe(true);
      });

      it('should return false for status 401', () => {
        const error = new ApiError('Unauthorized', 401);
        expect(error.isForbidden()).toBe(false);
      });

      it('should return false for status 402', () => {
        const error = new ApiError('Payment required', 402);
        expect(error.isForbidden()).toBe(false);
      });

      it('should return false for status 404', () => {
        const error = new ApiError('Not found', 404);
        expect(error.isForbidden()).toBe(false);
      });

      it('should return false for status 500', () => {
        const error = new ApiError('Server error', 500);
        expect(error.isForbidden()).toBe(false);
      });

      it('should return false for status 0', () => {
        const error = new ApiError('Network error', 0);
        expect(error.isForbidden()).toBe(false);
      });

      it('should work with permission-related error codes', () => {
        const error = new ApiError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
        expect(error.isForbidden()).toBe(true);
        expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });

      it('should work consistently across multiple calls', () => {
        const error = new ApiError('Forbidden', 403);
        expect(error.isForbidden()).toBe(true);
        expect(error.isForbidden()).toBe(true);
      });
    });

    describe('isNotFound()', () => {
      it('should return true for status 404', () => {
        const error = new ApiError('Not found', 404);
        expect(error.isNotFound()).toBe(true);
      });

      it('should return false for status 400', () => {
        const error = new ApiError('Bad request', 400);
        expect(error.isNotFound()).toBe(false);
      });

      it('should return false for status 403', () => {
        const error = new ApiError('Forbidden', 403);
        expect(error.isNotFound()).toBe(false);
      });

      it('should return false for status 405', () => {
        const error = new ApiError('Method not allowed', 405);
        expect(error.isNotFound()).toBe(false);
      });

      it('should return false for status 500', () => {
        const error = new ApiError('Server error', 500);
        expect(error.isNotFound()).toBe(false);
      });

      it('should return false for status 0', () => {
        const error = new ApiError('Network error', 0);
        expect(error.isNotFound()).toBe(false);
      });

      it('should work with not-found error codes', () => {
        const error = new ApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
        expect(error.isNotFound()).toBe(true);
        expect(error.code).toBe('RESOURCE_NOT_FOUND');
      });

      it('should work consistently across multiple calls', () => {
        const error = new ApiError('Not found', 404);
        expect(error.isNotFound()).toBe(true);
        expect(error.isNotFound()).toBe(true);
      });
    });

    describe('error classification edge cases', () => {
      it('should correctly classify boundary status codes', () => {
        const error399 = new ApiError('Test', 399);
        expect(error399.isClientError()).toBe(false);

        const error400 = new ApiError('Test', 400);
        expect(error400.isClientError()).toBe(true);

        const error499 = new ApiError('Test', 499);
        expect(error499.isClientError()).toBe(true);

        const error500 = new ApiError('Test', 500);
        expect(error500.isServerError()).toBe(true);
      });

      it('should handle multiple classification methods on same error', () => {
        const error = new ApiError('Forbidden', 403);
        expect(error.isClientError()).toBe(true);
        expect(error.isForbidden()).toBe(true);
        expect(error.isAuthError()).toBe(false);
        expect(error.isNotFound()).toBe(false);
        expect(error.isServerError()).toBe(false);
        expect(error.isNetworkError()).toBe(false);
      });

      it('should handle network error classification', () => {
        const error = new ApiError('Network timeout', 0, 'NETWORK_ERROR');
        expect(error.isNetworkError()).toBe(true);
        expect(error.isClientError()).toBe(false);
        expect(error.isServerError()).toBe(false);
        expect(error.isAuthError()).toBe(false);
        expect(error.isForbidden()).toBe(false);
        expect(error.isNotFound()).toBe(false);
      });

      it('should handle auth error classification', () => {
        const error = new ApiError('Unauthorized', 401);
        expect(error.isAuthError()).toBe(true);
        expect(error.isClientError()).toBe(true);
        expect(error.isForbidden()).toBe(false);
        expect(error.isNotFound()).toBe(false);
        expect(error.isServerError()).toBe(false);
        expect(error.isNetworkError()).toBe(false);
      });

      it('should handle server error classification', () => {
        const error = new ApiError('Internal server error', 500);
        expect(error.isServerError()).toBe(true);
        expect(error.isClientError()).toBe(false);
        expect(error.isAuthError()).toBe(false);
        expect(error.isForbidden()).toBe(false);
        expect(error.isNotFound()).toBe(false);
        expect(error.isNetworkError()).toBe(false);
      });

      it('should handle unusual status codes', () => {
        const error1 = new ApiError('Unknown', 999);
        expect(error1.isServerError()).toBe(true);

        const error2 = new ApiError('Unknown', -1);
        expect(error2.isNetworkError()).toBe(false);
        expect(error2.isClientError()).toBe(false);
        expect(error2.isServerError()).toBe(false);

        const error3 = new ApiError('Unknown', 100);
        expect(error3.isClientError()).toBe(false);
        expect(error3.isServerError()).toBe(false);
      });
    });

    describe('error properties immutability', () => {
      it('should have readonly status property', () => {
        const error = new ApiError('Test', 404);
        expect(error.status).toBe(404);
        // TypeScript will prevent modification at compile time
        // At runtime, the property can technically be modified, but it's marked readonly
      });

      it('should have readonly code property', () => {
        const error = new ApiError('Test', 400, 'CODE');
        expect(error.code).toBe('CODE');
      });

      it('should have readonly details property', () => {
        const details = { field: 'test' };
        const error = new ApiError('Test', 400, undefined, details);
        expect(error.details).toEqual(details);
      });

      it('should have readonly originalError property', () => {
        const original = new Error('Original') as AxiosError;
        const error = new ApiError('Test', 500, undefined, undefined, original);
        expect(error.originalError).toBe(original);
      });
    });

    describe('error message and name', () => {
      it('should have correct error name', () => {
        const error = new ApiError('Test', 500);
        expect(error.name).toBe('ApiError');
      });

      it('should preserve message exactly as provided', () => {
        const message = 'This is a detailed error message with special chars: @#$%';
        const error = new ApiError(message, 500);
        expect(error.message).toBe(message);
      });

      it('should handle multiline messages', () => {
        const message = 'Line 1\nLine 2\nLine 3';
        const error = new ApiError(message, 500);
        expect(error.message).toBe(message);
      });

      it('should handle unicode in messages', () => {
        const message = 'Error: Nombre de usuario inválido 🚫';
        const error = new ApiError(message, 400);
        expect(error.message).toBe(message);
      });

      it('should be an instance of Error', () => {
        const error = new ApiError('Test', 500);
        expect(error instanceof Error).toBe(true);
      });

      it('should be distinguishable from generic Error', () => {
        const error = new ApiError('Test', 500);
        const genericError = new Error('Test');
        expect(error instanceof ApiError).toBe(true);
        expect(genericError instanceof ApiError).toBe(false);
      });
    });

    describe('real-world error scenarios', () => {
      it('should handle validation error scenario', () => {
        const error = new ApiError(
          'Validation failed',
          422,
          'VALIDATION_ERROR',
          {
            errors: [
              { field: 'email', message: 'Invalid email format' },
              { field: 'password', message: 'Password too short' },
            ],
          }
        );

        expect(error.isClientError()).toBe(true);
        expect(error.status).toBe(422);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details?.errors).toHaveLength(2);
      });

      it('should handle authentication failure scenario', () => {
        const error = new ApiError(
          'Invalid credentials',
          401,
          'INVALID_CREDENTIALS',
          { attemptCount: 3, maxAttempts: 5 }
        );

        expect(error.isAuthError()).toBe(true);
        expect(error.isClientError()).toBe(true);
        expect(error.code).toBe('INVALID_CREDENTIALS');
      });

      it('should handle rate limiting scenario', () => {
        const error = new ApiError(
          'Rate limit exceeded',
          429,
          'RATE_LIMIT_EXCEEDED',
          { retryAfter: 60, limit: 100 }
        );

        expect(error.isClientError()).toBe(true);
        expect(error.status).toBe(429);
        expect(error.details?.retryAfter).toBe(60);
      });

      it('should handle network timeout scenario', () => {
        const axiosError = new Error('timeout of 30000ms exceeded') as AxiosError;
        const error = new ApiError(
          'Network timeout',
          0,
          'NETWORK_TIMEOUT',
          undefined,
          axiosError
        );

        expect(error.isNetworkError()).toBe(true);
        expect(error.originalError).toBe(axiosError);
      });

      it('should handle server maintenance scenario', () => {
        const error = new ApiError(
          'Service temporarily unavailable',
          503,
          'MAINTENANCE_MODE',
          { estimatedDowntime: '30 minutes' }
        );

        expect(error.isServerError()).toBe(true);
        expect(error.status).toBe(503);
      });

      it('should handle resource not found scenario', () => {
        const error = new ApiError(
          'User not found',
          404,
          'USER_NOT_FOUND',
          { userId: 'usr_123' }
        );

        expect(error.isNotFound()).toBe(true);
        expect(error.isClientError()).toBe(true);
        expect(error.details?.userId).toBe('usr_123');
      });

      it('should handle permission denied scenario', () => {
        const error = new ApiError(
          'Access denied',
          403,
          'INSUFFICIENT_PERMISSIONS',
          { requiredRole: 'admin', userRole: 'user' }
        );

        expect(error.isForbidden()).toBe(true);
        expect(error.isClientError()).toBe(true);
        expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });
    });
  });

  describe('createApiClient()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create an axios instance with default configuration', () => {
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      const client = createApiClient();

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 10000,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
        })
      );
      expect(client).toBe(mockInstance);
    });

    it('should use environment-based URL when no baseUrl is provided', () => {
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      const createCall = mockedAxios.create.mock.calls[0]?.[0];
      expect(createCall?.baseURL).toBeDefined();
      // Should use environment-based URL (local by default in tests)
      expect(createCall?.baseURL).toMatch(/http:\/\/localhost:3000/);
    });

    it('should use provided baseUrl over environment-based URL', () => {
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      const customBaseUrl = 'https://custom-api.example.com';
      createApiClient({ baseUrl: customBaseUrl });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: customBaseUrl,
        })
      );
    });

    it('should set timeout to 10000ms by default', () => {
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 10000,
        })
      );
    });

    it('should allow custom timeout', () => {
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      const customTimeout = 5000;
      createApiClient({ timeout: customTimeout });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: customTimeout,
        })
      );
    });

    it('should apply custom headers', () => {
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      const customHeaders = {
        'X-Custom-Header': 'custom-value',
        Authorization: 'Bearer token123',
      };

      createApiClient({ headers: customHeaders });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining(customHeaders),
        })
      );
    });

    it('should preserve default headers when adding custom headers', () => {
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      const customHeaders = { 'X-Custom-Header': 'value' };
      createApiClient({ headers: customHeaders });

      const createCall = mockedAxios.create.mock.calls[0]?.[0];
      expect(createCall?.headers).toMatchObject({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Custom-Header': 'value',
      });
    });

    it('should skip Content-Type and Accept headers when skipContentTypeHeaders is true', () => {
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient({ skipContentTypeHeaders: true });

      const createCall = mockedAxios.create.mock.calls[0]?.[0];
      expect(createCall?.headers).not.toHaveProperty('Content-Type');
      expect(createCall?.headers).not.toHaveProperty('Accept');
    });

    it('should still include custom headers when skipContentTypeHeaders is true', () => {
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      const customHeaders = { 'X-Custom-Header': 'value' };
      createApiClient({ skipContentTypeHeaders: true, headers: customHeaders });

      const createCall = mockedAxios.create.mock.calls[0]?.[0];
      expect(createCall?.headers).toMatchObject({
        'X-Custom-Header': 'value',
      });
      expect(createCall?.headers).not.toHaveProperty('Content-Type');
      expect(createCall?.headers).not.toHaveProperty('Accept');
    });

    it('should register request interceptor', () => {
      const mockRequestInterceptor = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: mockRequestInterceptor },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      expect(mockRequestInterceptor).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should register response interceptor', () => {
      const mockResponseInterceptor = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: mockResponseInterceptor },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      expect(mockResponseInterceptor).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should call custom onRequest interceptor', () => {
      const mockRequestInterceptor = vi.fn();
      const onRequest = vi.fn((config) => config);
      const mockInstance = {
        interceptors: {
          request: { use: mockRequestInterceptor },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient({ onRequest });

      // Get the request interceptor function
      const interceptorFn = mockRequestInterceptor.mock.calls[0]?.[0];
      const mockConfig = { url: '/test' } as InternalAxiosRequestConfig;

      interceptorFn(mockConfig);

      expect(onRequest).toHaveBeenCalledWith(mockConfig);
    });

    it('should call custom onResponse interceptor', () => {
      const mockResponseInterceptor = vi.fn();
      const onResponse = vi.fn((response) => response);
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: mockResponseInterceptor },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient({ onResponse });

      // Get the response interceptor function
      const interceptorFn = mockResponseInterceptor.mock.calls[1]?.[0];
      const mockResponse = { data: {}, status: 200 } as AxiosResponse;

      interceptorFn(mockResponse);

      expect(onResponse).toHaveBeenCalledWith(mockResponse);
    });

    it('should call custom onError handler when request fails', async () => {
      const mockResponseInterceptor = vi.fn();
      const onError = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: mockResponseInterceptor },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient({ onError });

      // Get the error interceptor function
      const errorInterceptorFn = mockResponseInterceptor.mock.calls[1]?.[1];
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
      } as AxiosError;

      // The onError should be called synchronously during the interceptor execution
      const result = errorInterceptorFn(mockError);

      // Wait for the promise to reject and verify onError was called
      await expect(result).rejects.toThrow();
      expect(onError).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should enable debug logging when debug option is true', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockRequestInterceptor = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: mockRequestInterceptor },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient({ debug: true });

      // Get the request interceptor function and test it
      const interceptorFn = mockRequestInterceptor.mock.calls[0]?.[0];
      const mockConfig = {
        url: '/test',
        method: 'get',
        params: {},
        data: {},
      } as InternalAxiosRequestConfig;

      interceptorFn(mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[API Request]'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should transform axios errors to ApiError in response interceptor', () => {
      const mockResponseInterceptor = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: mockResponseInterceptor },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      // Get the error interceptor function
      const errorInterceptorFn = mockResponseInterceptor.mock.calls[1]?.[1];
      const axiosError = {
        response: {
          status: 500,
          data: { message: 'Server error', code: 'INTERNAL_ERROR' },
        },
        message: 'Request failed',
      } as AxiosError;

      const result = errorInterceptorFn(axiosError);

      return result.catch((error: ApiError) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(500);
        expect(error.message).toBe('Server error');
        expect(error.code).toBe('INTERNAL_ERROR');
      });
    });

    it('should handle network errors (no response)', () => {
      const mockResponseInterceptor = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: mockResponseInterceptor },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      const errorInterceptorFn = mockResponseInterceptor.mock.calls[1]?.[1];
      const networkError = {
        request: {},
        message: 'Network Error',
      } as AxiosError;

      const result = errorInterceptorFn(networkError);

      return result.catch((error: ApiError) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(0);
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.message).toContain('Network error');
      });
    });

    it('should handle request configuration errors', () => {
      const mockResponseInterceptor = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: mockResponseInterceptor },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      const errorInterceptorFn = mockResponseInterceptor.mock.calls[1]?.[1];
      const configError = {
        message: 'Invalid URL',
      } as AxiosError;

      const result = errorInterceptorFn(configError);

      return result.catch((error: ApiError) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(0);
        expect(error.code).toBe('REQUEST_ERROR');
      });
    });
  });

  describe('Request Helpers', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('get()', () => {
      it('should make GET request and return data', async () => {
        const mockData = { id: 1, name: 'Test' };
        apiClient.get = vi.fn().mockResolvedValue({ data: mockData });

        const result = await get('/test');

        expect(apiClient.get).toHaveBeenCalledWith('/test', undefined);
        expect(result).toEqual(mockData);
      });

      it('should pass config to axios get', async () => {
        const mockData = { items: [] };
        const config = { params: { page: 1 }, headers: { 'X-Custom': 'value' } };
        apiClient.get = vi.fn().mockResolvedValue({ data: mockData });

        await get('/items', config);

        expect(apiClient.get).toHaveBeenCalledWith('/items', config);
      });

      it('should propagate errors', async () => {
        const error = new Error('Request failed');
        apiClient.get = vi.fn().mockRejectedValue(error);

        await expect(get('/missing')).rejects.toThrow('Request failed');
      });
    });

    describe('post()', () => {
      it('should make POST request and return data', async () => {
        const requestData = { name: 'New Item' };
        const responseData = { id: 1, name: 'New Item' };
        apiClient.post = vi.fn().mockResolvedValue({ data: responseData });

        const result = await post('/items', requestData);

        expect(apiClient.post).toHaveBeenCalledWith('/items', requestData, undefined);
        expect(result).toEqual(responseData);
      });

      it('should allow POST without data', async () => {
        const responseData = { success: true };
        apiClient.post = vi.fn().mockResolvedValue({ data: responseData });

        const result = await post('/action');

        expect(apiClient.post).toHaveBeenCalledWith('/action', undefined, undefined);
        expect(result).toEqual(responseData);
      });

      it('should pass config to axios post', async () => {
        const data = { name: 'Test' };
        const config = { headers: { 'X-Request-ID': '123' } };
        apiClient.post = vi.fn().mockResolvedValue({ data: {} });

        await post('/items', data, config);

        expect(apiClient.post).toHaveBeenCalledWith('/items', data, config);
      });
    });

    describe('put()', () => {
      it('should make PUT request and return data', async () => {
        const requestData = { name: 'Updated Item' };
        const responseData = { id: 1, name: 'Updated Item' };
        apiClient.put = vi.fn().mockResolvedValue({ data: responseData });

        const result = await put('/items/1', requestData);

        expect(apiClient.put).toHaveBeenCalledWith('/items/1', requestData, undefined);
        expect(result).toEqual(responseData);
      });

      it('should pass config to axios put', async () => {
        const data = { status: 'active' };
        const config = { headers: { 'If-Match': 'etag-123' } };
        apiClient.put = vi.fn().mockResolvedValue({ data: {} });

        await put('/items/1', data, config);

        expect(apiClient.put).toHaveBeenCalledWith('/items/1', data, config);
      });
    });

    describe('patch()', () => {
      it('should make PATCH request and return data', async () => {
        const requestData = { status: 'completed' };
        const responseData = { id: 1, status: 'completed' };
        apiClient.patch = vi.fn().mockResolvedValue({ data: responseData });

        const result = await patch('/items/1', requestData);

        expect(apiClient.patch).toHaveBeenCalledWith('/items/1', requestData, undefined);
        expect(result).toEqual(responseData);
      });

      it('should pass config to axios patch', async () => {
        const data = { name: 'Partial Update' };
        const config = { params: { validate: true } };
        apiClient.patch = vi.fn().mockResolvedValue({ data: {} });

        await patch('/items/1', data, config);

        expect(apiClient.patch).toHaveBeenCalledWith('/items/1', data, config);
      });
    });

    describe('del()', () => {
      it('should make DELETE request and return data', async () => {
        const responseData = { success: true };
        apiClient.delete = vi.fn().mockResolvedValue({ data: responseData });

        const result = await del('/items/1');

        expect(apiClient.delete).toHaveBeenCalledWith('/items/1', undefined);
        expect(result).toEqual(responseData);
      });

      it('should pass config to axios delete', async () => {
        const config = { headers: { 'X-Reason': 'cleanup' } };
        apiClient.delete = vi.fn().mockResolvedValue({ data: {} });

        await del('/items/1', config);

        expect(apiClient.delete).toHaveBeenCalledWith('/items/1', config);
      });

      it('should handle delete with no response data', async () => {
        apiClient.delete = vi.fn().mockResolvedValue({ data: undefined });

        const result = await del('/items/1');

        expect(result).toBeUndefined();
      });
    });
  });

  describe('Error Transformation', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should transform axios error with response to ApiError via interceptor', async () => {
      // The interceptor in createApiClient transforms errors
      // We test this by creating a client and triggering the error interceptor
      const mockResponseInterceptor = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: mockResponseInterceptor },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      // Get the error interceptor function
      const errorInterceptorFn = mockResponseInterceptor.mock.calls[1]?.[1];
      const axiosError = {
        response: {
          status: 400,
          data: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: { field: 'email' },
          },
        },
        message: 'Request failed',
      } as AxiosError;

      const result = errorInterceptorFn(axiosError);

      await expect(result).rejects.toThrow();
      await result.catch((error: ApiError) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(400);
        expect(error.message).toBe('Validation failed');
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details).toEqual({ field: 'email' });
      });
    });

    it('should transform network error to ApiError with status 0', async () => {
      const mockResponseInterceptor = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: mockResponseInterceptor },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      const errorInterceptorFn = mockResponseInterceptor.mock.calls[1]?.[1];
      const axiosError = {
        request: {},
        message: 'Network Error',
      } as AxiosError;

      const result = errorInterceptorFn(axiosError);

      await result.catch((error: ApiError) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(0);
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.isNetworkError()).toBe(true);
      });
    });

    it('should transform request config error to ApiError', async () => {
      const mockResponseInterceptor = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: mockResponseInterceptor },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      const errorInterceptorFn = mockResponseInterceptor.mock.calls[1]?.[1];
      const axiosError = {
        message: 'Invalid URL',
      } as AxiosError;

      const result = errorInterceptorFn(axiosError);

      await result.catch((error: ApiError) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(0);
        expect(error.code).toBe('REQUEST_ERROR');
      });
    });

    it('should preserve original axios error', async () => {
      const mockResponseInterceptor = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: mockResponseInterceptor },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      const errorInterceptorFn = mockResponseInterceptor.mock.calls[1]?.[1];
      const axiosError = {
        response: {
          status: 500,
          data: { message: 'Server error' },
        },
        config: { url: '/test' },
      } as AxiosError;

      const result = errorInterceptorFn(axiosError);

      await result.catch((error: ApiError) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.originalError).toBeDefined();
      });
    });

    it('should handle error without message in response data', async () => {
      const mockResponseInterceptor = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: mockResponseInterceptor },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      const errorInterceptorFn = mockResponseInterceptor.mock.calls[1]?.[1];
      const axiosError = {
        response: {
          status: 500,
          data: {},
        },
        message: 'Internal Server Error',
      } as AxiosError;

      const result = errorInterceptorFn(axiosError);

      await result.catch((error: ApiError) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.message).toBe('Internal Server Error');
      });
    });

    it('should handle error with null response data', async () => {
      const mockResponseInterceptor = vi.fn();
      const mockInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: mockResponseInterceptor },
        },
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      createApiClient();

      const errorInterceptorFn = mockResponseInterceptor.mock.calls[1]?.[1];
      const axiosError = {
        response: {
          status: 404,
          data: null,
        },
        message: 'Not Found',
      } as unknown as AxiosError;

      const result = errorInterceptorFn(axiosError);

      await result.catch((error: ApiError) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(404);
        expect(error.message).toBe('Not Found');
      });
    });
  });

  describe('Pre-configured Client Instances', () => {
    it('should export apiClient instance', () => {
      expect(apiClient).toBeDefined();
      expect(typeof apiClient.get).toBe('function');
      expect(typeof apiClient.post).toBe('function');
    });

    it('should export staticApiClient instance', () => {
      expect(staticApiClient).toBeDefined();
      expect(typeof staticApiClient.get).toBe('function');
      expect(typeof staticApiClient.post).toBe('function');
    });
  });
});
