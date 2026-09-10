/**
 * The Swap Powerup's contract: what the backend's build endpoint returns, and
 * the screen state both twins render. The core-owned pieces (network alias,
 * token shape, exchange graphic) are in `types/swap.ts`.
 */
import type { SwapNetworkId, SwapToken, SwapChainType } from '../../types/swap';

export type { SwapNetworkId, SwapToken, SwapChainType };

/** The only network the build endpoint serves; any other answers 400. */
export const SWAP_NETWORK_ID: SwapNetworkId = 'solana-mainnet';

// ============================================================================
// Backend contract — GET /v1/solana-mainnet/ft/swap/build
// ============================================================================

/** The routing provider, as data: the UI never branches on it. */
export type SwapProvider = '0x' | 'jupiter' | 'dflow';

/**
 * Exactly one of `amount` (base units) or `uiAmount` (decimal string) is
 * sent. Fee parameters are server-side only.
 */
export interface SwapBuildParams {
  inputMint: string;
  outputMint: string;
  /** The taker: fee payer and only signer. */
  publicKey: string;
  amount?: string;
  uiAmount?: string;
  /** 0–10000; the backend defaults to 50. */
  slippageBps?: number;
}

export interface SwapBuildSide {
  mint: string;
  /** Base units, as a string to avoid float loss. */
  amount: string;
  decimals: number;
  symbol: string;
  name?: string | null;
  logo?: string | null;
}

export interface SwapBuildOutput extends SwapBuildSide {
  /** The least the user receives after slippage, base units. */
  minAmount: string;
}

export interface SwapRouteLeg {
  label: string;
  /** Share of the REMAINING amount per leg, not of the total. */
  percent: number;
}

/** A fee line: base-unit amount in `mint`, with what the client needs to render it. */
export interface SwapFeeLine {
  amount: string;
  mint: string;
  bps: number;
  decimals: number;
  symbol: string;
}

export interface SwapBuildResponse {
  provider: SwapProvider;
  providerDisplayName: string;
  /** Rendered verbatim on the confirmation, e.g. "Powered by 0x". */
  attribution: string;
  /** The provider's request id, for support — never shown. */
  providerRequestId?: string;
  /** Base64 unsigned v0 transaction, zero signatures, `publicKey` as fee payer. */
  transaction: string;
  /** ISO; request a fresh build after this. */
  expiresAt: string;
  input: SwapBuildSide;
  output: SwapBuildOutput;
  route: SwapRouteLeg[];
  /** Derived from USD values; `null` when a price is unknown. */
  priceImpactPct: number | null;
  slippageBps: number;
  inUsdValue: number | null;
  outUsdValue: number | null;
  /** Taken from the OUTPUT token; `output.amount` is already net of it. */
  salmonFee: SwapFeeLine | null;
  /** Always `null` on 0x. */
  routeFee: SwapFeeLine | null;
}

// ============================================================================
// Screen state
// ============================================================================

/** The Powerup's own steps; review and signing belong to core's confirmation. */
export type SwapScreenStep = 'input' | 'success';

/**
 * A swap failure to render: a bare translation key, or a key plus the
 * interpolation params it needs (e.g. the pair minimum).
 */
export type SwapErrorMessage = string | { key: string; params: Record<string, string> };

/**
 * The backend refused to quote for this user at all (spec 027 §4–5). Fail
 * closed: the screen renders the state and quotes nothing further.
 */
export type SwapUnavailableReason = 'region' | 'wallet';

/**
 * Immutable snapshot of the pair the user actually confirmed, captured at
 * confirm time. The success screen renders from this instead of live form
 * state: post-swap balance refreshes can drop a fully-spent input token from
 * the token list and reset the form while success is still mounted.
 */
export interface SwapSuccessSummary {
  /** Input amount as entered (display units) */
  inAmount: string;
  inSymbol: string;
  /** Output amount shown at confirm time (display units) */
  outAmount: string;
  outSymbol: string;
  /** Input token chain — drives the explorer URL */
  chain?: SwapChainType;
  /** Input token network id — drives the explorer URL environment */
  networkId?: string;
  inLogo?: string;
  outLogo?: string;
  /** The Salmon fee as shown on the confirmation (e.g. "0.85%"), when the build had one */
  fee?: string;
}
