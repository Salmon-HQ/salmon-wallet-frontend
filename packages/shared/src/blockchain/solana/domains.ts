/**
 * Solana Domain Name Services
 * Migrated from salmon-wallet-v2:
 * - src/adapter/services/solana/solana-name-service.js
 * - src/adapter/services/solana/alldomains-name-service.js
 *
 * Provides functionality for resolving Solana domain names:
 * - SNS (.sns domains, and legacy .sol, via @solana-name-service/sns-sdk-kit)
 * - AllDomains (multiple TLDs via @onsol/tldparser-kit)
 *
 * SNS moved its TLD from .sol to .sns (dev.sns.id/docs/migration). An SNS
 * name is displayed as `name.sns`; a typed `name.sol` still resolves through
 * the SDK's legacy path until finalized slot 452,825,395, after which the
 * SDK refuses it and `resolveSnsDomain` throws `SolDomainPausedError` so the
 * UI can point at `.sns`.
 */

import type { Address } from '@solana/kit';
import { getPrimaryDomain, resolve, UnsupportedTldError } from '@solana-name-service/sns-sdk-kit';
import { TldParser } from '@onsol/tldparser-kit';
import type { SolanaRpc } from './networks';

// ============================================================================
// SNS (.sns domains, legacy .sol)
// ============================================================================

const SNS_TLD = '.sns';
const LEGACY_SOL_TLD = '.sol';

/** True for the two suffixes SNS resolves: the current `.sns` and the legacy `.sol`. */
export function isSnsDomain(domain: string): boolean {
  return domain.endsWith(SNS_TLD) || domain.endsWith(LEGACY_SOL_TLD);
}

/**
 * Thrown by `resolveSnsDomain` when a `.sol` name is refused because SNS has
 * paused legacy resolution (from finalized slot 452,825,395). The same name
 * is expected to resolve as `.sns`.
 */
export class SolDomainPausedError extends Error {
  constructor(domain: string) {
    super(`SNS paused .sol resolution; try ${domain.slice(0, -LEGACY_SOL_TLD.length)}${SNS_TLD}`);
    this.name = 'SolDomainPausedError';
  }
}

/**
 * Gets the SNS primary domain for a wallet address, as `name.sns`.
 *
 * @param rpc - Kit RPC client
 * @param walletAddress - Wallet address to look up
 * @returns Domain name with .sns extension, or null if not found
 *
 * @example
 * ```typescript
 * const domain = await getSnsDomain(rpc, address('...'));
 * // Returns: 'mydomain.sns' or null
 * ```
 */
export async function getSnsDomain(rpc: SolanaRpc, walletAddress: Address): Promise<string | null> {
  try {
    const favorite = await getPrimaryDomain({ rpc, walletAddress });
    if (!favorite?.domainName) {
      return null;
    }
    return favorite.domainName + SNS_TLD;
  } catch {
    return null;
  }
}

/**
 * Resolves an SNS domain to its owner's address.
 *
 * A bare name gets `.sns`; `name.sns` and `name.sol` are passed as typed, so
 * the SDK decides how a legacy `.sol` name is served during the transition.
 *
 * @param rpc - Kit RPC client
 * @param domain - Domain name (`name`, `name.sns` or `name.sol`)
 * @returns Owner's address as base58 string, or null if not found
 * @throws SolDomainPausedError when a `.sol` name is refused after the pause
 */
export async function resolveSnsDomain(rpc: SolanaRpc, domain: string): Promise<string | null> {
  const fullName = isSnsDomain(domain) ? domain : domain + SNS_TLD;
  try {
    const owner = await resolve({ rpc, domain: fullName });
    if (!owner) {
      return null;
    }
    return owner;
  } catch (error) {
    if (error instanceof UnsupportedTldError && fullName.endsWith(LEGACY_SOL_TLD)) {
      throw new SolDomainPausedError(fullName);
    }
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
 * Tries AllDomains first, then falls back to SNS (.sns).
 * This provides the best chance of finding a domain for a given address.
 *
 * @param rpc - Kit RPC client
 * @param walletAddress - Wallet address to look up
 * @returns Domain name with extension, or null if not found
 *
 * @example
 * ```typescript
 * const domain = await getDomain(rpc, address('...'));
 * // Returns: 'mydomain.abc', 'mydomain.sns', or null
 * ```
 */
export async function getDomain(rpc: SolanaRpc, walletAddress: Address): Promise<string | null> {
  // Try AllDomains first (supports multiple TLDs)
  const allDomain = await getAllDomain(rpc, walletAddress);
  if (allDomain) {
    return allDomain;
  }

  // Fall back to SNS (.sns)
  return getSnsDomain(rpc, walletAddress);
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
 * - For .sns and legacy .sol domains, uses SNS
 * - For other TLDs, uses AllDomains
 *
 * @param rpc - Kit RPC client
 * @param domain - Full domain name including TLD
 * @returns Owner's address as base58 string, or null if not found
 * @throws SolDomainPausedError when a `.sol` name is refused after the pause
 *
 * @example
 * ```typescript
 * // Resolves .sns domain
 * const owner1 = await getPublicKeyFromDomain(rpc, 'mydomain.sns');
 *
 * // Resolves other TLD domain
 * const owner2 = await getPublicKeyFromDomain(rpc, 'mydomain.abc');
 * ```
 */
export async function getPublicKeyFromDomain(
  rpc: SolanaRpc,
  domain: string
): Promise<string | null> {
  if (isSnsDomain(domain)) {
    return resolveSnsDomain(rpc, domain);
  }
  return resolveAllDomain(rpc, domain);
}
