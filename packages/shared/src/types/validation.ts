/**
 * Address-validation domain types.
 *
 * Canonical source of truth for validation types used across all blockchains.
 * Both Solana and Ethereum validation services import these types rather than
 * defining their own copies.
 *
 * @module types/validation
 */

// ============================================================================
// Validation result types (shared across all chains)
// ============================================================================

/**
 * Validation result type indicating success, warning, or error.
 */
export type ValidationResultType = 'SUCCESS' | 'WARNING' | 'ERROR';

/**
 * Validation result codes (superset of all chain-specific codes).
 *
 * Shared codes:
 * - 'valid' - Normal valid account/address
 * - 'no_info' - Valid address but no on-chain data
 * - 'invalid' - Invalid address format
 * - 'same_address' - Address matches the sender
 * - 'invalid_domain' - Domain could not be resolved
 * - 'sol_domain_paused' - A legacy `.sol` name SNS no longer resolves; use `.sns`
 *
 * Solana-specific:
 * - 'off_curve_no_funds' - Off-curve address (PDA) without funds
 * - 'off_curve_has_funds' - Off-curve address (PDA) with funds
 *
 * Ethereum-specific:
 * - 'no_funds' - Valid address but no ETH balance
 */
export type ValidationResultCode =
  | 'valid'
  | 'no_info'
  | 'invalid'
  | 'same_address'
  | 'invalid_domain'
  | 'sol_domain_paused'
  | 'network_error'
  // Solana-specific
  | 'off_curve_no_funds'
  | 'off_curve_has_funds'
  // Ethereum-specific
  | 'no_funds';

/**
 * Address type indicator.
 *
 * Shared:
 * - 'PUBLIC_KEY' - Solana public key
 * - 'ADDRESS' - Generic address
 * - 'DOMAIN' - Domain name (SNS, ENS, etc.)
 *
 * Bitcoin-specific:
 * - 'P2PKH' - Pay-to-Public-Key-Hash (legacy, starts with 1)
 * - 'P2SH' - Pay-to-Script-Hash (starts with 3)
 * - 'P2WPKH' - Pay-to-Witness-Public-Key-Hash (SegWit native, bc1q)
 * - 'P2WSH' - Pay-to-Witness-Script-Hash (bc1q, 32-byte witness)
 * - 'P2TR' - Pay-to-Taproot (bc1p)
 *
 * Ethereum-specific:
 * - 'EOA' - Externally Owned Account
 * - 'CONTRACT' - Smart contract address
 */
export type AddressType =
  | 'PUBLIC_KEY'
  | 'ADDRESS'
  | 'DOMAIN'
  // Bitcoin
  | 'P2PKH'
  | 'P2SH'
  | 'P2WPKH'
  | 'P2WSH'
  | 'P2TR'
  // Ethereum
  | 'EOA'
  | 'CONTRACT';

/**
 * Validation result returned by chain-specific validate functions.
 */
export interface ValidationResult {
  /** Result category: SUCCESS, WARNING, or ERROR */
  type: ValidationResultType;
  /** Specific result code */
  code: ValidationResultCode;
  /** Type of address that was validated (only present on success) */
  addressType?: AddressType;
  /** Resolved address (only present when domain is resolved) */
  resolvedAddress?: string;
  /** Balance in wei (Ethereum only) */
  balance?: bigint;
}

// ============================================================================
// Shared validation result constants
// ============================================================================

/**
 * Pre-built validation results shared across all chain-specific validators.
 *
 * Chain-specific validators should destructure what they need from this object
 * and keep chain-specific constants (e.g., VALID_ACCOUNT, OFF_CURVE_*) local.
 */
export const VALIDATION_RESULTS = {
  /** Valid domain address */
  VALID_DOMAIN: {
    type: 'SUCCESS' as const,
    code: 'valid' as const,
    addressType: 'DOMAIN' as const,
  } satisfies ValidationResult,

  /** Valid address but no on-chain data */
  NO_INFO: {
    type: 'WARNING' as const,
    code: 'no_info' as const,
  } satisfies ValidationResult,

  /** Invalid address format */
  INVALID_ADDRESS: {
    type: 'ERROR' as const,
    code: 'invalid' as const,
  } satisfies ValidationResult,

  /** Domain could not be resolved */
  INVALID_DOMAIN: {
    type: 'ERROR' as const,
    code: 'invalid_domain' as const,
  } satisfies ValidationResult,

  /** A legacy `.sol` name SNS has paused; the same name resolves as `.sns` */
  SOL_DOMAIN_PAUSED: {
    type: 'ERROR' as const,
    code: 'sol_domain_paused' as const,
  } satisfies ValidationResult,
  /** Network or RPC error during validation */
  NETWORK_ERROR: {
    type: 'ERROR' as const,
    code: 'network_error' as const,
  } satisfies ValidationResult,
};

// ============================================================================
// Hook-level validation types
// ============================================================================

/**
 * Validation state for the input address.
 */
export type ValidationState = 'idle' | 'loading' | 'valid' | 'invalid' | 'warning';

/**
 * Validation callback result passed to onValidation.
 */
export interface ValidationCallbackResult {
  /** Whether the address is valid */
  isValid: boolean;
  /** The validation state */
  state: ValidationState;
  /** The full validation result from the blockchain service */
  result: ValidationResult | null;
  /** Resolved public key (for domain addresses) */
  resolvedAddress?: string;
  /** Whether the input is a domain name */
  isDomain?: boolean;
}
