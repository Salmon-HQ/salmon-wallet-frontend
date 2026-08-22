/**
 * Cold-start-safe signature status lookup for the pending-transaction poller.
 *
 * `sendAndConfirmTransaction` / `createRecentSignatureConfirmationPromiseFactory`
 * (used on the foreground happy path in `swap.ts`) are built on
 * `signatureSubscribe`, which is a **one-shot** subscription: it fires a single
 * terminal notification and cannot be replayed. A socket that dies — or an app
 * that is closed, backgrounded or locked — loses the verdict with nothing left
 * to resume. That is exactly the situation the pending store exists for, so the
 * background poller uses the stateless, idempotent `getSignatureStatuses`
 * instead, which can be re-asked from a cold start.
 *
 * Expiry is a real terminal state on Solana, unlike Ethereum's lingering
 * mempool: a transaction's blockhash is only accepted for ~151 blockhashes
 * (roughly 60-90 seconds), after which the runtime can never include it. Once
 * past that window with no status, the funds provably did not move.
 *
 * Two ordering rules make the verdict honest, and both are load-bearing:
 *
 * 1. **Status is read before expiry is declared.** A transaction can land in
 *    the final slot of its window.
 * 2. **`searchTransactionHistory` is only paid for when it matters.** The
 *    default recent-status cache keeps ~150 rooted slots (~1-2 minutes), so a
 *    signature resumed after a restart may be missing from it while being
 *    perfectly confirmed on chain. Declaring "expired" off that `null` is how
 *    a wallet ends up telling a user nothing happened when their money moved.
 *    So the ledger search is used only for entries old enough to have fallen
 *    out of the cache — which is also exactly when expiry is on the table.
 *
 * @module blockchain/solana/signature-status
 */

import { createSolanaRpc, signature as toSignature } from '@solana/kit';
import { SOLANA_NETWORKS } from './networks';

/**
 * Terminal-or-not verdict for one submitted signature.
 *
 * `expired` means the transaction never reached the chain and never can —
 * nothing was spent, not even the fee. `failed` means it landed and reverted,
 * so the fee *was* spent. The two must never be collapsed into one message.
 */
export type SignatureOutcome = 'pending' | 'confirmed' | 'failed' | 'expired';

/**
 * Age past which a signature the cluster has never heard of is treated as
 * expired. The blockhash window itself is ~60-90s; the extra headroom absorbs
 * clock skew and a slow submission without leaving a corpse in the banner.
 */
export const BLOCKHASH_EXPIRY_CEILING_MS = 120_000;

/**
 * Age past which the recent-status cache can no longer be trusted to know a
 * confirmed signature, so the (more expensive) ledger search is required.
 * Deliberately below `BLOCKHASH_EXPIRY_CEILING_MS`: no entry may ever be
 * declared expired on a cache-only miss.
 */
const RECENT_STATUS_CACHE_WINDOW_MS = 90_000;

/** `getSignatureStatuses` accepts at most 256 signatures per call. */
const MAX_SIGNATURES_PER_CALL = 256;

export interface SignatureOutcomeQuery {
  /** Submitted signature, base58. */
  signature: string;
  /** Epoch ms the wallet submitted it — drives the expiry verdict. */
  submittedAt: number;
}

export type SignatureOutcomeLookup = (
  networkId: string,
  queries: readonly SignatureOutcomeQuery[],
  now?: number
) => Promise<Record<string, SignatureOutcome>>;

/**
 * Reads the current outcome of every given signature on one Solana network.
 *
 * Batched into a single RPC call because the whole pending set is normally one
 * or two entries and never more than a handful. Throws if the RPC is
 * unreachable — the caller decides whether an unreachable node means "keep
 * waiting" (it does).
 */
export const getSolanaSignatureOutcomes: SignatureOutcomeLookup = async (
  networkId,
  queries,
  now = Date.now()
) => {
  const outcomes: Record<string, SignatureOutcome> = {};
  if (queries.length === 0) return outcomes;

  const nodeUrl = SOLANA_NETWORKS[networkId]?.config.nodeUrl;
  if (!nodeUrl) {
    // Unknown network: no verdict is better than a wrong one.
    for (const q of queries) outcomes[q.signature] = 'pending';
    return outcomes;
  }

  const rpc = createSolanaRpc(nodeUrl);

  // Chunked rather than truncated: a signature the poller silently dropped is
  // one the user is never told the outcome of, which is the failure this whole
  // module exists to prevent. In practice the set is one or two entries.
  for (let start = 0; start < queries.length; start += MAX_SIGNATURES_PER_CALL) {
    const batch = queries.slice(start, start + MAX_SIGNATURES_PER_CALL);
    // One entry old enough to have fallen out of the recent-status cache forces
    // the ledger search for the whole batch — the batch is tiny, and a wrong
    // `null` is what produces a false "expired".
    const searchTransactionHistory = batch.some(
      (q) => now - q.submittedAt > RECENT_STATUS_CACHE_WINDOW_MS
    );

    const { value } = await rpc
      .getSignatureStatuses(
        batch.map((q) => toSignature(q.signature)),
        { searchTransactionHistory }
      )
      .send();

    batch.forEach((q, index) => {
      const status = value[index];
      if (status) {
        if (status.err) {
          outcomes[q.signature] = 'failed';
        } else if (
          status.confirmationStatus === 'confirmed' ||
          status.confirmationStatus === 'finalized'
        ) {
          outcomes[q.signature] = 'confirmed';
        } else {
          // 'processed' — seen by a node, not yet voted on. Still in flight.
          outcomes[q.signature] = 'pending';
        }
        return;
      }
      // Unknown to the cluster. Only terminal once the blockhash window has
      // closed *and* the ledger itself was searched.
      outcomes[q.signature] =
        searchTransactionHistory && now - q.submittedAt > BLOCKHASH_EXPIRY_CEILING_MS
          ? 'expired'
          : 'pending';
    });
  }

  return outcomes;
};
