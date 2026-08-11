/**
 * Maps bridge provider failures to translation keys. Bridge errors come from a
 * third-party HTTP API rather than the chain, so they never run through
 * `classifyTransactionError` — an HTTP body mentioning "insufficient" is not
 * the fee case.
 */

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

export function classifyBridgeError(err: unknown): string {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const haystack = message.toLowerCase();

  if (BELOW_MINIMUM_PATTERNS.some((pattern) => haystack.includes(pattern))) {
    return 'bridge.errors.belowMinimum';
  }

  if (UNAVAILABLE_PATTERNS.some((pattern) => haystack.includes(pattern))) {
    return 'bridge.errors.unavailable';
  }

  return 'bridge.errors.generic';
}
