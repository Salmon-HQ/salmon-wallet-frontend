/**
 * Shared Swap Types
 *
 * All swap-related type definitions consolidated in one place.
 * Separates type definitions from business logic (blockchain/solana/swap.ts).
 */

import type { SolanaNetworkId, BlockchainType } from './blockchain';

// ============================================================================
// Network & Chain Types
// ============================================================================

/**
 * Network ID for swap operations
 */
export type SwapNetworkId = SolanaNetworkId;

/**
 * Chain type for unified swap/bridge.
 * Alias of the canonical BlockchainType.
 */
export type SwapChainType = BlockchainType;

// ============================================================================
// Swap Status & Quote Params (previously in useSwap hook)
// ============================================================================

/**
 * Status of the swap operation.
 */
export type SwapStatus =
  'idle' | 'getting-quote' | 'quote-ready' | 'executing' | 'success' | 'failed';

/**
 * Parameters for getting a swap quote.
 */
export interface GetQuoteParams {
  /** Input token mint address */
  inputMint: string;
  /** Output token mint address */
  outputMint: string;
  /** Amount in human-readable format (e.g., 1.5 for 1.5 SOL) */
  amount: number;
  /** Slippage tolerance in basis points (default: 50 = 0.5%) */
  slippageBps?: number;
  /** Input token decimals (optional, fetched if not provided) */
  inputDecimals?: number;
  /** Swap mode (default: 'ExactIn') */
  swapMode?: 'ExactIn' | 'ExactOut';
  /** Use dynamic slippage */
  dynamicSlippage?: boolean;
  /** Priority fee level */
  priorityLevel?: 'none' | 'low' | 'medium' | 'high' | 'veryHigh';
}

/**
 * Parsed quote information for UI display.
 */
export interface ParsedQuoteInfo {
  /** Expected output amount (human-readable) */
  expectedOutput: number;
  /** Minimum output after slippage (human-readable) */
  minimumOutput: number;
  /** Price impact percentage */
  priceImpact: number;
  /** Input token info */
  inputToken?: {
    symbol: string;
    name: string;
    decimals: number;
    logo?: string | null;
  };
  /** Output token info */
  outputToken?: {
    symbol: string;
    name: string;
    decimals: number;
    logo?: string | null;
  };
  /** Route information */
  route: {
    /** Slippage in basis points */
    slippageBps: number;
    /** Swap mode */
    swapMode: 'ExactIn' | 'ExactOut';
    /** Route plan labels */
    routeLabels: string[];
  };
}

// ============================================================================
// Blockchain-level swap params & result (used by hooks)
// ============================================================================

/**
 * Parameters for requesting a swap quote at the blockchain level.
 * Includes publicKey for transaction signing (unlike GetQuoteParams which is hook-level).
 */
export interface SwapQuoteParams {
  /** Input token mint address (use SOL_ADDRESS for native SOL) */
  inputMint: string;
  /** Output token mint address (use SOL_ADDRESS for native SOL) */
  outputMint: string;
  /** Amount to swap in human-readable format (will be converted using decimals) */
  amount: number;
  /** Public key of the wallet performing the swap */
  publicKey: string;
  /** Slippage tolerance in basis points (optional, default: 50 = 0.5%) */
  slippageBps?: number;
  /** Swap mode (optional, default: 'ExactIn') */
  swapMode?: 'ExactIn' | 'ExactOut';
  /** Use dynamic slippage (optional) */
  dynamicSlippage?: boolean;
  /** Priority fee level (optional) */
  priorityLevel?: 'none' | 'low' | 'medium' | 'high' | 'veryHigh';
}

/**
 * Result of a swap operation.
 */
export interface SwapResult {
  /** Transaction ID (signature) */
  txId: string | null;
  /** Swap status */
  status: 'success' | 'fail';
  /** Error message if swap failed */
  error?: string;
  /** Confirmation status from the network */
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
}

/**
 * Options for swap quote request.
 */
export interface GetSwapQuoteOptions {
  /** Token decimals (if known, avoids token list lookup) */
  inputDecimals?: number;
}

// ============================================================================
// Backend API Response Types
// ============================================================================

/**
 * Swap order response from backend API
 * Represents the raw response from /v1/{networkId}/ft/swap/order
 */
export interface SwapOrderResponse {
  /** DEX labels for each hop in the route (e.g., ['Orca', 'Raydium']) */
  routeNames: string[];
  /** Token symbols along the route (e.g., ['SOL', 'USDC']) */
  routeSymbols: string[];
  /** Fee information calculated by backend */
  fee: {
    /** Fee amount in lamports (for SOL) */
    amount: number;
    /** Fee token decimals (9 for SOL) */
    decimals: number;
    /** Fee token symbol (usually 'SOL') */
    symbol: string;
    /** Fee as percentage (e.g., 0.5 for 0.5%) */
    percent: number;
  };
  /** Input token details */
  input: {
    /** Input amount (raw, with decimals) */
    amount: string;
    /** Token decimals */
    decimals: number;
    /** Token symbol */
    symbol: string;
    /** Token name */
    name?: string;
    /** Token logo URL */
    logo?: string;
    /** Token mint address */
    contract?: string;
  };
  /** Output token details */
  output: {
    /** Expected output amount (raw, with decimals) */
    amount: string;
    /** Token decimals */
    decimals: number;
    /** Token symbol */
    symbol: string;
    /** Token name */
    name?: string;
    /** Token logo URL */
    logo?: string;
    /** Token mint address */
    contract?: string;
  };
  /** Custom fields from Jupiter Ultra API v1 */
  custom: {
    /** Base64 encoded unsigned transaction */
    transaction: string;
    /** Request ID for execute endpoint (REQUIRED) */
    requestId: string;
    /** Router used (e.g., 'iris', 'jupiterz', 'dflow', 'okx') */
    router: string;
    /** Price impact as percentage (e.g., 0.5 for 0.5%) */
    priceImpact: number;
    /** Total fees in basis points (e.g., 50 for 0.5%) */
    feeBps: number;
    /** Priority fee in lamports */
    prioritizationFeeLamports: number;
    /** Rent fee in lamports */
    rentFeeLamports: number;
    /** Whether swap is gasless */
    gasless: boolean;
    /** Slippage tolerance in basis points */
    slippageBps: number;
    /** Swap mode ('ExactIn' or 'ExactOut') */
    swapMode: string;
    /** Minimum output amount after slippage (raw, with decimals) */
    otherAmountThreshold: string;
    /** Input amount in USD */
    inUsdValue?: number;
    /** Output amount in USD */
    outUsdValue?: number;
  };
}

/**
 * Parameters for requesting a swap quote from the API.
 *
 * Exactly one of `amount` (smallest-unit raw string) or `uiAmount`
 * (human-readable decimal string) must be provided. When `uiAmount` is
 * sent, salmon-api resolves the input mint's decimals from the Jupiter
 * v2 catalog server-side. When `amount` is sent, it is forwarded to
 * Jupiter unchanged (legacy path for callers that already know the
 * decimals).
 */
export interface SwapOrderParams {
  /** Input token mint address */
  inputMint: string;
  /** Output token mint address */
  outputMint: string;
  /** Amount to swap (raw, with decimals) — mutually exclusive with `uiAmount` */
  amount?: string;
  /** Human-readable amount (e.g. `"1.5"`) — BE resolves decimals via Jupiter v2 */
  uiAmount?: string;
  /** User's public key */
  publicKey: string;
  /** Slippage tolerance in basis points (optional, default: 50 = 0.5%) */
  slippageBps?: number;
  /** Swap mode (optional, default: 'ExactIn') */
  swapMode?: 'ExactIn' | 'ExactOut';
  /** Use dynamic slippage (optional) */
  dynamicSlippage?: boolean;
  /** Priority fee level (optional) */
  priorityLevel?: 'none' | 'low' | 'medium' | 'high' | 'veryHigh';
}

/**
 * Request body for executing a swap
 */
export interface SwapExecuteRequest {
  /** Signed transaction (base64 encoded) */
  signedTransaction: string;
  /** Request ID from the quote response */
  requestId: string;
}

/**
 * Response from executing a swap via API
 */
export interface ApiSwapExecuteResponse {
  /** Transaction signature */
  signature: string;
  /** Whether the swap was successful: "Success" or "Failed" */
  status: string;
  /** Error message if swap failed */
  error?: string;
  /** Confirmation status */
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
  /** Slot number */
  slot?: number;
  /** Total input amount */
  totalInputAmount?: number;
  /** Total output amount */
  totalOutputAmount?: number;
  /** Actual input amount result */
  inputAmountResult?: number;
  /** Actual output amount result */
  outputAmountResult?: number;
  /** Swap events from the backend */
  swapEvents?: unknown[];
  /** Response code */
  code?: string;
}

/**
 * Swap quote - wraps API response with additional context
 */
export interface SwapQuote extends SwapOrderResponse {
  /** Network ID used for this quote */
  networkId: SwapNetworkId;
}

// ============================================================================
// UI Types
// ============================================================================

/**
 * Token data for swap operations (UI representation)
 */
export interface SwapToken {
  /** Token mint address */
  address: string;
  /** Token symbol (e.g., "SOL", "USDC") */
  symbol: string;
  /** Token name */
  name?: string;
  /** Token decimals */
  decimals: number;
  /** Token logo URL */
  logo?: string;
  /** User's balance of this token */
  balance?: number;
  /** USD price per token */
  usdPrice?: number;
  /** Chain this token belongs to (for unified swap/bridge) */
  chain?: SwapChainType;
  /** Network ID (e.g., 'solana-mainnet', 'bitcoin-mainnet', 'ethereum-mainnet') */
  networkId?: string;
}

/**
 * Active tab in swap screen
 */
export type SwapTab = 'swap' | 'bridge';

/**
 * Current step in swap flow (base type)
 */
export type SwapStepBase = 'input' | 'review' | 'processing' | 'success' | 'error';

/**
 * Full step type for SwapScreen (includes bridge recipient step)
 */
export type SwapScreenStep = SwapStepBase | 'recipient';

/**
 * Bridge token type (simplified for SwapScreen integration)
 */
export interface BridgeTokenSimple {
  /** Token symbol (e.g., "SOL", "ETH", "USDC") */
  symbol: string;
  /** Token name */
  name: string;
  /** Token logo URL */
  logo?: string;
  /** Network/chain this token is on (may be null for native cross-chain tokens) */
  network?: string | null;
  /** Canonical chain (e.g. "bitcoin", "ethereum") provided by the backend resource */
  chain?: SwapChainType;
  /** User's balance of this token */
  balance?: number;
  /** USD price per token */
  usdPrice?: number;
}

/**
 * A swap/bridge failure to render: a bare translation key, or a key plus the
 * interpolation params it needs (e.g. the pair minimum).
 */
export type SwapErrorMessage = string | { key: string; params: Record<string, string> };

/**
 * Immutable snapshot of the pair the user actually confirmed, captured at
 * confirm time. The success screen renders from this instead of live form
 * state: post-swap balance refreshes can drop a fully-spent input token from
 * the token list, which makes the form's token-reselection effect fall back
 * to an unrelated token and clear the amounts while success is still mounted.
 */
export interface SwapSuccessSummary {
  /** Input amount as entered (display units) */
  inAmount: string;
  /** Input token symbol */
  inSymbol: string;
  /** Output amount shown at confirm time (display units) */
  outAmount: string;
  /** Output token symbol */
  outSymbol: string;
  /** Input token chain — drives the explorer URL */
  chain?: SwapChainType;
  /** Input token network id — drives the explorer URL environment */
  networkId?: string;
}

/**
 * Bridge estimate type (simplified)
 */
export interface BridgeEstimateSimple {
  /** Estimated output amount */
  estimatedAmount: number;
  /** Minimum required input amount */
  minAmount: number;
  /** Maximum allowed input amount; null/undefined when the pair has no cap */
  maxAmount?: number | null;
  /** Input token symbol */
  symbolIn: string;
  /** Output token symbol */
  symbolOut: string;
}

/**
 * Bridge exchange result type (simplified)
 */
export interface BridgeExchangeSimple {
  /** Exchange ID for tracking */
  id: string;
  /** Deposit address (where user sends funds) */
  depositAddress: string;
  /** Input amount */
  amountIn: number;
  /** Expected output amount */
  amountOut: number;
  /** Input token symbol */
  symbolIn: string;
  /** Output token symbol */
  symbolOut: string;
  /** Destination address */
  addressTo: string;
  /** Exchange status */
  status: string;
}

/**
 * Bridge transaction status (simplified)
 */
export interface BridgeTransactionSimple {
  /** Current exchange status */
  status: string;
  /** Optional payout transaction hash */
  payoutTxId?: string;
}

// ============================================================================
// Component Props (Generic - use with platform-specific style types)
// ============================================================================

/**
 * Props for SwapTabSelector component
 */
export interface SwapTabSelectorProps<StyleType> {
  /** Currently active tab */
  activeTab: SwapTab;
  /** Callback when tab changes */
  onTabChange: (tab: SwapTab) => void;
  /** Custom style */
  style?: StyleType;
}

/**
 * Props for SwapAmountInput component
 */
export interface SwapAmountInputProps<StyleType> {
  /** Label above the input (e.g., "You Send", "You Receive") */
  label: string;
  /** Current amount value */
  value: string;
  /** Callback when amount changes */
  onChangeValue: (value: string) => void;
  /** Selected token */
  token: SwapToken | null;
  /** Callback when token selector is pressed */
  onTokenPress: () => void;
  /** USD value of the amount */
  usdValue?: number;
  /** Available balance (for "You Send" input) */
  availableBalance?: number;
  /** Whether input is editable */
  editable?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Custom style */
  style?: StyleType;
  /** Show loading state for amount */
  isLoading?: boolean;
}

/**
 * Props for SwapDetailRow component
 */
export interface SwapDetailRowProps<StyleType> {
  /** Label on the left */
  label: string;
  /** Value on the right */
  value: string;
  /** Custom style */
  style?: StyleType;
}

/**
 * Props for SwapReviewCard component
 */
export interface SwapReviewCardProps<StyleType> {
  /** Card label (e.g., "You Send", "You Receive") */
  label: string;
  /** Amount with symbol (e.g., "0.009 SOL") */
  amount: string;
  /** USD equivalent (e.g., "~$84.65") */
  usdValue?: string;
  /** Custom style */
  style?: StyleType;
}

/**
 * Props for SwapReviewScreen sub-component
 */
export interface SwapReviewScreenProps<StyleType> {
  /** Quote data */
  quote: SwapQuote;
  /** Input token */
  inToken: SwapToken;
  /** Output token */
  outToken: SwapToken;
  /** Human-readable input amount (fallback when quote.input is missing) */
  inAmount?: string;
  /** Human-readable output amount (fallback when quote.output is missing) */
  outAmount?: string;
  /** Callback for back button */
  onBack: () => void;
  /** Callback for confirm button */
  onConfirm: () => void;
  /** Whether confirm is in progress */
  isConfirming?: boolean;
  /** Override label for the confirm button (e.g. countdown or refresh) */
  confirmLabel?: string;
  /** Custom style */
  style?: StyleType;
}

/**
 * Props for SwapInputScreen sub-component
 */
export interface SwapInputScreenProps<StyleType> {
  /** Input token */
  inToken: SwapToken | null;
  /** Output token */
  outToken: SwapToken | null;
  /** Input amount */
  inAmount: string;
  /** Output amount (estimated) */
  outAmount: string;
  /** Callback when input amount changes */
  onInAmountChange: (value: string) => void;
  /** Callback when input token selector is pressed */
  onInTokenPress: () => void;
  /** Callback when output token selector is pressed */
  onOutTokenPress: () => void;
  /** USD value of input */
  inUsdValue?: number;
  /** Whether quote is loading */
  isLoadingQuote?: boolean;
  /** Whether Review button is enabled */
  canReview: boolean;
  /** Warning message when review is not possible */
  reviewWarning?: SwapErrorMessage | null;
  /** Translation key for the last swap or bridge failure */
  swapError?: SwapErrorMessage | null;
  /** Callback for Review button */
  onReview: () => void;
  /** Custom style */
  style?: StyleType;
}

/**
 * Props for main SwapScreen component
 */
export interface SwapScreenProps<StyleType> {
  /** User's tokens for selection */
  tokens: SwapToken[];
  /** Featured tokens for quick selection */
  featuredTokens?: SwapToken[];
  /** Callback to fetch quote */
  onGetQuote: (inToken: SwapToken, outToken: SwapToken, amount: string) => Promise<SwapQuote>;
  /** Callback to execute swap */
  onSwap: (quote: SwapQuote) => Promise<{ txId: string }>;
  /** Callback when swap succeeds */
  onSuccess?: (txId: string) => void;
  /** Callback when swap fails */
  onError?: (error: Error) => void;
  /** Callback to search tokens */
  onSearchTokens?: (query: string) => Promise<SwapToken[]>;
  /** Initial input token */
  initialInToken?: SwapToken;
  /** Initial output token */
  initialOutToken?: SwapToken;
  /** Full Jupiter verified token catalog for Solana output selection */
  jupiterTokens?: SwapToken[];
  /** Whether tokens are still loading */
  loading?: boolean;
  /** Custom style */
  style?: StyleType;
  /** Default recipient address for bridge (e.g., user's own BTC address) */
  defaultRecipientAddress?: string;
  /**
   * Resolves the wallet's own receive address for a given chain. Used by the
   * bridge flow to auto-fill the destination address based on the selected
   * output token's chain. Must be memoised by the caller (e.g. `useCallback`)
   * to avoid re-firing the auto-fill effect on every render.
   */
  getReceiveAddressForChain?: (chain: SwapChainType) => string;

  // Bridge-related props (optional - if provided, bridge tab becomes functional)
  /** Bridge source tokens (user's tokens available for bridging) */
  bridgeTokens?: BridgeTokenSimple[];
  /** Featured bridge tokens */
  bridgeFeaturedTokens?: BridgeTokenSimple[];
  /** Callback to get available destination tokens for a source token */
  onGetAvailableTokens?: (sourceSymbol: string) => Promise<BridgeTokenSimple[]>;
  /** Callback to get bridge estimate */
  onGetBridgeEstimate?: (
    symbolIn: string,
    symbolOut: string,
    amount: number,
    networkIn?: string,
    networkOut?: string
  ) => Promise<BridgeEstimateSimple | null>;
  /** Callback to create bridge exchange */
  onCreateBridgeExchange?: (
    symbolIn: string,
    symbolOut: string,
    amount: number,
    addressTo: string,
    networkIn?: string,
    networkOut?: string
  ) => Promise<BridgeExchangeSimple | null>;
  /** Callback to get bridge transaction status */
  onGetBridgeTransactionStatus?: (id: string) => Promise<BridgeTransactionSimple | null>;
  /** Callback when bridge succeeds */
  onBridgeSuccess?: (exchange: BridgeExchangeSimple) => void;
  /** Callback when bridge fails */
  onBridgeError?: (error: Error) => void;
  /** Callback to send deposit to bridge exchange address */
  onSendDeposit?: (
    depositAddress: string,
    tokenAddress: string,
    amount: number
  ) => Promise<{ txId: string }>;
  /** Callback to search bridge source tokens */
  onSearchBridgeTokens?: (query: string) => Promise<BridgeTokenSimple[]>;
  /** Callback to navigate to home after success */
  onNavigateHome?: () => void;
}
