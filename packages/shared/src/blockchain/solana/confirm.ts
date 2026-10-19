/**
 * Waits for one just-sent signature to reach a commitment — the foreground
 * half of "did it land". Every flow that sends from this wallet (the transfer,
 * core's broadcast) waits here before it calls the transaction done, so no
 * receipt is ever shown for a transaction the cluster has not confirmed.
 *
 * The wait has no clock of its own. A transaction lives exactly as long as
 * its blockhash (`lastValidBlockHeight`, ~60-90s), so the race is between
 * two verdicts the chain gives: the signature reached `commitment`, or the
 * network moved past the block height after which it can never be included.
 * The second is `SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED`: the transaction is
 * provably dead and a retry cannot double-spend. A wall-clock timeout could
 * not promise that — it would report "failed" for a transaction still able
 * to land, and a retry could then send twice.
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
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
} from '@solana/errors';
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

/**
 * An answer from the chain, not from the connection: the blockhash expired, or
 * the transaction (or one of its instructions) failed.
 */
function isChainVerdict(error: unknown): boolean {
  if (!isSolanaError(error)) return false;
  const code = error.context.__code as number;
  return (
    code === SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED ||
    (code >= 7_050_000 && code < 7_051_000) ||
    (code >= 4_615_000 && code < 4_616_000)
  );
}

function reached(status: string | null | undefined, commitment: Commitment): boolean {
  if (commitment === 'finalized') return status === 'finalized';
  if (commitment === 'confirmed') return status === 'confirmed' || status === 'finalized';
  return status != null;
}

/**
 * Asks over plain HTTP until the chain gives a verdict — the stateless
 * fallback for a subscription that broke (a dropped socket, a network switch,
 * the app going to the background) while the transaction may already have
 * landed. Gives up with {@link SolanaOutcomeUnknownError} only when the
 * network cannot be asked at all.
 */
async function pollForVerdict(
  rpc: SolanaRpc,
  signature: Signature,
  lastValidBlockHeight: bigint,
  commitment: Commitment
): Promise<void> {
  let failures = 0;
  for (;;) {
    let answer: {
      status: { err: unknown; confirmationStatus?: string | null } | null;
      height: bigint;
    };
    try {
      const [{ value }, height] = await Promise.all([
        rpc.getSignatureStatuses([signature]).send(),
        rpc.getBlockHeight({ commitment }).send(),
      ]);
      answer = { status: value[0] ?? null, height };
      failures = 0;
    } catch {
      failures += 1;
      if (failures >= MAX_POLL_FAILURES) throw new SolanaOutcomeUnknownError(signature);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }
    const { status, height } = answer;
    if (status?.err) throw getSolanaErrorFromTransactionError(status.err as never);
    if (status && reached(status.confirmationStatus, commitment)) return;
    if (height > lastValidBlockHeight) {
      throw new SolanaError(SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED, {
        currentBlockHeight: height,
        lastValidBlockHeight,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Sends signed bytes, treating a lost answer as "may have landed". A refusal
 * the node itself answered (a JSON-RPC error such as a failed preflight) or an
 * HTTP 429 means nothing was broadcast, so it is rethrown. Any other failure —
 * a dropped connection, a timeout, a gateway error — can happen after the node
 * accepted the transaction, so the locally computed `signature` is returned
 * and the caller's confirmation wait settles whether it landed.
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
      const refusedByNode = code >= -32_768 && code <= -32_000;
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
      if (isChainVerdict(error)) throw error;
      // The subscription broke, not the transaction: reporting a failure here
      // would invite a retry that sends twice. Ask over HTTP instead.
      controller.abort();
      await pollForVerdict(clients.rpc, signature, lastValidBlockHeight, commitment);
    }
  } finally {
    if (resendTimer !== undefined) clearInterval(resendTimer);
    controller.abort();
  }
}
