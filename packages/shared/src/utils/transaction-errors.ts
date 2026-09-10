/**
 * Maps a failed transaction to what the user should read.
 *
 * Two layers, on purpose. The **key** is one of a dozen actionable messages —
 * fee, balance, rent, expiry, congestion, a program's refusal — chosen from
 * the error's *code*, not from its prose: `@solana/kit` decodes every
 * JSON-RPC, transaction and instruction error the validator can return into a
 * `SolanaError` with a numeric code, and a preflight failure carries the
 * underlying transaction error as its `cause` (`unwrapSimulationError`). The
 * **detail** is the one line under it that says what actually came back — the
 * program and its error number, the last program log, the node's message — so
 * "The transaction failed" never stands alone again (owner, 2026-09-10).
 *
 * Catalogue this reads, by source:
 * - JSON-RPC server errors (-32001…-32021) and `TransactionError` /
 *   `InstructionError` variants: `@solana/errors` codes, mirrored from Agave.
 * - Program-specific `Custom(n)` codes: SPL Token (`solana-program/token`,
 *   `interface/src/error.rs`), the System program (`solana-sdk`,
 *   `system-interface/src/error.rs`), Jupiter's swap program (6001 = slippage).
 * - Anything that is not a `SolanaError` (Bitcoin, Ethereum, the backend, an
 *   aggregator) still goes by message patterns, as before.
 */
import {
  isSolanaError,
  unwrapSimulationError,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  SOLANA_ERROR__INSTRUCTION_ERROR__ACCOUNT_NOT_RENT_EXEMPT,
  SOLANA_ERROR__INSTRUCTION_ERROR__COMPUTATIONAL_BUDGET_EXCEEDED,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
  SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS,
  SOLANA_ERROR__INSTRUCTION_ERROR__MISSING_REQUIRED_SIGNATURE,
  SOLANA_ERROR__INSTRUCTION_ERROR__UNKNOWN,
  SOLANA_ERROR__JSON_RPC__INTERNAL_ERROR,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_LONG_TERM_STORAGE_UNREACHABLE,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_MIN_CONTEXT_SLOT_NOT_REACHED,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_NODE_UNHEALTHY,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_SIGNATURE_LEN_MISMATCH,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_SIGNATURE_VERIFICATION_FAILURE,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION,
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
  SOLANA_ERROR__TRANSACTION_ERROR__ACCOUNT_IN_USE,
  SOLANA_ERROR__TRANSACTION_ERROR__ACCOUNT_NOT_FOUND,
  SOLANA_ERROR__TRANSACTION_ERROR__ALREADY_PROCESSED,
  SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND,
  SOLANA_ERROR__TRANSACTION_ERROR__CLUSTER_MAINTENANCE,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT,
  SOLANA_ERROR__TRANSACTION_ERROR__INVALID_ACCOUNT_FOR_FEE,
  SOLANA_ERROR__TRANSACTION_ERROR__INVALID_RENT_PAYING_ACCOUNT,
  SOLANA_ERROR__TRANSACTION_ERROR__MAX_LOADED_ACCOUNTS_DATA_SIZE_EXCEEDED,
  SOLANA_ERROR__TRANSACTION_ERROR__MISSING_SIGNATURE_FOR_FEE,
  SOLANA_ERROR__TRANSACTION_ERROR__PROGRAM_EXECUTION_TEMPORARILY_RESTRICTED,
  SOLANA_ERROR__TRANSACTION_ERROR__SIGNATURE_FAILURE,
  SOLANA_ERROR__TRANSACTION_ERROR__UNKNOWN,
  SOLANA_ERROR__TRANSACTION_ERROR__UNSUPPORTED_VERSION,
  SOLANA_ERROR__TRANSACTION_ERROR__WOULD_EXCEED_ACCOUNT_DATA_BLOCK_LIMIT,
  SOLANA_ERROR__TRANSACTION_ERROR__WOULD_EXCEED_ACCOUNT_DATA_TOTAL_LIMIT,
  SOLANA_ERROR__TRANSACTION_ERROR__WOULD_EXCEED_MAX_ACCOUNT_COST_LIMIT,
  SOLANA_ERROR__TRANSACTION_ERROR__WOULD_EXCEED_MAX_BLOCK_COST_LIMIT,
  SOLANA_ERROR__TRANSACTION_ERROR__WOULD_EXCEED_MAX_VOTE_COST_LIMIT,
  SOLANA_ERROR__TRANSACTION__EXCEEDS_SIZE_LIMIT,
  SOLANA_ERROR__TRANSACTION__VERSION_NUMBER_NOT_SUPPORTED,
} from '@solana/kit';

/** What a failure becomes on screen: the message, and the line under it. */
export interface TransactionFailure {
  /** Translation key under `transaction.errors` (or `swap.errors`). */
  key: string;
  /**
   * What actually came back, already readable and short — the program and
   * its error number, the last program log, the node's own words. `null` when
   * the key says it all.
   */
  detail: string | null;
}

// ============================================================================
// Program-specific custom codes
// ============================================================================

const TOKEN_PROGRAMS = new Set([
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
]);
const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const JUPITER_PROGRAMS = new Set([
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
]);

/** SPL Token `TokenError`, by index (`interface/src/error.rs`). */
const TOKEN_ERROR_NAMES = [
  'NotRentExempt',
  'InsufficientFunds',
  'InvalidMint',
  'MintMismatch',
  'OwnerMismatch',
  'FixedSupply',
  'AlreadyInUse',
  'InvalidNumberOfProvidedSigners',
  'InvalidNumberOfRequiredSigners',
  'UninitializedState',
  'NativeNotSupported',
  'NonNativeHasBalance',
  'InvalidInstruction',
  'InvalidState',
  'Overflow',
  'AuthorityTypeNotSupported',
  'MintCannotFreeze',
  'AccountFrozen',
  'MintDecimalsMismatch',
  'NonNativeNotSupported',
];

/** System program `SystemError`, by index (`system-interface/src/error.rs`). */
const SYSTEM_ERROR_NAMES = [
  'AccountAlreadyInUse',
  'ResultWithNegativeLamports',
  'InvalidProgramId',
  'InvalidAccountDataLength',
  'MaxSeedLengthExceeded',
  'AddressWithSeedMismatch',
  'NonceNoRecentBlockhashes',
  'NonceBlockhashNotExpired',
  'NonceUnexpectedBlockhashValue',
];

const JUPITER_SLIPPAGE_CODE = 6001;

function classifyCustom(programId: string | null, code: number): { key: string; name: string } {
  if (programId && TOKEN_PROGRAMS.has(programId)) {
    const name = TOKEN_ERROR_NAMES[code] ?? `#${code}`;
    if (code === 1) return { key: 'transaction.errors.insufficientFunds', name };
    if (code === 0) return { key: 'transaction.errors.insufficientRent', name };
    if (code === 17) return { key: 'transaction.errors.accountFrozen', name };
    return { key: 'transaction.errors.programRejected', name };
  }
  if (programId === SYSTEM_PROGRAM) {
    const name = SYSTEM_ERROR_NAMES[code] ?? `#${code}`;
    if (code === 1) return { key: 'transaction.errors.insufficientFunds', name };
    return { key: 'transaction.errors.programRejected', name };
  }
  if ((programId && JUPITER_PROGRAMS.has(programId)) || code === JUPITER_SLIPPAGE_CODE) {
    if (code === JUPITER_SLIPPAGE_CODE) {
      return { key: 'transaction.errors.slippage', name: 'SlippageToleranceExceeded' };
    }
  }
  return { key: 'transaction.errors.programRejected', name: `#${code}` };
}

// ============================================================================
// Logs
// ============================================================================

const FAILED_PROGRAM = /^Program ([1-9A-HJ-NP-Za-km-z]{32,44}) failed/;
const ANCHOR_MESSAGE = /Error Message: (.+?)\.?$/;
const PROGRAM_LOG = /^Program log: (.+)$/;

function logsOf(err: unknown): string[] {
  const logs = (err as { context?: { logs?: unknown } })?.context?.logs;
  return Array.isArray(logs) ? logs.filter((line): line is string => typeof line === 'string') : [];
}

/** The program the logs blame, from the last "Program X failed" line. */
function failingProgram(logs: string[]): string | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const match = FAILED_PROGRAM.exec(logs[i]);
    if (match) return match[1];
  }
  return null;
}

/** The most telling program log: an Anchor error message, else the last log. */
function tellingLog(logs: string[]): string | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const anchor = ANCHOR_MESSAGE.exec(logs[i]);
    if (anchor) return anchor[1];
  }
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = PROGRAM_LOG.exec(logs[i]);
    if (log && !/^Instruction: /.test(log[1])) return log[1];
  }
  return null;
}

const DETAIL_MAX = 160;
const shortId = (id: string) => `${id.slice(0, 4)}…${id.slice(-4)}`;
function clip(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > DETAIL_MAX ? `${oneLine.slice(0, DETAIL_MAX - 1)}…` : oneLine;
}

// ============================================================================
// Codes
// ============================================================================

const FEE_CODES = new Set<number>([
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
  // "Attempt to debit an account but found no record of a prior credit": the
  // fee payer has never held a lamport.
  SOLANA_ERROR__TRANSACTION_ERROR__ACCOUNT_NOT_FOUND,
  SOLANA_ERROR__TRANSACTION_ERROR__INVALID_ACCOUNT_FOR_FEE,
  SOLANA_ERROR__TRANSACTION_ERROR__MISSING_SIGNATURE_FOR_FEE,
]);
const RENT_CODES = new Set<number>([
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT,
  SOLANA_ERROR__TRANSACTION_ERROR__INVALID_RENT_PAYING_ACCOUNT,
  SOLANA_ERROR__INSTRUCTION_ERROR__ACCOUNT_NOT_RENT_EXEMPT,
]);
const EXPIRED_CODES = new Set<number>([
  SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
]);
const BUSY_CODES = new Set<number>([
  SOLANA_ERROR__TRANSACTION_ERROR__CLUSTER_MAINTENANCE,
  SOLANA_ERROR__TRANSACTION_ERROR__PROGRAM_EXECUTION_TEMPORARILY_RESTRICTED,
  SOLANA_ERROR__TRANSACTION_ERROR__ACCOUNT_IN_USE,
  SOLANA_ERROR__TRANSACTION_ERROR__WOULD_EXCEED_MAX_BLOCK_COST_LIMIT,
  SOLANA_ERROR__TRANSACTION_ERROR__WOULD_EXCEED_MAX_ACCOUNT_COST_LIMIT,
  SOLANA_ERROR__TRANSACTION_ERROR__WOULD_EXCEED_ACCOUNT_DATA_BLOCK_LIMIT,
  SOLANA_ERROR__TRANSACTION_ERROR__WOULD_EXCEED_ACCOUNT_DATA_TOTAL_LIMIT,
  SOLANA_ERROR__TRANSACTION_ERROR__WOULD_EXCEED_MAX_VOTE_COST_LIMIT,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_NODE_UNHEALTHY,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_MIN_CONTEXT_SLOT_NOT_REACHED,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_LONG_TERM_STORAGE_UNREACHABLE,
  SOLANA_ERROR__JSON_RPC__INTERNAL_ERROR,
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
]);
const COMPUTE_CODES = new Set<number>([
  SOLANA_ERROR__INSTRUCTION_ERROR__COMPUTATIONAL_BUDGET_EXCEEDED,
  SOLANA_ERROR__TRANSACTION_ERROR__MAX_LOADED_ACCOUNTS_DATA_SIZE_EXCEEDED,
]);
const SIGNATURE_CODES = new Set<number>([
  SOLANA_ERROR__TRANSACTION_ERROR__SIGNATURE_FAILURE,
  SOLANA_ERROR__INSTRUCTION_ERROR__MISSING_REQUIRED_SIGNATURE,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_SIGNATURE_VERIFICATION_FAILURE,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_SIGNATURE_LEN_MISMATCH,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE,
]);
const VERSION_CODES = new Set<number>([
  SOLANA_ERROR__TRANSACTION_ERROR__UNSUPPORTED_VERSION,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION,
  SOLANA_ERROR__TRANSACTION__VERSION_NUMBER_NOT_SUPPORTED,
  SOLANA_ERROR__TRANSACTION__EXCEEDS_SIZE_LIMIT,
]);

/** The kit message when it is prose; the bare code when it is the dev-mode stub. */
function solanaDetail(err: Error & { context: { __code: number } }): string {
  return err.message.startsWith('Solana error #')
    ? `Solana error ${err.context.__code}`
    : clip(err.message);
}

function describeSolanaError(outer: unknown, root: Error & { context: { __code: number } }) {
  const code = root.context.__code;
  const logs = logsOf(outer);
  const log = tellingLog(logs);
  const detail = (base: string) => clip(log ? `${base} — ${log}` : base);

  if (FEE_CODES.has(code)) return { key: 'transaction.errors.insufficientFeeSol', detail: null };
  if (RENT_CODES.has(code)) return { key: 'transaction.errors.insufficientRent', detail: null };
  if (EXPIRED_CODES.has(code)) return { key: 'transaction.errors.expired', detail: null };
  if (code === SOLANA_ERROR__TRANSACTION_ERROR__ALREADY_PROCESSED) {
    return { key: 'transaction.errors.alreadyProcessed', detail: null };
  }
  if (BUSY_CODES.has(code)) {
    return { key: 'transaction.errors.networkBusy', detail: solanaDetail(root) };
  }
  if (COMPUTE_CODES.has(code)) {
    return { key: 'transaction.errors.computeExceeded', detail: detail(solanaDetail(root)) };
  }
  if (SIGNATURE_CODES.has(code)) {
    return { key: 'transaction.errors.signature', detail: solanaDetail(root) };
  }
  if (VERSION_CODES.has(code)) {
    return { key: 'transaction.errors.unsupportedVersion', detail: solanaDetail(root) };
  }
  if (code === SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS) {
    return { key: 'transaction.errors.insufficientFunds', detail: log ? clip(log) : null };
  }
  if (isSolanaError(root, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM)) {
    const program = failingProgram(logs);
    const { key, name } = classifyCustom(program, root.context.code);
    const who = program ? `Program ${shortId(program)}` : 'Program';
    return { key, detail: detail(`${who}: ${name} (#${root.context.code})`) };
  }
  if (isSolanaError(root, SOLANA_ERROR__INSTRUCTION_ERROR__UNKNOWN)) {
    return { key: 'transaction.errors.programRejected', detail: detail(root.context.errorName) };
  }
  if (isSolanaError(root, SOLANA_ERROR__TRANSACTION_ERROR__UNKNOWN)) {
    return { key: 'transaction.errors.malformed', detail: detail(root.context.errorName) };
  }
  // Every other instruction error is a program refusing what it was given;
  // every other transaction error is a transaction the network will not take
  // as built. Neither is something the user can fix by trying again.
  const isInstruction = code >= 4615000 && code < 4616000;
  return {
    key: isInstruction ? 'transaction.errors.programRejected' : 'transaction.errors.malformed',
    detail: detail(solanaDetail(root)),
  };
}

// ============================================================================
// Message patterns — for errors that are not a SolanaError
// ============================================================================

const FEE_PAYER_PATTERNS = ['prior credit', 'debit an account'];
const INSUFFICIENT_FUNDS_PATTERNS = [
  'insufficient lamports',
  'insufficient funds',
  'insufficient balance',
];
const SLIPPAGE_PATTERNS = [
  'slippage tolerance exceeded',
  'slippagetoleranceexceeded',
  // Jupiter's swap program reports slippage as custom error 6001 (0x1771),
  // which reaches us as a stringified InstructionError or as a hex code.
  '"custom":6001',
  '0x1771',
];
const NO_ROUTE_PATTERNS = [
  'no route found',
  'no routes found',
  'route not found',
  'route_not_found',
];
const QUOTE_EXPIRED_PATTERNS = ['quote expired', 'quote has changed'];
const EXPIRED_PATTERNS = ['block height exceeded', 'blockhash not found', 'transaction expired'];
const BUSY_PATTERNS = [
  'too many requests',
  'rate limit',
  'econnreset',
  'network request failed',
  'failed to fetch',
  'timed out',
  'timeout',
];
const BUSY_STATUS = /\b(429|502|503|504)\b/;

/** Message prefixes that are already translation keys — pass them through. */
const KEY_PREFIXES = ['transaction.errors.', 'swap.errors.'];

function describeByMessage(message: string, outer: unknown): TransactionFailure {
  const haystack = message.toLowerCase();
  const detail = message ? clip(message) : null;

  if (FEE_PAYER_PATTERNS.some((p) => haystack.includes(p))) {
    return { key: 'transaction.errors.insufficientFeeSol', detail: null };
  }
  if (SLIPPAGE_PATTERNS.some((p) => haystack.includes(p))) {
    return { key: 'transaction.errors.slippage', detail: null };
  }
  if (NO_ROUTE_PATTERNS.some((p) => haystack.includes(p))) {
    return { key: 'transaction.errors.noRoute', detail: null };
  }
  if (QUOTE_EXPIRED_PATTERNS.some((p) => haystack.includes(p))) {
    return { key: 'transaction.errors.quoteExpired', detail: null };
  }

  // A preflight failure that produced no logs and no decoded cause was
  // rejected before running a single instruction: the fee payer could not
  // cover the fee. A failure with logs is a real program error.
  const context = (outer as { context?: { __code?: number } })?.context;
  const isPreflight =
    context?.__code === SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE ||
    haystack.includes('-32002');
  if (isPreflight) {
    const logs = logsOf(outer);
    if (logs.length === 0) return { key: 'transaction.errors.insufficientFeeSol', detail: null };
    const log = tellingLog(logs);
    return { key: 'transaction.errors.programRejected', detail: log ? clip(log) : detail };
  }

  if (INSUFFICIENT_FUNDS_PATTERNS.some((p) => haystack.includes(p))) {
    return { key: 'transaction.errors.insufficientFunds', detail: null };
  }
  if (EXPIRED_PATTERNS.some((p) => haystack.includes(p))) {
    return { key: 'transaction.errors.expired', detail: null };
  }
  if (BUSY_PATTERNS.some((p) => haystack.includes(p)) || BUSY_STATUS.test(haystack)) {
    return { key: 'transaction.errors.networkBusy', detail };
  }
  return { key: 'transaction.errors.generic', detail };
}

// ============================================================================
// Entry points
// ============================================================================

/** The message and the line under it for a failed transaction. */
export function describeTransactionError(err: unknown): TransactionFailure {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';

  // Errors thrown with an i18n key as message (or rethrown after an earlier
  // classification) are already user-ready — do not degrade them to generic.
  if (KEY_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return { key: message, detail: null };
  }

  // A preflight failure wraps the transaction error that failed it; that is
  // the one to read. Anything else is read as it is.
  const root = unwrapSimulationError(err);
  if (isSolanaError(root)) return describeSolanaError(err, root);

  return describeByMessage(message, err);
}

/** The translation key alone — what the swap and NFT flows read. */
export function classifyTransactionError(err: unknown): string {
  return describeTransactionError(err).key;
}
