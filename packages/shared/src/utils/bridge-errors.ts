/**
 * Maps bridge provider failures to translation keys. Bridge errors come from a
 * third-party HTTP API rather than the chain, so they never run through
 * `classifyTransactionError` — an HTTP body mentioning "insufficient" is not
 * the fee case.
 */

import type { SwapErrorMessage } from '../types/swap';

const BELOW_MINIMUM_PATTERNS = [
  'below the minimum',
  'below minimal',
  'less than minimal',
  'minimum amount',
  'minimal amount',
  'min_amount',
  'amount is too small',
  'too small',
];

const UNAVAILABLE_PATTERNS = [
  'network error',
  'unable to reach the server',
  'timeout',
  'server_error',
  'service unavailable',
  'bad gateway',
  'not available',
  'unavailable',
  'temporarily disabled',
];

/**
 * @param minimum - the pair minimum from the provider's estimate, when one was
 *   fetched. The create-exchange failure itself only carries free text, so the
 *   estimate is the only structured source of the number and its symbol.
 */
export function classifyBridgeError(
  err: unknown,
  minimum?: { amount?: number | null; symbol?: string | null }
): SwapErrorMessage {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';

  // Errors thrown with an i18n key as message (e.g. from useBridge's own
  // parser) are already user-ready — pass them through unchanged.
  if (['bridge.errors.', 'transaction.errors.', 'swap.errors.'].some((prefix) => message.startsWith(prefix))) {
    return message;
  }

  // "Minimum bridge amount is 0.1 SOL" carries the number inline — keep it.
  const inlineMin = message.match(/minimum (?:bridge )?amount is ([\d.]+\s?[A-Za-z0-9]+)/i);
  if (inlineMin) {
    return { key: 'bridge.errors.belowMinimumWithAmount', params: { min: inlineMin[1] } };
  }

  const haystack = message.toLowerCase();

  if (BELOW_MINIMUM_PATTERNS.some((pattern) => haystack.includes(pattern))) {
    if (minimum?.amount) {
      const min = minimum.symbol ? `${minimum.amount} ${minimum.symbol}` : `${minimum.amount}`;
      return { key: 'bridge.errors.belowMinimumWithAmount', params: { min } };
    }
    return 'bridge.errors.belowMinimum';
  }

  if (UNAVAILABLE_PATTERNS.some((pattern) => haystack.includes(pattern))) {
    return 'bridge.errors.unavailable';
  }

  return 'bridge.errors.generic';
}
