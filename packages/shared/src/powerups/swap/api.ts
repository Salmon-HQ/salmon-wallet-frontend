/**
 * The one backend call Swap makes: GET /v1/{networkId}/ft/swap/build
 * (`solana-swap-build` contract). The backend's availability gate runs
 * first — `403 region_restricted` / `403 wallet_restricted` arrive as the
 * client's `ApiError` unchanged, so the screen renders from the code.
 */
import { apiClient } from '../../api/client';
import type { PowerupBuildEnvelope, PowerupFeeLine } from '../backend/types';

export interface SwapBuildLeg {
  mint: string;
  /** Base units, as a string. */
  amount: string;
  decimals?: number;
  symbol?: string;
  name?: string;
  logo?: string;
}

export interface SwapRouteLeg {
  label: string;
  percent: number;
}

/** The fee lines as the swap route states them: the generic line plus the rate. */
export interface SwapFeeLine extends PowerupFeeLine {
  bps: number;
  decimals?: number;
  symbol?: string;
}

export interface SwapBuildEnvelope
  extends Omit<PowerupBuildEnvelope, 'salmonFee' | 'routeFee' | 'contributor'> {
  providerRequestId: string | null;
  input: SwapBuildLeg;
  output: SwapBuildLeg & { minAmount: string };
  route: SwapRouteLeg[];
  priceImpactPct: number | null;
  slippageBps: number;
  inUsdValue: number | null;
  outUsdValue: number | null;
  salmonFee: SwapFeeLine | null;
  /** The provider's own fee when it reports one. */
  routeFee: { bps?: number } | null;
  contributor?: PowerupBuildEnvelope['contributor'];
}

export interface SwapBuildParams {
  inputMint: string;
  outputMint: string;
  publicKey: string;
  /** Human-readable input amount; the backend resolves the decimals. */
  uiAmount: string;
  slippageBps?: number;
}

export async function buildSwap(
  networkId: string,
  params: SwapBuildParams
): Promise<SwapBuildEnvelope> {
  const { data } = await apiClient.get<SwapBuildEnvelope>(`/v1/${networkId}/ft/swap/build`, {
    params,
  });
  return data;
}

export type BuildSwapFn = typeof buildSwap;
