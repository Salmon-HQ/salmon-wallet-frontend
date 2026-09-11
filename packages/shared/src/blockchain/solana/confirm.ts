/**
 * Waits for one just-sent signature to reach a commitment — the foreground
 * half of "did it land". Every flow that sends from this wallet (the transfer,
 * core's broadcast) waits here before it calls the transaction done, so no
 * receipt is ever shown for a transaction the cluster has not confirmed.
 *
 * Built on `signatureSubscribe`, a one-shot notification: right for the
 * seconds after a send, wrong for a resumed session. The background poller
 * (`signature-status.ts`) is the cold-start counterpart.
 */
import type { Commitment, Signature } from '@solana/kit';
import { createRecentSignatureConfirmationPromiseFactory } from '@solana/transaction-confirmation';
import type { SolanaRpc, SolanaRpcSubscriptions } from './networks';

export interface SolanaConfirmOptions {
  commitment?: Commitment;
  /** How long to wait for the signature to reach `commitment`. */
  timeoutMs?: number;
}

export const DEFAULT_CONFIRMATION_TIMEOUT_MS = 30_000;

/**
 * Resolves once the cluster reports `signature` at `commitment`; throws the
 * confirmation's error (a failed transaction, or the timeout) unchanged.
 */
export async function confirmSolanaSignature(
  clients: { rpc: SolanaRpc; rpcSubscriptions: SolanaRpcSubscriptions },
  signature: Signature,
  options: SolanaConfirmOptions = {}
): Promise<void> {
  const confirmRecentSignature = createRecentSignatureConfirmationPromiseFactory(clients);
  await confirmRecentSignature({
    abortSignal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_CONFIRMATION_TIMEOUT_MS),
    commitment: options.commitment ?? 'confirmed',
    signature,
  });
}
