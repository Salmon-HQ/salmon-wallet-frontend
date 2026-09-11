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
 */
import type { Commitment, Signature } from '@solana/kit';
import {
  createBlockHeightExceedencePromiseFactory,
  createRecentSignatureConfirmationPromiseFactory,
} from '@solana/transaction-confirmation';
import type { SolanaRpc, SolanaRpcSubscriptions } from './networks';

export interface SolanaConfirmOptions {
  commitment?: Commitment;
}

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
  } finally {
    controller.abort();
  }
}
