/**
 * Maps raw transaction failures to translation keys so users read an
 * actionable message instead of an RPC error dump.
 */

const FEE_PAYER_PATTERNS = [
  // "Attempt to debit an account but found no record of a prior credit."
  // is how Solana reports a fee payer with no SOL at all.
  'prior credit',
  'debit an account',
];

const INSUFFICIENT_FUNDS_PATTERNS = [
  'insufficient lamports',
  'insufficient funds',
  'insufficient balance',
];

const EXPIRED_PATTERNS = [
  'block height exceeded',
  'blockhash not found',
  'transaction expired',
];

interface SolanaErrorLike {
  context?: {
    __code?: number;
    logs?: unknown[];
  };
}

export function classifyTransactionError(err: unknown): string {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const haystack = message.toLowerCase();

  if (FEE_PAYER_PATTERNS.some((pattern) => haystack.includes(pattern))) {
    return 'transaction.errors.insufficientFeeSol';
  }

  // A preflight failure (-32002) that produced no logs means the transaction
  // was rejected before running a single instruction: the fee payer could not
  // cover the fee. A failure with logs is a real program error.
  const context = (err as SolanaErrorLike)?.context;
  const isPreflight = context?.__code === -32002 || haystack.includes('-32002');
  if (isPreflight && (!Array.isArray(context?.logs) || context.logs.length === 0)) {
    return 'transaction.errors.insufficientFeeSol';
  }

  if (INSUFFICIENT_FUNDS_PATTERNS.some((pattern) => haystack.includes(pattern))) {
    return 'transaction.errors.insufficientFunds';
  }

  if (EXPIRED_PATTERNS.some((pattern) => haystack.includes(pattern))) {
    return 'transaction.errors.expired';
  }

  return 'transaction.errors.generic';
}
