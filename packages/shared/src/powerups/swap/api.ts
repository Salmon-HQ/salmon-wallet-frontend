/**
 * The Swap Powerup's one backend call.
 *
 * Endpoint: GET /v1/{networkId}/ft/swap/build — returns an unsigned
 * transaction the client signs through core. There is no execute step: the
 * backend never receives signed bytes.
 *
 * Errors are thrown as the client's `ApiError` unchanged — the code
 * (`region_restricted`, `no_route`, …) is what the screen renders from, so
 * nothing here may swallow it into `null`.
 */
import { apiClient } from '../../api/client';
import type { SwapNetworkId } from '../../types/swap';
import { SWAP_NETWORK_ID } from './types';
import type { SwapBuildParams, SwapBuildResponse } from './types';

export async function buildSwap(
  params: SwapBuildParams,
  networkId: SwapNetworkId = SWAP_NETWORK_ID
): Promise<SwapBuildResponse> {
  const query: Record<string, string | number> = {
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    publicKey: params.publicKey,
  };
  if (params.amount !== undefined) query.amount = params.amount;
  if (params.uiAmount !== undefined) query.uiAmount = params.uiAmount;
  if (params.slippageBps !== undefined) query.slippageBps = params.slippageBps;

  const { data } = await apiClient.get<SwapBuildResponse>(`/v1/${networkId}/ft/swap/build`, {
    params: query,
  });
  return data;
}

export type BuildSwapFn = typeof buildSwap;
