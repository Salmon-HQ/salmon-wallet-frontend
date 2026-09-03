/**
 * Tests for Network Service
 * Migrated from api/client.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios BEFORE importing the service module
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

import type { apiClient as apiClientType } from '../client';
import { getReachableBackendBaseUrl } from '../test-backend';
import type {
  getNetworks as getNetworksType,
  getNetwork as getNetworkType,
  getEnabledNetworkIds as getEnabledNetworkIdsType,
  isBackendNetworkEnabled as isBackendNetworkEnabledType,
} from './network';
import type { NetworkCatalogEntry } from '../../types/blockchain';

const backendBaseUrl = await getReachableBackendBaseUrl();

let apiClient: typeof apiClientType;
let getNetworks: typeof getNetworksType;
let getNetwork: typeof getNetworkType;
let getEnabledNetworkIds: typeof getEnabledNetworkIdsType;
let isBackendNetworkEnabled: typeof isBackendNetworkEnabledType;

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

async function reloadNetworkModule() {
  vi.resetModules();
  ({ apiClient } = await import('../client'));
  ({ getNetworks, getNetwork, getEnabledNetworkIds, isBackendNetworkEnabled } =
    await import('./network'));
}

beforeEach(async () => {
  vi.clearAllMocks();
  await reloadNetworkModule();
});

describe('Network Service', () => {
  describe('getNetworks()', () => {
    it('should return array of networks', async () => {
      const mockNetworks: NetworkCatalogEntry[] = [
        {
          id: 'solana-mainnet',
          name: 'Solana Mainnet',
          blockchain: 'solana',
          environment: 'mainnet',
          config: { nodeUrl: 'https://api.mainnet-beta.solana.com' },
          enabled: true,
          sections: {} as never,
        },
        {
          id: 'ethereum-mainnet',
          name: 'Ethereum Mainnet',
          blockchain: 'ethereum',
          environment: 'mainnet',
          config: { rpcUrl: 'https://eth.llamarpc.com', chainId: 1 },
          enabled: false,
          sections: {} as never,
        },
      ];

      apiClient.get = vi.fn().mockResolvedValue({ data: mockNetworks });

      const networks = await getNetworks();

      expect(Array.isArray(networks)).toBe(true);
      expect(networks.length).toBeGreaterThan(0);
      expect(apiClient.get).toHaveBeenCalledWith('/v1/networks');
      expect(networks).toEqual(mockNetworks);
    });

    it('should cache networks data on subsequent calls', async () => {
      const mockNetworks: NetworkCatalogEntry[] = [
        {
          id: 'solana-mainnet',
          name: 'Solana Mainnet',
          blockchain: 'solana',
          environment: 'mainnet',
          config: { nodeUrl: 'https://api.mainnet-beta.solana.com' },
          enabled: true,
          sections: {} as never,
        },
      ];

      apiClient.get = vi.fn().mockResolvedValue({ data: mockNetworks });

      const networks1 = await getNetworks();
      const networks2 = await getNetworks();

      expect(networks1).toBe(networks2);
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should clear cache and retry on error', async () => {
      apiClient.get = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: [
            {
              id: 'bitcoin-testnet',
              name: 'Test Network',
              blockchain: 'bitcoin',
              environment: 'testnet',
              config: {},
              enabled: false,
              sections: {} as never,
            },
          ],
        });

      await expect(getNetworks()).rejects.toThrow('Network error');

      const networks = await getNetworks();
      expect(networks).toHaveLength(1);
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });

    it('should handle empty networks array', async () => {
      apiClient.get = vi.fn().mockResolvedValue({ data: [] });

      const networks = await getNetworks();

      expect(Array.isArray(networks)).toBe(true);
      expect(networks).toHaveLength(0);
    });
  });

  describe('getNetwork()', () => {
    it('should return specific network by id', async () => {
      const mockNetworks: NetworkCatalogEntry[] = [
        {
          id: 'solana-mainnet',
          name: 'Solana Mainnet',
          blockchain: 'solana',
          environment: 'mainnet',
          config: { nodeUrl: 'https://api.mainnet-beta.solana.com' },
          enabled: true,
          sections: {} as never,
        },
        {
          id: 'ethereum-mainnet',
          name: 'Ethereum Mainnet',
          blockchain: 'ethereum',
          environment: 'mainnet',
          config: { rpcUrl: 'https://eth.llamarpc.com', chainId: 1 },
          enabled: false,
          sections: {} as never,
        },
      ];

      apiClient.get = vi.fn().mockResolvedValue({ data: mockNetworks });

      const network = await getNetwork('solana-mainnet');

      expect(network).toBeDefined();
      expect(network?.id).toBe('solana-mainnet');
      expect(network?.name).toBe('Solana Mainnet');
    });

    it('should return undefined for non-existent network', async () => {
      const mockNetworks: NetworkCatalogEntry[] = [
        {
          id: 'solana-mainnet',
          name: 'Solana Mainnet',
          blockchain: 'solana',
          environment: 'mainnet',
          config: { nodeUrl: 'https://api.mainnet-beta.solana.com' },
          enabled: true,
          sections: {} as never,
        },
      ];

      apiClient.get = vi.fn().mockResolvedValue({ data: mockNetworks });

      const network = await getNetwork('non-existent-network');

      expect(network).toBeUndefined();
    });

    it('should use cached networks data', async () => {
      const mockNetworks: NetworkCatalogEntry[] = [
        {
          id: 'bitcoin-testnet',
          name: 'Test Network',
          blockchain: 'bitcoin',
          environment: 'testnet',
          config: {},
          enabled: false,
          sections: {} as never,
        },
      ];

      apiClient.get = vi.fn().mockResolvedValue({ data: mockNetworks });

      await getNetwork('test-network');
      await getNetwork('test-network');

      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should return undefined for network ids not present in the cached catalog', async () => {
      const mockNetworks: NetworkCatalogEntry[] = [
        {
          id: 'solana-mainnet',
          name: 'Solana Mainnet',
          blockchain: 'solana',
          environment: 'mainnet',
          config: { nodeUrl: 'https://rpc.solana.example' },
          enabled: true,
          sections: {} as never,
        },
      ];

      apiClient.get = vi.fn().mockResolvedValue({ data: mockNetworks });

      const network1 = await getNetwork('solana-mainnet');
      const network2 = await getNetwork('bitcoin-mainnet');

      expect(network1).toBeDefined();
      expect(network2).toBeUndefined();
    });
  });

  describe('backend capability helpers', () => {
    it('returns enabled network ids from the catalog', async () => {
      const mockNetworks: NetworkCatalogEntry[] = [
        {
          id: 'solana-mainnet',
          name: 'Solana Mainnet',
          blockchain: 'solana',
          environment: 'mainnet',
          config: { nodeUrl: 'https://rpc.solana.example' },
          enabled: true,
          sections: {} as never,
        },
        {
          id: 'ethereum-mainnet',
          name: 'Ethereum Mainnet',
          blockchain: 'ethereum',
          environment: 'mainnet',
          config: { rpcUrl: 'https://eth.example', chainId: 1 },
          enabled: false,
          sections: {} as never,
        },
      ];

      apiClient.get = vi.fn().mockResolvedValue({ data: mockNetworks });

      await expect(getEnabledNetworkIds()).resolves.toEqual(['solana-mainnet']);
    });

    it('checks whether a specific backend network is enabled', async () => {
      const mockNetworks: NetworkCatalogEntry[] = [
        {
          id: 'solana-mainnet',
          name: 'Solana Mainnet',
          blockchain: 'solana',
          environment: 'mainnet',
          config: { nodeUrl: 'https://rpc.solana.example' },
          enabled: true,
          sections: {} as never,
        },
        {
          id: 'ethereum-mainnet',
          name: 'Ethereum Mainnet',
          blockchain: 'ethereum',
          environment: 'mainnet',
          config: { rpcUrl: 'https://eth.example', chainId: 1 },
          enabled: false,
          sections: {} as never,
        },
      ];

      apiClient.get = vi.fn().mockResolvedValue({ data: mockNetworks });

      await expect(isBackendNetworkEnabled('solana-mainnet')).resolves.toBe(true);
      await expect(isBackendNetworkEnabled('ethereum-mainnet')).resolves.toBe(false);
      await expect(isBackendNetworkEnabled('missing-network')).resolves.toBe(false);
    });
  });
});

describe('Network Service integration', () => {
  it('reads live network catalog from salmon-api and preserves contract invariants', async () => {
    const liveBackendBaseUrl = backendBaseUrl ?? (await getReachableBackendBaseUrl());
    if (!liveBackendBaseUrl) {
      console.log('Skipping live network catalog assertions: backend not reachable');
      return;
    }

    apiClient.get = vi.fn().mockImplementation(async (path) => {
      const response = await fetchWithRetry(`${liveBackendBaseUrl}${path as string}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return {
        data: await response.json(),
      } as { data: NetworkCatalogEntry[] };
    });

    const result = await getNetworks();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    result.forEach((network) => {
      expect(network).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          blockchain: expect.any(String),
          environment: expect.any(String),
          name: expect.any(String),
          config: expect.any(Object),
          enabled: expect.any(Boolean),
          sections: expect.any(Object),
        })
      );
    });

    const solanaMainnet = result.find((network) => network.id === 'solana-mainnet');
    expect(solanaMainnet).toEqual(
      expect.objectContaining({
        blockchain: 'solana',
        config: expect.objectContaining({
          nodeUrl: expect.any(String),
        }),
        sections: expect.objectContaining({
          overview: expect.any(Object),
          transactions: expect.any(Object),
        }),
      })
    );
  }, 20000);
});
