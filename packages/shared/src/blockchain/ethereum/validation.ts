/**
 * Ethereum Validation Service
 * Migrated from salmon-wallet-v2/src/adapter/services/ethereum/ethereum-validation-service.js
 *
 * Provides validation for Ethereum addresses and ENS domain names.
 * Supports both standard addresses and ENS resolution.
 *
 * Features:
 * - Address format validation (checksum and non-checksum)
 * - Balance checking for addresses
 * - ENS domain resolution (.eth, .xyz, etc.)
 * - Comprehensive validation result codes
 */

import { isAddress, type Provider } from 'ethers';
import type {
  ValidationResult,
  ValidationResultType,
  ValidationResultCode,
  AddressType,
} from '../../types/validation';
import { VALIDATION_RESULTS } from '../../types/validation';

export type { ValidationResult, ValidationResultType, ValidationResultCode, AddressType };

// ============================================================================
// Result Constants
// ============================================================================

// Shared constants from types/validation
const { VALID_DOMAIN, NO_INFO, INVALID_ADDRESS, INVALID_DOMAIN } = VALIDATION_RESULTS;

// Chain-specific constants
const VALID_ACCOUNT: ValidationResult = {
  type: 'SUCCESS',
  code: 'valid',
  addressType: 'ADDRESS',
};

const NO_FUNDS: ValidationResult = {
  type: 'SUCCESS',
  code: 'no_funds',
  addressType: 'ADDRESS',
};

// ============================================================================
// ENS TLD Patterns
// ============================================================================

/**
 * Common ENS-compatible TLDs
 * .eth is the primary ENS TLD, but ENS also supports other DNS TLDs
 */
const ENS_TLDS = ['.eth', '.xyz', '.luxe', '.kred', '.art', '.club'];

// ============================================================================
// Internal Helper Functions
// ============================================================================

/**
 * Checks if a string is a valid Ethereum address
 *
 * @param address - String to check
 * @returns True if the string is a valid Ethereum address
 */
export function isEthereumAddress(address: string): boolean {
  return isAddress(address);
}

/**
 * Checks if an input looks like an ENS domain
 *
 * @param input - String to check
 * @returns True if the input appears to be an ENS domain
 */
export function isEnsDomain(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const lowercased = input.toLowerCase();

  // Check for ENS-compatible TLDs
  for (const tld of ENS_TLDS) {
    if (lowercased.endsWith(tld)) {
      return true;
    }
  }

  // Also check for any domain-like pattern (contains . but is not an address)
  return input.includes('.') && !isEthereumAddress(input);
}

/**
 * Validates an Ethereum address and checks its balance
 *
 * @param provider - Ethers provider for on-chain lookups
 * @param address - Ethereum address to validate
 * @returns Validation result with balance information
 */
async function validateAddress(provider: Provider, address: string): Promise<ValidationResult> {
  try {
    const balance = await provider.getBalance(address);

    if (balance === 0n) {
      return {
        ...NO_FUNDS,
        balance,
      };
    }

    return {
      ...VALID_ACCOUNT,
      balance,
    };
  } catch {
    // If we can't get balance, return no_info as a warning
    return NO_INFO;
  }
}

/**
 * Validates and resolves an ENS domain
 *
 * @param provider - Ethers provider for ENS resolution
 * @param domain - ENS domain to validate and resolve
 * @returns Validation result with resolved address if successful
 */
async function validateDomain(provider: Provider, domain: string): Promise<ValidationResult> {
  try {
    const resolvedAddress = await provider.resolveName(domain);

    if (resolvedAddress) {
      return {
        ...VALID_DOMAIN,
        resolvedAddress,
      };
    }

    return INVALID_DOMAIN;
  } catch {
    return INVALID_DOMAIN;
  }
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Validates a destination account address
 *
 * This is the main validation function that handles both Ethereum addresses
 * and ENS domain names. It automatically detects the input type and routes
 * to the appropriate validation.
 *
 * @param provider - Ethers provider for on-chain lookups and ENS resolution
 * @param address - Address string to validate (Ethereum address or ENS domain)
 * @returns Validation result with type, code, and optional address info
 *
 * @example
 * ```typescript
 * import { JsonRpcProvider } from 'ethers';
 *
 * const provider = new JsonRpcProvider('https://mainnet.infura.io/v3/...');
 *
 * // Validate an Ethereum address
 * const result = await validateDestinationAccount(provider, '0x742d35Cc6634C0532925a3b844Bc9e7595f35b32');
 * if (result.type === 'SUCCESS') {
 *   console.log('Valid address, balance:', result.balance);
 * }
 *
 * // Validate an ENS domain
 * const result = await validateDestinationAccount(provider, 'vitalik.eth');
 * if (result.type === 'SUCCESS' && result.resolvedAddress) {
 *   console.log('Resolved to:', result.resolvedAddress);
 * }
 * ```
 */
export async function validateDestinationAccount(
  provider: Provider,
  address: string
): Promise<ValidationResult> {
  if (!address || address.trim() === '') {
    return INVALID_ADDRESS;
  }

  const trimmedAddress = address.trim();

  // Check if input is an Ethereum address
  if (isEthereumAddress(trimmedAddress)) {
    return validateAddress(provider, trimmedAddress);
  }

  // Check if input looks like an ENS domain
  if (isEnsDomain(trimmedAddress)) {
    return validateDomain(provider, trimmedAddress);
  }

  // Neither a valid address nor a domain-like string
  return INVALID_ADDRESS;
}
