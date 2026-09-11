/**
 * What a failed build means to the user, for every Powerup (spec 029 §5.3).
 * The backend's codes are the contract; a Powerup may extend the table with
 * the codes its own folder declares. Everything else falls to the generic
 * build failure or, for transport, to the busy-network copy.
 */
import { ApiError } from '../../api/client';

/** A translation key, or a key plus the params it interpolates. */
export type PowerupErrorMessage = string | { key: string; params: Record<string, string> };

export type PowerupUnavailableReason = 'region' | 'wallet';

export type PowerupBuildFailure =
  | { kind: 'unavailable'; reason: PowerupUnavailableReason }
  | { kind: 'message'; message: PowerupErrorMessage };

const BUSY = 'transaction.errors.networkBusy';

/** The codes every Powerup shares. */
const CODE_TO_KEY: Record<string, string> = {
  missing_parameter: 'transaction.errors.buildFailed',
  invalid_parameter: 'transaction.errors.buildFailed',
  // The Powerup is switched off, unknown here, or has no build: not an error
  // of the network — the surface should never have reached the call.
  not_found: 'powerups.disabled.maintenance',
  no_route: 'transaction.errors.noRoute',
  // The backend refused its own bytes (an adapter emitted something the
  // registry did not declare): the user pays nothing and retries later.
  provider_program_mismatch: 'transaction.errors.buildFailed',
  provider_signer_mismatch: 'transaction.errors.buildFailed',
  provider_fee_mismatch: 'transaction.errors.buildFailed',
  // The runtime rejected the simulation: the user must not pay to fail.
  simulation_failed: 'transaction.errors.simulationFailed',
  // Ours, retryable.
  simulation_unavailable: BUSY,
  upstream_rate_limited: BUSY,
  upstream_unavailable: BUSY,
  request_budget_exhausted: BUSY,
  network_catalog_unavailable: BUSY,
};

export interface DescribeBuildErrorOptions {
  /** The Powerup's own codes, over the shared table. */
  codes?: Record<string, string>;
  /** The key when nothing else applies. */
  fallback?: string;
}

export function describePowerupBuildError(
  error: unknown,
  { codes = {}, fallback = 'transaction.errors.buildFailed' }: DescribeBuildErrorOptions = {}
): PowerupBuildFailure {
  if (error instanceof ApiError) {
    if (error.code === 'region_restricted') return { kind: 'unavailable', reason: 'region' };
    if (error.code === 'wallet_restricted') return { kind: 'unavailable', reason: 'wallet' };
    if (error.isNetworkError()) return { kind: 'message', message: BUSY };
    const key = error.code ? (codes[error.code] ?? CODE_TO_KEY[error.code]) : undefined;
    if (key) return { kind: 'message', message: key };
    if (error.isServerError()) return { kind: 'message', message: BUSY };
  }
  return { kind: 'message', message: fallback };
}
