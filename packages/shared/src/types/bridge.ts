/**
 * Bridge domain types.
 *
 * @module types/bridge
 */

// ============================================================================
// Hook/UI types
// ============================================================================

/**
 * Status of the bridge operation.
 */
export type BridgeOperationStatus =
  | 'idle'
  | 'loading-tokens'
  | 'getting-estimate'
  | 'creating-exchange'
  | 'exchange-created'
  | 'checking-status'
  | 'success'
  | 'failed';

/**
 * Estimate result with minimum amount.
 */
export interface BridgeEstimate {
  /** Estimated output amount */
  estimatedAmount: number;
  /** Minimum required input amount */
  minAmount: number;
  /** Maximum allowed input amount; null/undefined when the pair has no cap */
  maxAmount?: number | null;
  /** Input symbol */
  symbolIn: string;
  /** Output symbol */
  symbolOut: string;
}

// ============================================================================
// API types (moved from api/services/bridge.ts)
// ============================================================================

/**
 * Supported bridge token information
 */
export interface BridgeToken {
  /** Token symbol (e.g., 'BTC', 'ETH', 'SOL') */
  symbol: string;
  /** Token name */
  name: string;
  /** Network/chain the token is on */
  network?: string;
  /** Token logo URL (returned as "logo" by StealthEX API) */
  logo?: string;
  /** Whether the token is enabled for bridging */
  enabled?: boolean;
  /** Minimum amount for bridging */
  minAmount?: number;
  /** Maximum amount for bridging */
  maxAmount?: number;
}

/**
 * Available token for bridging to/from a specific token
 */
export interface BridgeAvailableToken {
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Network/chain identifier from upstream provider (e.g. "base", null for native cross-chain). */
  network?: string | null;
  /** Canonical lowercase chain identifier resolved by the backend (e.g. "bitcoin", "ethereum", "solana"). */
  chain?: string | null;
  /** Token logo URL (returned as "logo" by StealthEX API) */
  logo?: string;
  /** Whether this pair is currently available */
  available?: boolean;
  /** Whether the deposit address requires an extra id (memo/tag/destination tag). */
  has_extra_id?: boolean;
  /** Human-readable label for the extra id field, when present. */
  extra_id?: string | null;
  /** Provider-supplied warnings about depositing this token (e.g. min-confirmations notices). */
  warnings_from?: string[] | null;
  /** Provider-supplied warnings about receiving this token. */
  warnings_to?: string[] | null;
  /** Regex used by upstream to validate destination addresses for this token, when supplied. */
  validation_address?: string | null;
  /** Regex used by upstream to validate the extra id for this token, when supplied. */
  validation_extra?: string | null;
  /** Address explorer template URL (e.g. "https://blockstream.info/address/{}"). */
  address_explorer?: string | null;
  /** Transaction explorer template URL. */
  tx_explorer?: string | null;
}

/**
 * Featured bridge token pair
 */
export interface BridgeFeaturedToken {
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Network/chain identifier */
  network?: string;
  /** Token logo URL (returned as "logo" by StealthEX API) */
  logo?: string;
  /** Popularity rank */
  rank?: number;
}

/**
 * Estimated amount response from bridge
 */
export interface BridgeEstimateResponse {
  /** Estimated output amount */
  estimated_amount: number;
  /** Input symbol */
  from?: string;
  /** Output symbol */
  to?: string;
  /** Exchange rate */
  rate?: number;
}

/**
 * Minimal amount response from bridge.
 *
 * Wire contract (salmon-api `GET /v1/bridge/minimal`): both amounts arrive as
 * decimal STRINGS (StealthEX sends strings, e.g. "0.39359748097612175282"),
 * and `max_amount` is additive — omitted when the pair has no upstream cap.
 * Convention: the service boundary (`getBridgeMinimalAmount`) coerces both
 * fields with `Number()` + NaN guard, so the rest of the app only ever sees
 * numbers (`null` when absent or unparsable).
 */
export interface BridgeMinimalResponse {
  /** Minimum required input amount (decimal string) */
  min_amount: string;
  /** Maximum allowed input amount (decimal string); omitted when the pair has no cap */
  max_amount?: string;
  /** Input symbol */
  from?: string;
  /** Output symbol */
  to?: string;
}

/**
 * Pair amount range coerced to numbers at the service boundary.
 * `null` means the value is absent or unparsable — `max: null` is the
 * "no upstream cap" case and must not block anything.
 */
export interface BridgeAmountRange {
  /** Minimum required input amount, or null when unavailable */
  min: number | null;
  /** Maximum allowed input amount, or null when the pair has no cap */
  max: number | null;
}

/**
 * Bridge exchange creation response
 */
export interface BridgeExchange {
  /** Unique exchange ID */
  id: string;
  /** Input token symbol */
  currencyFrom: string;
  /** Output token symbol */
  currencyTo: string;
  /** Input amount */
  amountExpectedFrom: number;
  /** Expected output amount */
  amountExpectedTo: number;
  /** Deposit address to send tokens to */
  payinAddress: string;
  /** Extra ID for deposit (memo/tag) if required */
  payinExtraId?: string;
  /** Address where output tokens will be sent */
  payoutAddress: string;
  /** Extra ID for payout if required */
  payoutExtraId?: string;
  /** Exchange status */
  status: string;
  /** Creation timestamp */
  createdAt?: string;
}

/**
 * Possible bridge transaction statuses.
 *
 * The backend (`bridge-aggregator` capability, "Status normalization"
 * table) normalizes upstream StealthEX values into this closed set
 * before the FE ever sees them: `waiting | confirming | exchanging
 * | sending | verifying` -> `'inProgress'`, `finished` -> `'success'`,
 * `failed` -> `'fail'`, `refunded` -> `'refunded'`, anything else ->
 * `'unknown'`.
 */
export type BridgeTransactionStatus = 'inProgress' | 'success' | 'fail' | 'refunded' | 'unknown';

/**
 * Bridge transaction status response
 */
export interface BridgeTransaction {
  /** Unique transaction ID */
  id: string;
  /** Input token symbol */
  currencyFrom: string;
  /** Output token symbol */
  currencyTo: string;
  /** Network fee */
  networkFee?: number;
  /** Input amount expected */
  amountExpectedFrom?: number;
  /** Output amount expected */
  amountExpectedTo?: number;
  /** Actual input amount received */
  amountFrom?: number;
  /** Actual output amount sent */
  amountTo?: number;
  /** Deposit address */
  payinAddress: string;
  /** Deposit extra ID (memo/tag) */
  payinExtraId?: string;
  /** Deposit transaction hash */
  payinHash?: string;
  /** Payout address */
  payoutAddress: string;
  /** Payout extra ID */
  payoutExtraId?: string;
  /** Payout transaction hash */
  payoutHash?: string;
  /** Current transaction status */
  status: BridgeTransactionStatus;
  /** Creation timestamp */
  createdAt?: string;
  /** Last update timestamp */
  updatedAt?: string;
}
