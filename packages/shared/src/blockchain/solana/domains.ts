/**
 * Solana Domain Name Services
 * Migrated from salmon-wallet-v2:
 * - src/adapter/services/solana/solana-name-service.js
 * - src/adapter/services/solana/alldomains-name-service.js
 *
 * Provides functionality for resolving Solana domain names:
 * - SPL Name Service (.sol domains via @solana-name-service/sns-sdk-kit)
 * - AllDomains (multiple TLDs via @onsol/tldparser-kit)
 *
 * Features:
 * - Resolve .sol domains to public keys
 * - Resolve any TLD domains to public keys
 * - Get domain names for public keys (with fallback)
 */

import type { Address } from '@solana/kit';
import { getPrimaryDomain, resolveDomain } from '@solana-name-service/sns-sdk-kit';
import { TldParser } from '@onsol/tldparser-kit';
import type { SolanaRpc } from './networks';

// ============================================================================
// SPL Name Service (.sol domains)
// ============================================================================

/**
 * Gets the .sol domain for a wallet address
 *
 * Uses the SNS SDK Kit to get the favorite .sol domain associated with a
 * wallet address.
 *
 * @param rpc - Kit RPC client
 * @param walletAddress - Wallet address to look up
 * @returns Domain name with .sol extension, or null if not found
 *
 * @example
 * ```typescript
 * const domain = await getSolDomain(rpc, address('...'));
 * // Returns: 'mydomain.sol' or null
 * ```
 */
export async function getSolDomain(rpc: SolanaRpc, walletAddress: Address): Promise<string | null> {
  try {
    const favorite = await getPrimaryDomain({ rpc, walletAddress });
    if (!favorite?.domainName) {
      return null;
    }
    return favorite.domainName + '.sol';
  } catch {
    return null;
  }
}

/**
 * Resolves a .sol domain to its owner's address
 *
 * @param rpc - Kit RPC client
 * @param domain - Domain name (with or without .sol extension)
 * @returns Owner's address as base58 string, or null if not found
 *
 * @example
 * ```typescript
 * const owner = await resolveSolDomain(rpc, 'mydomain.sol');
 * // Returns: 'AddressBase58...' or null
 * ```
 */
export async function resolveSolDomain(rpc: SolanaRpc, domain: string): Promise<string | null> {
  try {
    const domainName = domain.endsWith('.sol') ? domain.slice(0, -4) : domain;
    const owner = await resolveDomain({ rpc, domain: domainName });
    if (!owner) {
      return null;
    }
    return owner;
  } catch {
    return null;
  }
}

// ============================================================================
// AllDomains (multiple TLDs)
// ============================================================================

/**
 * Gets the main domain for a wallet address using AllDomains
 *
 * Uses TldParser to get the main domain associated with a wallet address.
 * Supports multiple TLDs beyond just .sol.
 *
 * @param rpc - Kit RPC client
 * @param walletAddress - Wallet address to look up
 * @returns Domain name with TLD extension, or null if not found
 *
 * @example
 * ```typescript
 * const domain = await getAllDomain(rpc, address('...'));
 * // Returns: 'mydomain.abc' or null
 * ```
 */
export async function getAllDomain(rpc: SolanaRpc, walletAddress: Address): Promise<string | null> {
  try {
    // @onsol/tldparser-kit pulls @solana/kit as a hard dependency (not a
    // peer, unlike sns-sdk-kit), so it carries its own private v5 copy. Its
    // Rpc<SolanaRpcApi> is structurally distinct from our root v7 Rpc at the
    // type level (the two package instances generate incompatible overload
    // intersections for getAccountInfo), even though both are plain
    // JSON-RPC clients at runtime. Verified against mainnet — cast is safe.
    const parser = new TldParser(rpc as unknown as ConstructorParameters<typeof TldParser>[0]);
    const mainDomain = await parser.getMainDomain(walletAddress);
    if (!mainDomain?.domain || !mainDomain?.tld) {
      return null;
    }
    return mainDomain.domain + mainDomain.tld;
  } catch {
    return null;
  }
}

/**
 * Resolves any TLD domain to its owner's address using AllDomains
 *
 * @param rpc - Kit RPC client
 * @param domain - Full domain name including TLD (e.g., 'mydomain.abc')
 * @returns Owner's address as base58 string, or null if not found
 *
 * @example
 * ```typescript
 * const owner = await resolveAllDomain(rpc, 'mydomain.abc');
 * // Returns: 'AddressBase58...' or null
 * ```
 */
export async function resolveAllDomain(rpc: SolanaRpc, domain: string): Promise<string | null> {
  try {
    // @onsol/tldparser-kit pulls @solana/kit as a hard dependency (not a
    // peer, unlike sns-sdk-kit), so it carries its own private v5 copy. Its
    // Rpc<SolanaRpcApi> is structurally distinct from our root v7 Rpc at the
    // type level (the two package instances generate incompatible overload
    // intersections for getAccountInfo), even though both are plain
    // JSON-RPC clients at runtime. Verified against mainnet — cast is safe.
    const parser = new TldParser(rpc as unknown as ConstructorParameters<typeof TldParser>[0]);
    const owner = await parser.getOwnerFromDomainTld(domain);
    if (!owner) {
      return null;
    }
    return owner;
  } catch {
    return null;
  }
}

// ============================================================================
// Combined Functions (with fallback)
// ============================================================================

/**
 * Gets a domain name for a wallet address with fallback
 *
 * Tries AllDomains first, then falls back to SPL Name Service (.sol).
 * This provides the best chance of finding a domain for a given address.
 *
 * @param rpc - Kit RPC client
 * @param walletAddress - Wallet address to look up
 * @returns Domain name with extension, or null if not found
 *
 * @example
 * ```typescript
 * const domain = await getDomain(rpc, address('...'));
 * // Returns: 'mydomain.abc', 'mydomain.sol', or null
 * ```
 */
export async function getDomain(rpc: SolanaRpc, walletAddress: Address): Promise<string | null> {
  // Try AllDomains first (supports multiple TLDs)
  const allDomain = await getAllDomain(rpc, walletAddress);
  if (allDomain) {
    return allDomain;
  }

  // Fall back to SPL Name Service (.sol)
  return getSolDomain(rpc, walletAddress);
}

/**
 * Alias for getDomain - gets a domain name for a wallet address
 *
 * @param rpc - Kit RPC client
 * @param walletAddress - Wallet address to look up
 * @returns Domain name with extension, or null if not found
 */
export async function getDomainFromPublicKey(
  rpc: SolanaRpc,
  walletAddress: Address
): Promise<string | null> {
  return getDomain(rpc, walletAddress);
}

/**
 * Resolves a domain to its owner's address based on TLD
 *
 * Automatically detects the domain type:
 * - For .sol domains, uses SPL Name Service
 * - For other TLDs, uses AllDomains
 *
 * @param rpc - Kit RPC client
 * @param domain - Full domain name including TLD
 * @returns Owner's address as base58 string, or null if not found
 *
 * @example
 * ```typescript
 * // Resolves .sol domain
 * const owner1 = await getPublicKeyFromDomain(rpc, 'mydomain.sol');
 *
 * // Resolves other TLD domain
 * const owner2 = await getPublicKeyFromDomain(rpc, 'mydomain.abc');
 * ```
 */
export async function getPublicKeyFromDomain(
  rpc: SolanaRpc,
  domain: string
): Promise<string | null> {
  if (domain.endsWith('.sol')) {
    return resolveSolDomain(rpc, domain);
  }
  return resolveAllDomain(rpc, domain);
}
