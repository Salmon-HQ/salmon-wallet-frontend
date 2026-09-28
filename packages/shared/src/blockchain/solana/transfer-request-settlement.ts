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

/** One page of the signature list, at the RPC's own maximum. */
const SIGNATURE_PAGE_LIMIT = 1000;

/**
 * Pages walked per check. Ten thousand finalized signatures naming one fresh
 * reference is an attack, not use, and the wallet stops rather than paging
 * forever on someone else's dime.
 */
const MAX_SIGNATURE_PAGES = 10;

/**
 * Transactions fetched per check. The signature list is one call per thousand
 * entries, but deciding whether an entry settles the request costs a
 * `getTransaction` each, so a reference buried under thousands of signatures
 * would otherwise turn a five-second poll into a flood against the receiver's
 * own node.
 *
 * The ceiling that remains: an attacker who posts more than this many
 * reference-naming signatures *before* the payer pays still hides the payment.
 * Posting them afterwards — the cheap, deterministic version — no longer
 * works, because the search runs oldest first.
 */
const MAX_TRANSACTION_LOOKUPS = 60;

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
 * Every finalized signature that names the reference, oldest first.
 *
 * Reading only the newest page hides a payment from the receiver: anyone who
 * sees the request's QR knows the reference, and transactions that merely name
 * it — failed ones included — push the real payment out of the page. Whoever
 * buries a payment has to do it before that payment is made, so the oldest
 * entries are examined first.
 */
async function referenceSignatures(
  rpc: SolanaRpc,
  reference: string
): Promise<{ signature: string; err: unknown }[]> {
  const collected: { signature: string; err: unknown }[] = [];
  let before: Signature | undefined;

  for (let page = 0; page < MAX_SIGNATURE_PAGES; page += 1) {
    const entries = await rpc
      .getSignaturesForAddress(address(reference), {
        limit: SIGNATURE_PAGE_LIMIT,
        commitment: 'finalized',
        ...(before ? { before } : {}),
      })
      .send();

    collected.push(...entries);
    if (entries.length < SIGNATURE_PAGE_LIMIT) break;
    before = entries[entries.length - 1]?.signature as Signature;
  }

  return collected.reverse();
}

/**
 * The finalized transfer that settles the request, or null while nothing does.
 * Throws when the RPC does: the caller keeps its last known state.
 */
export async function findTransferRequestSettlement(
  rpc: SolanaRpc,
  query: TransferRequestSettlementQuery
): Promise<TransferRequestSettlement | null> {
  const signatures = await referenceSignatures(rpc, query.reference);
  const wanted = BigInt(query.amountAtomic);
  let lookups = 0;

  for (const entry of signatures) {
    if (entry.err) continue;
    if (lookups >= MAX_TRANSACTION_LOOKUPS) break;
    lookups += 1;

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
