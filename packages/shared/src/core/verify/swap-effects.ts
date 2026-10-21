/**
 * What a swap does to the wallet, read from a simulation before signing.
 *
 * Jupiter's router call has a published account layout, so its accounts and
 * amounts are bound in the bytes (`assertJupiterRoute`). 0x Settler's is not
 * published: there is no slot to hold to the wallet's own account, and a build
 * paying its output elsewhere would pass every byte check. Neither layout says
 * what the route's own steps do once running. So every swap is simulated, and
 * the wallet signs only if the simulation shows what the screen shows: the
 * input leaving, no more than the amount on screen, no other token leaving and
 * no approval granted, and at least the minimum output arriving in the
 * wallet's own accounts.
 */
import { address } from '@solana/kit';
import type { Base64EncodedWireTransaction } from '@solana/kit';

import type { SolanaRpc } from '../../blockchain/solana/networks';
import { previewTransactionEffects } from '../../blockchain/solana/simulation';
import { fetchAccounts } from '../../blockchain/solana/simulation-rpc';
import type { TransactionEffects } from '../../blockchain/solana/simulation';
import { WRAPPED_SOL_MINT as WRAPPED_SOL } from './solana-programs';
import {
  MAX_PRIORITY_FEE_LAMPORTS,
  SolanaTransactionMismatchError,
  swapAccountCreates,
} from './solana-transaction';
import type { SwapRouteExpectation } from './solana-transaction';

// ponytail: fixed allowances. Rent of a Token-2022 ATA with extensions is
// ~0.0021 SOL; the fee cap only applies when the node does not report the fee.
// Upgrade path: read the compute-budget price and each created account's size.
/** Rent the wallet may spend per token account the message opens (see `assertSwapPaysWallet`). */
export const ATA_RENT_ALLOWANCE = 2_100_000n;
/** The network fee assumed when the node does not report one. */
export const FEE_ALLOWANCE = 1_000_000n;
/**
 * The most fee the simulation allows for: one signature's base fee plus the
 * priority-fee cap the byte check enforces. A larger fee the node reports is
 * the wallet's loss, not an allowance.
 */
export const MAX_FEE_LAMPORTS = 5_000n + MAX_PRIORITY_FEE_LAMPORTS;

/**
 * Refuses unless the effects are a swap of `route` for the wallet.
 *
 * @param ataCreates - How many token accounts the message opens: the rent
 *   they cost is the one SOL movement besides the fee and the swap itself.
 */
export function assertSwapEffects(
  effects: TransactionEffects,
  route: SwapRouteExpectation,
  ataCreates: number
): void {
  const refuse = (why: string): never => {
    throw new SolanaTransactionMismatchError(why);
  };
  if (effects.kind === 'transaction-would-fail') refuse('The swap would fail on chain');
  if (effects.kind === 'undetermined') {
    refuse(`The swap's effect on the wallet could not be checked: ${effects.detail}`);
  }
  if (effects.kind !== 'effects') return refuse('The swap does not move the wallet’s funds');

  if (effects.approvals.length > 0) refuse('The swap hands a delegate the wallet’s tokens');

  const inAmount = BigInt(route.inAmount);
  let paid = 0n;
  let received = 0n;
  for (const change of effects.tokens) {
    if (change.amount < 0n) {
      if (change.mint !== route.inputMint) refuse(`The swap takes ${change.mint} from the wallet`);
      paid -= change.amount;
    } else if (change.mint === route.outputMint) {
      received += change.amount;
    }
  }
  if (paid > inAmount) refuse('The swap takes more than the amount on screen');

  const fee = effects.sol.feeLamports ?? FEE_ALLOWANCE;
  const costs =
    (fee < MAX_FEE_LAMPORTS ? fee : MAX_FEE_LAMPORTS) + ATA_RENT_ALLOWANCE * BigInt(ataCreates);
  const sol = effects.sol.lamports + costs;
  if (route.outputMint === WRAPPED_SOL) {
    received += sol;
  } else if (sol < 0n) {
    if (route.inputMint !== WRAPPED_SOL) refuse('The swap takes SOL from the wallet');
    if (paid - sol > inAmount) refuse('The swap takes more than the amount on screen');
  }

  if (received < BigInt(route.minOutAmount)) {
    refuse('The swap pays the wallet less than the minimum on screen');
  }
}

/**
 * Simulates `transactionBase64` for `feePayer` and holds the result to `route`.
 *
 * Rent is allowed only for the token accounts the swap creates (for the wallet
 * or 0x's settlement account) that do not exist yet. An idempotent create of
 * an existing account costs nothing, so it earns nothing; otherwise it would
 * cover SOL leaving the wallet for something else.
 */
export async function assertSwapPaysWallet(
  rpc: SolanaRpc,
  transactionBase64: string,
  feePayer: string,
  route: SwapRouteExpectation
): Promise<void> {
  const created = swapAccountCreates(transactionBase64).map((account) => address(account));
  const existing = await fetchAccounts(rpc, created);
  const opened = created.filter((account) => !existing.get(account)).length;
  const effects = await previewTransactionEffects(
    rpc,
    transactionBase64 as Base64EncodedWireTransaction,
    address(feePayer)
  );
  assertSwapEffects(effects, route, opened);
}
