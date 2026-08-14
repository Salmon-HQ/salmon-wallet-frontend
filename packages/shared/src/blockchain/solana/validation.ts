/**
 * Solana Validation Service
 * Migrated from salmon-wallet-v2/src/adapter/services/solana/solana-validation-service.js
 *
 * Provides validation for Solana addresses and domain names.
 * Supports both standard public keys and domain resolution via:
 * - SNS SDK Kit (.sol domains)
 * - AllDomains TLD Parser Kit (other TLDs)
 *
 * Features:
 * - Public key validation (format and on-curve check)
 * - Account existence verification
 * - Domain name resolution
 * - Comprehensive validation result codes
 */

import { isAddress, isOffCurveAddress, address as toAddress } from '@solana/addresses';
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';
import { getPublicKeyFromDomain } from './domains';
import type { SolanaRpc } from './networks';
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
const { VALID_DOMAIN, NO_INFO, INVALID_ADDRESS, INVALID_DOMAIN, NETWORK_ERROR } =
  VALIDATION_RESULTS;

// Chain-specific constants
const VALID_ACCOUNT: ValidationResult = {
  type: 'SUCCESS',
  code: 'valid',
  addressType: 'PUBLIC_KEY',
};

const OFF_CURVE_NO_FUNDS: ValidationResult = {
  type: 'SUCCESS',
  code: 'off_curve_no_funds',
  addressType: 'PUBLIC_KEY',
};

const OFF_CURVE_HAS_FUNDS: ValidationResult = {
  type: 'SUCCESS',
  code: 'off_curve_has_funds',
  addressType: 'PUBLIC_KEY',
};

// ============================================================================
// Internal Helper Functions
// ============================================================================

// @solana-program/token does not load against @solana/kit@7 (see transfer.ts),
// so the classic SPL Token program id is declared locally.
const TOKEN_PROGRAM_ADDRESS = toAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

/**
 * Checks whether a wallet owns at least one SPL token account.
 *
 * A wallet whose system account was deallocated (all SOL spent) can still be
 * an active wallet: its token accounts carry their own rent and survive.
 * Without this check such wallets are reported as "does not exist on-chain".
 *
 * @param rpc - Kit RPC client
 * @param owner - Wallet address to check
 * @returns True if the wallet owns any token account (classic or Token-2022)
 */
async function hasTokenAccounts(rpc: SolanaRpc, owner: string): Promise<boolean> {
  try {
    const ownerAddress = toAddress(owner);
    const results = await Promise.all(
      [TOKEN_PROGRAM_ADDRESS, TOKEN_2022_PROGRAM_ADDRESS].map((programId) =>
        rpc
          .getTokenAccountsByOwner(
            ownerAddress,
            { programId },
            { encoding: 'base64', dataSlice: { offset: 0, length: 0 } }
          )
          .send()
      )
    );
    return results.some((response) => response.value.length > 0);
  } catch {
    // Conservative fallback: keep the pre-existing NO_INFO warning path.
    return false;
  }
}

/**
 * Checks if a string is a valid Solana address
 *
 * @param address - String to check
 * @returns True if the string is a valid address
 */
function isPublicKey(address: string): boolean {
  return isAddress(address);
}

/**
 * Checks if an address looks like a domain name
 *
 * @param address - String to check
 * @returns True if the address appears to be a domain
 */
function isDomainLike(address: string): boolean {
  // Domain names typically contain a dot and are not valid addresses
  return address.includes('.') && !isPublicKey(address);
}

/**
 * Validates a Solana address
 *
 * Performs the following checks:
 * 1. Valid address format
 * 2. On-curve check (distinguishes regular addresses from PDAs)
 * 3. Account existence and balance check
 *
 * @param rpc - Kit RPC client
 * @param address - Address string to validate
 * @returns Validation result
 */
async function validatePublicKey(rpc: SolanaRpc, address: string): Promise<ValidationResult> {
  if (!isAddress(address)) {
    return INVALID_ADDRESS;
  }

  const isOnCurve = !isOffCurveAddress(address);

  // Get account info to check existence and balance
  let accountInfo;
  try {
    const response = await rpc.getAccountInfo(address, { encoding: 'base64' }).send();
    accountInfo = response.value;
  } catch {
    return NETWORK_ERROR;
  }

  if (isOnCurve) {
    // Regular on-curve address
    if (accountInfo === null || accountInfo.lamports === 0n) {
      // No system account, but the wallet may still be active: token accounts
      // survive when all SOL is spent and the system account is deallocated.
      return (await hasTokenAccounts(rpc, address)) ? VALID_ACCOUNT : NO_INFO;
    }
    return VALID_ACCOUNT;
  } else {
    // Off-curve address (PDA)
    if (accountInfo === null || accountInfo.lamports === 0n) {
      return OFF_CURVE_NO_FUNDS;
    }
    return OFF_CURVE_HAS_FUNDS;
  }
}

/**
 * Validates and resolves a domain name
 *
 * Uses the domain resolution functions from ./domains module which support:
 * - SNS SDK Kit for .sol domains
 * - AllDomains TLD Parser Kit for other TLDs
 *
 * @param rpc - Kit RPC client
 * @param domain - Domain name to validate and resolve
 * @returns Validation result with resolved address if successful
 */
async function validateDomain(rpc: SolanaRpc, domain: string): Promise<ValidationResult> {
  let resolvedAddress;
  try {
    resolvedAddress = await getPublicKeyFromDomain(rpc, domain);
  } catch {
    return NETWORK_ERROR;
  }

  if (resolvedAddress) {
    return {
      ...VALID_DOMAIN,
      resolvedAddress,
    };
  }

  return INVALID_DOMAIN;
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Validates a destination account address
 *
 * This is the main validation function that handles both public keys and domain names.
 * It automatically detects the input type and routes to the appropriate validation.
 *
 * @param rpc - Kit RPC client for on-chain lookups
 * @param address - Address string to validate (public key or domain)
 * @returns Validation result with type, code, and optional address info
 *
 * @example
 * ```typescript
 * // Validate a public key
 * const result = await validateDestinationAccount(rpc, 'ABC123...');
 * if (result.type === 'SUCCESS') {
 *   console.log('Valid address:', result.addressType);
 * }
 *
 * // Validate a domain
 * const result = await validateDestinationAccount(rpc, 'example.sol');
 * if (result.type === 'SUCCESS' && result.resolvedAddress) {
 *   console.log('Resolved to:', result.resolvedAddress);
 * }
 * ```
 */
export async function validateDestinationAccount(
  rpc: SolanaRpc,
  address: string
): Promise<ValidationResult> {
  if (!address || address.trim() === '') {
    return INVALID_ADDRESS;
  }

  const trimmedAddress = address.trim();

  // Determine if input is a public key or domain
  if (isPublicKey(trimmedAddress)) {
    return validatePublicKey(rpc, trimmedAddress);
  }

  if (isDomainLike(trimmedAddress)) {
    return validateDomain(rpc, trimmedAddress);
  }

  // Neither a valid public key nor a domain-like string
  return INVALID_ADDRESS;
}
