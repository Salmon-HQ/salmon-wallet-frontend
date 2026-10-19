/**
 * Waits for one just-sent signature to reach a commitment — the foreground
 * half of "did it land". Every flow that sends from this wallet (the transfer,
 * core's broadcast) waits here before it calls the transaction done, so no
 * receipt is ever shown for a transaction the cluster has not confirmed.
 *
 * The wait never fails on a clock. A transaction lives exactly as long as
 * its blockhash (`lastValidBlockHeight`, ~60-90s), so the race is between
 * two verdicts the chain gives: the signature reached `commitment`, or the
 * network moved past the block height after which it can never be included.
 * The second is `SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED`: the transaction is
 * provably dead and a retry cannot double-spend. A wall-clock timeout could
 * not promise that — it would report "failed" for a transaction still able
 * to land, and a retry could then send twice. Expiry is only declared after
 * the ledger itself was searched for the signature, because a transaction
 * can land in the last block of its window.
 *
 * Built on `signatureSubscribe`, a one-shot notification: right for the
 * seconds after a send, wrong for a resumed session. The background poller
 * (`signature-status.ts`) is the cold-start counterpart.
 *
 * A caller may also hand over a `resend`, which is re-broadcast on an interval
 * for as long as the wait lasts. An RPC node can accept a transaction and drop
 * it before it reaches a leader, and nothing about that is visible from here —
 * the wait simply runs out. Re-broadcasting the identical signed bytes cannot
 * double-spend: same blockhash, same signature, so the cluster either has the
 * transaction already or does not.
 */
import type { Commitment, Signature } from '@solana/kit';
import {
  getSolanaErrorFromTransactionError,
  isSolanaError,
  SolanaError,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  SOLANA_ERROR__JSON_RPC__INVALID_PARAMS,
  SOLANA_ERROR__JSON_RPC__INVALID_REQUEST,
  SOLANA_ERROR__JSON_RPC__METHOD_NOT_FOUND,
  SOLANA_ERROR__JSON_RPC__PARSE_ERROR,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_MIN_CONTEXT_SLOT_NOT_REACHED,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_SIGNATURE_LEN_MISMATCH,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_SIGNATURE_VERIFICATION_FAILURE,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION,
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
} from '@solana/kit';
import {
  createBlockHeightExceedencePromiseFactory,
  createRecentSignatureConfirmationPromiseFactory,
} from '@solana/transaction-confirmation';
import type { SolanaRpc, SolanaRpcSubscriptions } from './networks';

export interface SolanaConfirmOptions {
  commitment?: Commitment;
  /**
   * Re-broadcasts the same signed bytes while the wait lasts, covering the
   * node that accepted the transaction and then dropped it. Failures are
   * ignored: the send already succeeded once, and a refused re-broadcast is
   * usually the cluster saying it has the transaction.
   */
  resend?: () => Promise<unknown>;
  /** How often to re-broadcast. */
  resendIntervalMs?: number;
}

/**
 * The chain could not be asked whether the transaction landed — the
 * subscription broke and the HTTP fallback kept failing. The transaction may
 * have landed, so this is not a failure: the screen must not offer a retry,
 * which would sign and send a second one with a fresh blockhash.
 */
export class SolanaOutcomeUnknownError extends Error {
  constructor(readonly signature: Signature) {
    super('transaction.errors.broadcastUnknown');
    this.name = 'SolanaOutcomeUnknownError';
  }
}

/** How often the HTTP fallback asks, and how many failures in a row it takes. */
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_FAILURES = 15;
/** One request that hangs (a network switch) must not hang the whole wait. */
const POLL_REQUEST_TIMEOUT_MS = 10_000;
/** A node whose block height stops moving would otherwise be asked forever. */
const POLL_CEILING_MS = 180_000;
/**
 * Ledger misses in a row, past the window, before expiry is declared. RPC
 * pools spread requests over nodes that can be a slot apart, so one miss can
 * come from a node that has not seen the last block yet.
 */
const EXPIRY_MISSES = 2;

/**
 * The transaction (or one of its instructions) failed. Kit's own expiry is
 * not taken at its word: its race reads the block height before the
 * signature, so a transaction that landed in the window's last block can
 * still lose to it.
 */
function isTransactionFailure(error: unknown): boolean {
  if (!isSolanaError(error)) return false;
  const code = error.context.__code as number;
  return (code >= 7_050_000 && code < 7_051_000) || (code >= 4_615_000 && code < 4_616_000);
}

function reached(status: string | null | undefined, commitment: Commitment): boolean {
  if (commitment === 'finalized') return status === 'finalized';
  if (commitment === 'confirmed') return status === 'confirmed' || status === 'finalized';
  return status != null;
}

async function sendWithTimeout<T>(request: {
  send(options?: { abortSignal?: AbortSignal }): Promise<T>;
}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POLL_REQUEST_TIMEOUT_MS);
  try {
    return await request.send({ abortSignal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Asks over plain HTTP until the chain gives a verdict — the stateless
 * fallback for a subscription that broke (a dropped socket, a network switch,
 * the app going to the background) while the transaction may already have
 * landed, and the second look behind kit's expiry. Gives up with
 * {@link SolanaOutcomeUnknownError} when the network cannot be asked, or
 * stops answering anything conclusive.
 */
async function pollForVerdict(
  rpc: SolanaRpc,
  signature: Signature,
  lastValidBlockHeight: bigint,
  commitment: Commitment
): Promise<void> {
  const deadline = Date.now() + POLL_CEILING_MS;
  let failures = 0;
  let misses = 0;
  for (;;) {
    if (Date.now() > deadline) throw new SolanaOutcomeUnknownError(signature);
    let height: bigint;
    let status: { err: unknown; confirmationStatus?: string | null } | null;
    try {
      // Height first: once it is past the window, a status read after it
      // sees every block the transaction could have landed in.
      height = await sendWithTimeout(rpc.getBlockHeight({ commitment }));
      const { value } = await sendWithTimeout(
        rpc.getSignatureStatuses([signature], {
          searchTransactionHistory: height > lastValidBlockHeight,
        })
      );
      status = value[0] ?? null;
      failures = 0;
    } catch {
      failures += 1;
      if (failures >= MAX_POLL_FAILURES) throw new SolanaOutcomeUnknownError(signature);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }
    if (status?.err) throw getSolanaErrorFromTransactionError(status.err as never);
    if (status && reached(status.confirmationStatus, commitment)) return;
    misses = !status && height > lastValidBlockHeight ? misses + 1 : 0;
    if (misses >= EXPIRY_MISSES) {
      throw new SolanaError(SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED, {
        currentBlockHeight: height,
        lastValidBlockHeight,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * JSON-RPC errors a node returns only after checking the request or the
 * transaction and before broadcasting it. A gateway's internal error or an
 * upstream timeout (-32603, -32000...) can follow a forward, so those are not
 * here.
 */
const REFUSED_BEFORE_BROADCAST = new Set<number>([
  SOLANA_ERROR__JSON_RPC__PARSE_ERROR,
  SOLANA_ERROR__JSON_RPC__INVALID_REQUEST,
  SOLANA_ERROR__JSON_RPC__METHOD_NOT_FOUND,
  SOLANA_ERROR__JSON_RPC__INVALID_PARAMS,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_SIGNATURE_VERIFICATION_FAILURE,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_SIGNATURE_LEN_MISMATCH,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_MIN_CONTEXT_SLOT_NOT_REACHED,
]);

/**
 * Sends signed bytes, treating a lost answer as "may have landed". A refusal
 * that proves the node never broadcast (a failed preflight, a malformed
 * request) or an HTTP 429 is rethrown. Any other failure — a dropped
 * connection, a timeout, a gateway error — can happen after the node accepted
 * the transaction, so the locally computed `signature` is returned and the
 * caller's confirmation wait settles whether it landed.
 */
export async function sendExpectingOutcome(
  send: () => Promise<Signature>,
  signature: Signature
): Promise<Signature> {
  try {
    return await send();
  } catch (error) {
    if (isSolanaError(error)) {
      const code = error.context.__code as number;
      const refusedByNode = REFUSED_BEFORE_BROADCAST.has(code);
      const rateLimited =
        code === SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR &&
        (error.context as { statusCode?: number }).statusCode === 429;
      if (refusedByNode || rateLimited) throw error;
    }
    return signature;
  }
}

/** Often enough to outrun a dropped transaction, rarely enough to be polite. */
const DEFAULT_RESEND_INTERVAL_MS = 2000;

/**
 * Resolves once the cluster reports `signature` at `commitment`; throws the
 * chain's verdict otherwise — a failed transaction's error, or
 * `SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED` once the blockhash has expired.
 */
export async function confirmSolanaSignature(
  clients: { rpc: SolanaRpc; rpcSubscriptions: SolanaRpcSubscriptions },
  signature: Signature,
  lastValidBlockHeight: bigint,
  options: SolanaConfirmOptions = {}
): Promise<void> {
  const commitment = options.commitment ?? 'confirmed';
  const getRecentSignatureConfirmationPromise =
    createRecentSignatureConfirmationPromiseFactory(clients);
  const getBlockHeightExceedencePromise = createBlockHeightExceedencePromiseFactory(clients);

  // One controller for both: whichever verdict arrives first cancels the
  // other's subscription, so neither socket outlives the answer.
  const controller = new AbortController();
  const resendTimer = options.resend
    ? setInterval(() => {
        void options.resend?.().catch(() => {});
      }, options.resendIntervalMs ?? DEFAULT_RESEND_INTERVAL_MS)
    : undefined;
  try {
    try {
      await Promise.race([
        getRecentSignatureConfirmationPromise({
          abortSignal: controller.signal,
          commitment,
          signature,
        }),
        getBlockHeightExceedencePromise({
          abortSignal: controller.signal,
          commitment,
          lastValidBlockHeight,
        }),
      ]);
    } catch (error) {
      if (isTransactionFailure(error)) throw error;
      // The subscription broke or kit called expiry, not the transaction:
      // reporting a failure here would invite a retry that sends twice. Ask
      // over HTTP, ledger included, instead.
      controller.abort();
      await pollForVerdict(clients.rpc, signature, lastValidBlockHeight, commitment);
    }
  } finally {
    if (resendTimer !== undefined) clearInterval(resendTimer);
    controller.abort();
  }
}
