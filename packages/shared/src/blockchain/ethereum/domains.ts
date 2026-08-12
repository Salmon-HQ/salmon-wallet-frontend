/**
 * Ethereum Name Service (ENS)
 * Migrated from salmon-wallet-v2:
 * - src/adapter/services/ethereum/ethereum-name-service.js
 *
 * Provides functionality for resolving ENS domain names:
 * - Forward lookup: resolve .eth domain to address
 * - Reverse lookup: get .eth domain for an address
 *
 * Uses ethers.js v6 provider methods for ENS resolution.
 */

import type { Provider } from 'ethers';

// ============================================================================
// ENS Resolution Functions
// ============================================================================

/**
 * Gets the ENS name for an Ethereum address (reverse lookup)
 *
 * Uses the provider's lookupAddress method to find the primary ENS name
 * associated with an address.
 *
 * @param provider - Ethers.js provider
 * @param address - Ethereum address to look up
 * @returns ENS name (e.g., 'vitalik.eth'), or null if not found
 *
 * @example
 * ```typescript
 * const name = await getEnsName(provider, '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
 * // Returns: 'vitalik.eth' or null
 * ```
 */
export async function getEnsName(provider: Provider, address: string): Promise<string | null> {
  try {
    return await provider.lookupAddress(address);
  } catch {
    return null;
  }
}

/**
 * Resolves an ENS name to an Ethereum address (forward lookup)
 *
 * Uses the provider's resolveName method to resolve an ENS name
 * to its associated Ethereum address.
 *
 * @param provider - Ethers.js provider
 * @param name - ENS name to resolve (e.g., 'vitalik.eth')
 * @returns Ethereum address, or null if not found
 *
 * @example
 * ```typescript
 * const address = await resolveEnsName(provider, 'vitalik.eth');
 * // Returns: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' or null
 * ```
 */
export async function resolveEnsName(provider: Provider, name: string): Promise<string | null> {
  try {
    return await provider.resolveName(name);
  } catch {
    return null;
  }
}

// ============================================================================
// Alias Functions
// ============================================================================

/**
 * Alias for getEnsName - gets the ENS domain for an address
 *
 * @param provider - Ethers.js provider
 * @param address - Ethereum address to look up
 * @returns ENS name, or null if not found
 */
export async function getDomain(provider: Provider, address: string): Promise<string | null> {
  return getEnsName(provider, address);
}

/**
 * Alias for getEnsName - gets the ENS domain from an address
 *
 * @param provider - Ethers.js provider
 * @param address - Ethereum address to look up
 * @returns ENS name, or null if not found
 */
export async function getDomainFromAddress(
  provider: Provider,
  address: string
): Promise<string | null> {
  return getEnsName(provider, address);
}

/**
 * Alias for resolveEnsName - gets the address from an ENS domain
 *
 * @param provider - Ethers.js provider
 * @param domain - ENS domain to resolve
 * @returns Ethereum address, or null if not found
 */
export async function getAddressFromDomain(
  provider: Provider,
  domain: string
): Promise<string | null> {
  return resolveEnsName(provider, domain);
}
