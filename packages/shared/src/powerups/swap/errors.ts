/**
 * What a failed swap build means to the user: the shared Powerup table
 * (spec 029 §5.3) plus the codes the swap backend declares of its own.
 */
import { describePowerupBuildError, type PowerupBuildFailure } from '../backend/errors';

export type SwapBuildFailure = PowerupBuildFailure;

const SWAP_CODES: Record<string, string> = {
  token_not_supported: 'swap.errors.tokenNotSupported',
  swap_misconfigured: 'swap.errors.quoteFailed',
  unknown_mint: 'swap.errors.unknownToken',
  provider_fee_mismatch: 'swap.errors.quoteFailed',
  invalid_parameter: 'swap.errors.quoteFailed',
  missing_parameter: 'swap.errors.quoteFailed',
};

export function describeSwapBuildError(error: unknown): SwapBuildFailure {
  return describePowerupBuildError(error, {
    codes: SWAP_CODES,
    fallback: 'swap.errors.quoteFailed',
  });
}
