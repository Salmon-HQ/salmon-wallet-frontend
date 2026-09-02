/**
 * URL Utilities
 * Migrated from salmon-wallet-v2/src/adapter/lib/url-utils.js
 *
 * Provides URL normalization for decentralized storage protocols:
 * - IPFS (ipfs://)
 * - Arweave (ar://)
 * - Various IPFS gateways (broken or private)
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * List of known dead/problematic domains that should be skipped entirely
 */
export const DEAD_DOMAINS = [
  'shdw-drive.genesysgo.net',
  'chexbacca.com',
  'cdn.bridgesplit.com',
  'lychee.pics',
  'img.hi-hi.vip',
];

/**
 * Patterns for broken/unreliable IPFS gateways that should be redirected
 */
const BROKEN_GATEWAY_PATTERNS = [
  // ipfs.io and dweb.link answer a browser's cross-site image request with a
  // 403 page carrying `Cross-Origin-Resource-Policy: same-origin` (a hotlink
  // guard keyed on Sec-Fetch headers), which Chrome reports as
  // ERR_BLOCKED_BY_RESPONSE — the side panel's NFT tiles came up blank while
  // expo-image, fetching natively, loaded the same PNG (2026-09-02).
  /https?:\/\/(?:www\.)?ipfs\.io\/ipfs\/(.+)/,
  /https?:\/\/(?:www\.)?dweb\.link\/ipfs\/(.+)/,
  /https?:\/\/(?:www\.)?cf-ipfs\.com\/ipfs\/(.+)/,
  /https?:\/\/(?:www\.)?cloudflare-ipfs\.com\/ipfs\/(.+)/,
  /https?:\/\/(?:www\.)?ipfs\.infura\.io\/ipfs\/(.+)/,
  /https?:\/\/gateway\.pinata\.cloud\/ipfs\/(.+)/,
  /https?:\/\/(?:www\.)?nftstorage\.link\/ipfs\/(.+)/,
];

/**
 * Pattern for private Pinata gateways (*.mypinata.cloud)
 */
const PINATA_PRIVATE_PATTERN = /https?:\/\/[^/]+\.mypinata\.cloud\/ipfs\/(.+)/;

/**
 * Pattern for subdomain-style IPFS URLs
 * e.g., QmXXX.ipfs.nftstorage.link, QmXXX.ipfs.dweb.link, QmXXX.ipfs.cf-ipfs.com
 */
const SUBDOMAIN_IPFS_PATTERN = /https?:\/\/([a-zA-Z0-9]+)\.ipfs\.([^/]+)\/?(.*)$/;

/**
 * Default IPFS gateway for normalized URLs — one that serves a browser's
 * cross-site `<img>` request (see BROKEN_GATEWAY_PATTERNS for the ones that
 * refuse it).
 * ponytail: one gateway; rotate through a second if filebase starts failing.
 */
const DEFAULT_IPFS_GATEWAY = 'https://ipfs.filebase.io/ipfs/';

/**
 * Default Arweave gateway for normalized URLs
 */
const DEFAULT_ARWEAVE_GATEWAY = 'https://arweave.net/';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Cleans an IPFS hash by removing query parameters and URL fragments
 * @param hash - The IPFS hash to clean
 * @returns Cleaned hash
 */
function cleanIpfsHash(hash: string): string {
  if (!hash) return hash;
  return hash.split('?')[0].split('#')[0];
}

/**
 * Check if URL contains a known dead domain
 * @param url - URL to check
 * @returns True if URL contains a dead domain
 */
function isDeadDomain(url: string): boolean {
  return DEAD_DOMAINS.some((domain) => url.includes(domain));
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Normalizes IPFS, Arweave, and other decentralized storage URLs to reliable HTTP gateways.
 * Combines functionality from fixIPFSUrl (token service) and normalizeIpfsUrl (NFT service).
 *
 * Handles:
 * - ipfs:// protocol URLs
 * - ar:// protocol URLs (Arweave)
 * - Common typos (e.g., arweeve.net -> arweave.net)
 * - Private Pinata gateways (*.mypinata.cloud)
 * - Broken/unreliable IPFS gateways
 * - Subdomain-style IPFS URLs
 * - Known dead domains (returns null)
 *
 * @param url - The URL to normalize
 * @returns Normalized HTTP URL, original URL if no transformation needed, or null for dead domains
 *
 * @example
 * // IPFS protocol
 * normalizeIpfsUrl('ipfs://QmXXX') // 'https://ipfs.filebase.io/ipfs/QmXXX'
 *
 * // Arweave protocol
 * normalizeIpfsUrl('ar://xxx') // 'https://arweave.net/xxx'
 *
 * // Broken gateway
 * normalizeIpfsUrl('https://cf-ipfs.com/ipfs/QmXXX') // 'https://ipfs.filebase.io/ipfs/QmXXX'
 *
 * // Dead domain
 * normalizeIpfsUrl('https://shdw-drive.genesysgo.net/xxx') // undefined
 */
export function normalizeIpfsUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;

  // Check for known dead domains - return undefined to skip these entirely
  if (isDeadDomain(url)) {
    return undefined;
  }

  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    const hash = url.replace(/^ipfs:\/\//, '');
    return `${DEFAULT_IPFS_GATEWAY}${hash}`;
  }

  // Handle ar:// protocol (Arweave)
  if (url.startsWith('ar://')) {
    const hash = url.replace(/^ar:\/\//, '');
    return `${DEFAULT_ARWEAVE_GATEWAY}${hash}`;
  }

  // Fix common typo: arweeve.net -> arweave.net
  if (url.includes('arweeve.net')) {
    return url.replace('arweeve.net', 'arweave.net');
  }

  // Handle private Pinata gateways (*.mypinata.cloud)
  const pinataMatch = url.match(PINATA_PRIVATE_PATTERN);
  if (pinataMatch) {
    const hash = cleanIpfsHash(pinataMatch[1]);
    return `${DEFAULT_IPFS_GATEWAY}${hash}`;
  }

  // Handle broken/unreliable IPFS gateways - redirect to the default gateway
  for (const pattern of BROKEN_GATEWAY_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      const hash = cleanIpfsHash(match[1]);
      return `${DEFAULT_IPFS_GATEWAY}${hash}`;
    }
  }

  // Handle subdomain-style IPFS URLs
  const subdomainMatch = url.match(SUBDOMAIN_IPFS_PATTERN);
  if (subdomainMatch) {
    const hash = subdomainMatch[1];
    const path = subdomainMatch[3] ? `/${subdomainMatch[3]}` : '';
    const cleanPath = path.split('?')[0].split('#')[0]; // Remove query params and fragments
    return `${DEFAULT_IPFS_GATEWAY}${hash}${cleanPath}`;
  }

  return url;
}

// ============================================================================
// Origin Formatting
// ============================================================================

/**
 * Extracts the hostname from a URL string.
 * Returns the original string if parsing fails.
 */
export function formatOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    return url.hostname || origin;
  } catch {
    return origin;
  }
}

// ============================================================================
// Blockchain Explorer URLs
// ============================================================================

/**
 * Get the Solana Explorer URL for a transaction
 *
 * @param signature - Transaction signature
 * @param networkId - Network ID (e.g., 'solana-mainnet', 'solana-devnet')
 * @returns Solana Explorer URL
 */
export function getExplorerUrl(signature: string, networkId: string): string {
  const cluster = networkId === 'solana-devnet' ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

/**
 * Get the Solscan URL for a transaction
 *
 * @param signature - Transaction signature
 * @param networkId - Network ID (e.g., 'solana-mainnet', 'solana-devnet')
 * @returns Solscan URL
 */
export function getSolscanUrl(signature: string, networkId: string): string {
  const cluster = networkId === 'solana-devnet' ? '?cluster=devnet' : '';
  return `https://solscan.io/tx/${signature}${cluster}`;
}
