/**
 * What a failed build means to the user. The backend's error codes are the
 * contract (backend spec 012); everything else falls to the generic quote
 * failure or, for transport, to the busy-network copy.
 */
import { ApiError } from '../../api/client';
import type { SwapErrorMessage, SwapUnavailableReason } from './types';

export type SwapBuildFailure =
  | { kind: 'unavailable'; reason: SwapUnavailableReason }
  | { kind: 'message'; message: SwapErrorMessage };

const CODE_TO_KEY: Record<string, string> = {
  no_route: 'transaction.errors.noRoute',
  token_not_supported: 'swap.errors.tokenNotSupported',
  swap_misconfigured: 'swap.errors.quoteFailed',
  upstream_rate_limited: 'transaction.errors.networkBusy',
  unknown_mint: 'swap.errors.unknownToken',
  provider_fee_mismatch: 'swap.errors.quoteFailed',
  invalid_parameter: 'swap.errors.quoteFailed',
  missing_parameter: 'swap.errors.quoteFailed',
};

export function describeSwapBuildError(error: unknown): SwapBuildFailure {
  if (error instanceof ApiError) {
    if (error.code === 'region_restricted') return { kind: 'unavailable', reason: 'region' };
    if (error.code === 'wallet_restricted') return { kind: 'unavailable', reason: 'wallet' };
    if (error.isNetworkError()) {
      return { kind: 'message', message: 'transaction.errors.networkBusy' };
    }
    const key = error.code ? CODE_TO_KEY[error.code] : undefined;
    if (key) return { kind: 'message', message: key };
    if (error.isServerError()) {
      return { kind: 'message', message: 'transaction.errors.networkBusy' };
    }
  }
  return { kind: 'message', message: 'swap.errors.quoteFailed' };
}
