import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DappMetadata } from '../../types/trusted-app';

vi.mock('../client', async () => {
  const actual = await vi.importActual<typeof import('../client')>('../client');

  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
    },
  };
});

import { ApiError, apiClient } from '../client';
import { getReachableBackendBaseUrl } from '../test-backend';
import { getMetadata } from './dapp';

const mockApiClientGet = vi.mocked(apiClient.get);
const backendBaseUrl = await getReachableBackendBaseUrl();

const MOCK_METADATA: DappMetadata = {
  name: 'Raydium',
  icon: 'https://raydium.io/icon.png',
  description: 'AMM on Solana',
  url: 'https://raydium.io',
};

async function fetchWithRetry(url: string, attempts = 2): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok || response.status < 500 || attempt === attempts) {
        return response;
      }
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error(`Unable to fetch ${url}`);
}

describe('dapp service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests dapp metadata from the backend endpoint', async () => {
    mockApiClientGet.mockResolvedValueOnce({ data: MOCK_METADATA });

    const result = await getMetadata('https://raydium.io');

    expect(mockApiClientGet).toHaveBeenCalledWith('/v1/dapp/metadata', {
      params: { url: 'https://raydium.io' },
    });
    expect(result).toEqual(MOCK_METADATA);
  });

  it('returns null when the backend metadata lookup fails', async () => {
    mockApiClientGet.mockRejectedValueOnce(
      new ApiError('Network error: Unable to reach the server', 0, 'NETWORK_ERROR')
    );

    const result = await getMetadata('https://raydium.io');

    expect(result).toBeNull();
  });
});

describe('dapp service integration', () => {
  it('reads live dapp metadata from salmon-api', async () => {
    const liveBackendBaseUrl = backendBaseUrl ?? (await getReachableBackendBaseUrl());
    if (!liveBackendBaseUrl) {
      console.log('Skipping live dapp integration assertions: backend not reachable');
      return;
    }

    mockApiClientGet.mockImplementation(async (path, config) => {
      const url = new URL(`${liveBackendBaseUrl}${path as string}`);
      const params = config?.params as Record<string, string | number> | undefined;
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, String(value));
        }
      }

      const response = await fetchWithRetry(url.toString());

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}`, response.status);
      }

      return {
        data: await response.json(),
      } as { data: DappMetadata };
    });

    const result = await getMetadata('https://raydium.io');

    expect(result).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        icon: expect.any(String),
      })
    );
  }, 20000);
});
