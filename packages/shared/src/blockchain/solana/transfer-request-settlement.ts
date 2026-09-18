/**
 * Did anyone pay this transfer request? Asked of the network by the wallet
 * that issued it (spec 033, research §R4).
 *
 * The rule is Salmon Pay's: a signature that names the reference is not a
 * payment. The transfer is final, it carries the requested mint, it lands in
 * an account the receiver owns, and it moves exactly the requested amount —
 * all four, or the request stays pending. `finalized`, not the wallet's usual
 * `confirmed`, because this credits someone else's transfer.
 */
import { address } from '@solana/kit';
import type { Signature } from '@solana/kit';
import type { SolanaRpc } from './networks';

export interface TransferRequestSettlementQuery {
  /** The request's reference key. */
  reference: string;
  /** The requested mint. */
  mint: string;
  /** The receiver's own address: the owner of the token account, never the token account itself. */
  recipientOwner: string;
  /** The requested amount in atomic units. */
  amountAtomic: string;
}

export interface TransferRequestSettlement {
  signature: string;
  /**
   * Whose tokens left: the owner of the token account this mint was debited
   * from. The fee payer is not that party whenever a relayer or a third
   * account pays the fee, so it is only the fallback.
   */
  payer: string;
  /** Seconds, as the RPC reports it; null when the node has none. */
  blockTime: number | null;
}

/** A fresh reference is touched by the payer alone; twelve leaves room for retries. */
const SIGNATURE_LIMIT = 12;

interface TokenBalanceLike {
  mint: string;
  owner?: string;
  uiTokenAmount: { amount: string };
}

/** The owner whose account this mint was debited from, when the meta names one. */
function debitedOwner(
  pre: readonly TokenBalanceLike[] | undefined,
  post: readonly TokenBalanceLike[] | undefined,
  mint: string,
  recipientOwner: string
): string | null {
  for (const before of pre ?? []) {
    if (before.mint !== mint || !before.owner || before.owner === recipientOwner) continue;
    const after = (post ?? []).find(
      (balance) => balance.mint === mint && balance.owner === before.owner
    );
    const left = BigInt(before.uiTokenAmount.amount) - BigInt(after?.uiTokenAmount.amount ?? '0');
    if (left > 0n) return before.owner;
  }
  return null;
}

function ownedDelta(
  balances: readonly TokenBalanceLike[] | undefined,
  mint: string,
  owner: string
): bigint {
  let total = 0n;
  for (const balance of balances ?? []) {
    if (balance.mint === mint && balance.owner === owner) {
      total += BigInt(balance.uiTokenAmount.amount);
    }
  }
  return total;
}

/**
 * The finalized transfer that settles the request, or null while nothing does.
 * Throws when the RPC does: the caller keeps its last known state.
 */
export async function findTransferRequestSettlement(
  rpc: SolanaRpc,
  query: TransferRequestSettlementQuery
): Promise<TransferRequestSettlement | null> {
  const signatures = await rpc
    .getSignaturesForAddress(address(query.reference), {
      limit: SIGNATURE_LIMIT,
      commitment: 'finalized',
    })
    .send();

  const wanted = BigInt(query.amountAtomic);

  for (const entry of signatures) {
    if (entry.err) continue;

    const transaction = await rpc
      .getTransaction(entry.signature as Signature, {
        encoding: 'jsonParsed',
        commitment: 'finalized',
        maxSupportedTransactionVersion: 1,
      })
      .send();
    if (!transaction?.meta || transaction.meta.err) continue;

    const delta =
      ownedDelta(transaction.meta.postTokenBalances, query.mint, query.recipientOwner) -
      ownedDelta(transaction.meta.preTokenBalances, query.mint, query.recipientOwner);
    if (delta !== wanted) continue;

    const feePayer = transaction.transaction.message.accountKeys[0]?.pubkey;
    const payer =
      debitedOwner(
        transaction.meta.preTokenBalances,
        transaction.meta.postTokenBalances,
        query.mint,
        query.recipientOwner
      ) ?? (feePayer ? String(feePayer) : '');
    return {
      signature: entry.signature,
      payer,
      blockTime: transaction.blockTime === null ? null : Number(transaction.blockTime),
    };
  }

  return null;
}
