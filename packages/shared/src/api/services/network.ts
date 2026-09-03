/**
 * Network Service
 * Migrated from api/client.ts (originally from salmon-wallet-v2/src/adapter/services/network-service.js)
 *
 * Provides network configuration from the static API.
 * Networks define blockchain connection details (RPC URLs, explorer URLs, etc.)
 *
 * API Endpoints:
 * - GET /v1/networks - Get all available networks (static API)
 */

import { apiClient } from '../client';
import type { NetworkCatalogEntry } from '../../types/blockchain';

// ============================================================================
// Cache
// ============================================================================

/**
 * Promise-based cache for networks data
 * Cached for the lifetime of the application (until error or manual clear)
 */
let networksPromise: Promise<NetworkCatalogEntry[]> | null = null;

// ============================================================================
// Network Service Functions
// ============================================================================

/**
 * Get all available networks from the static API
 * Results are cached for the lifetime of the application
 *
 * Endpoint: GET /v1/networks (static API)
 *
 * @returns Promise resolving to array of networks
 * @throws ApiError if the request fails
 */
export async function getNetworks(): Promise<NetworkCatalogEntry[]> {
  if (networksPromise) {
    return networksPromise;
  }

  networksPromise = apiClient.get<NetworkCatalogEntry[]>('/v1/networks').then(({ data }) => data);

  try {
    return await networksPromise;
  } catch (error) {
    // Clear cache on error so it can be retried
    networksPromise = null;
    throw error;
  }
}

/**
 * Get a specific network by ID
 *
 * @param id - The network identifier to look up
 * @returns The network configuration or undefined if not found
 */
export async function getNetwork(id: string): Promise<NetworkCatalogEntry | undefined> {
  const networks = await getNetworks();
  return networks.find((network) => network.id === id);
}

export async function getEnabledNetworkIds(): Promise<string[]> {
  const networks = await getNetworks();
  return networks.filter((network) => network.enabled).map((network) => network.id);
}

export async function isBackendNetworkEnabled(networkId: string): Promise<boolean> {
  const network = await getNetwork(networkId);
  return network?.enabled ?? false;
}
