/**
 * What the wallet pays to be scheduled ahead of the queue.
 *
 * Solana charges a flat 5000 lamports per signature, and that base fee alone
 * buys no priority. Under congestion a transaction that offers nothing extra
 * sits until its blockhash expires, which the user reads as the wallet being
 * broken. The priority fee is the lever, quoted in micro-lamports per compute
 * unit, and the network tells us what it is currently worth:
 * `getRecentPrioritizationFees` returns the smallest fee that actually landed
 * in each of up to 150 recent blocks, for transactions writing to the accounts
 * we name.
 *
 * The policy — 75th percentile of those fees, clamped — is the backend's, from
 * the Powerup build path (`unsigned-transaction-builder.js`). Keeping the two
 * identical means a Powerup and a plain send compete for the same block on the
 * same terms, instead of the wallet's own transfers being the slow ones.
 *
 * The clamp is what keeps it honest in both directions: zeros are kept in the
 * sample so an idle network reads as cheap, the floor stops us from bidding
 * nothing when it does, and the ceiling stops a spike in one block from
 * emptying a wallet. At a typical transfer's compute budget the range costs
 * between roughly 0.0000002 and 0.000004 SOL.
 */
import { AccountRole, isWritableRole, type Instruction } from '@solana/kit';
import type { Address } from '@solana/addresses';

import type { SolanaRpc } from './networks';

/** Micro-lamports per compute unit. Never bid below this when congested. */
export const PRIORITY_FEE_MIN_MICRO_LAMPORTS = 1000;
/** Micro-lamports per compute unit. One expensive block must not set our price. */
export const PRIORITY_FEE_MAX_MICRO_LAMPORTS = 20000;
/** `getRecentPrioritizationFees` accepts at most this many addresses. */
const MAX_FEE_QUERY_ACCOUNTS = 128;
/** Micro-lamports in a lamport. */
const MICRO_LAMPORTS_PER_LAMPORT = 1_000_000n;

/**
 * The accounts a transaction takes a write lock on — the ones that decide what
 * it has to outbid, since contention is per account, not global.
 */
export function writableAccountsOf(instructions: readonly Instruction[]): Address[] {
  const writable = new Set<Address>();
  for (const instruction of instructions) {
    for (const account of instruction.accounts ?? []) {
      const role = (account as { role?: AccountRole }).role;
      if (role !== undefined && isWritableRole(role)) {
        writable.add((account as { address: Address }).address);
      }
    }
  }
  return [...writable].slice(0, MAX_FEE_QUERY_ACCOUNTS);
}

/**
 * The price to bid, in micro-lamports per compute unit.
 *
 * A node that will not answer leaves us at the floor rather than at nothing:
 * an unpriced transaction is the failure this exists to prevent, and the floor
 * is cheap enough to pay blind.
 */
export async function resolvePriorityFeeMicroLamports(
  rpc: SolanaRpc,
  instructions: readonly Instruction[]
): Promise<number> {
  try {
    const recent = await rpc.getRecentPrioritizationFees(writableAccountsOf(instructions)).send();
    const fees = recent.map((entry) => Number(entry.prioritizationFee)).sort((a, b) => a - b);
    const p75 = fees.length > 0 ? fees[Math.floor(0.75 * (fees.length - 1))] : 0;
    return Math.min(
      PRIORITY_FEE_MAX_MICRO_LAMPORTS,
      Math.max(PRIORITY_FEE_MIN_MICRO_LAMPORTS, p75)
    );
  } catch (error) {
    console.warn('[priority-fee] recent fees unavailable, bidding the floor:', error);
    return PRIORITY_FEE_MIN_MICRO_LAMPORTS;
  }
}

/**
 * The same price expressed the way a v1 transaction wants it: one total figure
 * in lamports for the whole transaction, rather than a rate per compute unit.
 * Rounded up, so rounding never drops the bid below what was resolved.
 */
export function toPriorityFeeLamports(
  microLamportsPerComputeUnit: number,
  computeUnitLimit: number
): bigint {
  const total =
    BigInt(Math.max(0, Math.round(microLamportsPerComputeUnit))) * BigInt(computeUnitLimit);
  return (total + MICRO_LAMPORTS_PER_LAMPORT - 1n) / MICRO_LAMPORTS_PER_LAMPORT;
}
