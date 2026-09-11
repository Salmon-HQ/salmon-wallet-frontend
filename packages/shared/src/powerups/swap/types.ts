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
export type SwapProvider = '0x' | 'dflow';

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
  /**
   * `output`: taken from the output token, `output.amount` already net of it.
   * `input`: deducted from the input token before routing — the user's debit
   * is `input.amount`, of which `amount` goes to Salmon.
   */
  side: 'input' | 'output';
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
  /**
   * Salmon's fee, on the side it says. `null` when Salmon takes none for this
   * pair (no fee account for either token): the swap goes through fee-less
   * and the line is omitted.
   */
  salmonFee: SwapFeeLine | null;
  /** Always `null` on 0x. */
  routeFee: SwapFeeLine | null;
  /**
   * Informational: the compute-unit price the backend prepended (network p75,
   * clamped), 0 when ops pinned it off. The ComputeBudget instructions are
   * already in `transaction` — never add your own.
   */
  priorityFeeMicroLamports?: number;
  /** Informational: the compute-unit limit from the backend's simulation; null when the price is 0. */
  computeUnitLimit?: number | null;
}

// ============================================================================
// Screen state
// ============================================================================

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
