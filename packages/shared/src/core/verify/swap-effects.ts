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
 *
 * Known limit: 0x's own on-chain minimum is not decoded. Jupiter's is read
 * from its bytes and held to the screen (`assertJupiterRoute`); 0x Settler's
 * argument layout is not published, so its minimum is left as built. The
 * simulation shows the swap paying at least the screen's minimum at the moment
 * it runs, but a 0x build that encodes a lower minimum could pay less if the
 * price moves between that simulation and the swap landing. Jupiter's formula
 * is deliberately not applied to 0x: its minimum comes from 0x's own quote.
 */
import { address } from '@solana/kit';
import type { Base64EncodedWireTransaction } from '@solana/kit';

import type { SolanaRpc } from '../../blockchain/solana/networks';
import { previewTransactionEffects } from '../../blockchain/solana/simulation';
import type { AccountChange, TransactionEffects } from '../../blockchain/solana/simulation';
import {
  TOKEN_2022_PROGRAM,
  TOKEN_PROGRAM,
  WRAPPED_SOL_MINT as WRAPPED_SOL,
} from './solana-programs';
import {
  MAX_PRIORITY_FEE_LAMPORTS,
  SolanaTransactionMismatchError,
  swapAccountCreates,
} from './solana-transaction';
import type { SwapRouteExpectation } from './solana-transaction';

// ponytail: fixed cap. Rent of a Token-2022 ATA with extensions is ~0.0021 SOL;
// the fee cap only applies when the node does not report the fee. Upgrade
// path: read the compute-budget price and each created account's size.
/** The most rent one created token account may cost the wallet (see `assertSwapPaysWallet`). */
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
 * @param rent - Lamports the swap parks as rent in token accounts it creates:
 *   the one SOL movement besides the fee and the swap itself.
 * @param reclaimed - Rent the swap returns to the wallet by closing one of the
 *   wallet's own token accounts: the wallet's already, never swap proceeds.
 */
export function assertSwapEffects(
  effects: TransactionEffects,
  route: SwapRouteExpectation,
  rent: bigint,
  reclaimed = 0n
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
  const costs = (fee < MAX_FEE_LAMPORTS ? fee : MAX_FEE_LAMPORTS) + rent;
  const sol = effects.sol.lamports + costs - reclaimed;
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

const TOKEN_PROGRAMS = new Set<string>([TOKEN_PROGRAM, TOKEN_2022_PROGRAM]);

/**
 * The rent the swap parks in the token accounts it may create: for each, the
 * lamports it gains, up to one account's rent, when it ends a token account of
 * the owner it was created for. A token account that already existed opens
 * nothing, whatever is pushed into it; one opened and closed again ends empty;
 * one handed to another owner is not the wallet's or 0x's to count; an address
 * someone funded first costs the wallet only the rest. A wrapped-SOL
 * account's balance is a token row, not rent. The cap still leaves up to
 * ~60,720 lamports of slack per account above a plain account's 2,039,280.
 */
function rentParked(
  accounts: ReadonlyMap<string, AccountChange>,
  created: { address: string; owner: string }[]
): bigint {
  let rent = 0n;
  for (const { address: account, owner } of created) {
    const change = accounts.get(account);
    const token = change?.after?.token;
    if (!change?.after || !token || !TOKEN_PROGRAMS.has(change.after.owner)) continue;
    if (token.owner !== owner) continue;
    const before = change.before;
    if (before?.token || (before && TOKEN_PROGRAMS.has(before.owner))) continue;
    const gained =
      change.after.lamports - (token.isNative ? token.amount : 0n) - (before?.lamports ?? 0n);
    if (gained > 0n) rent += gained < ATA_RENT_ALLOWANCE ? gained : ATA_RENT_ALLOWANCE;
  }
  return rent;
}

/**
 * The rent of the wallet's own token accounts the swap closes, by its own
 * instruction or inside the route. A wrapped-SOL account's lamports above its
 * rent are its balance, which its token row already counts.
 */
function rentReclaimed(accounts: Iterable<AccountChange>, wallet: string): bigint {
  let rent = 0n;
  for (const { before, after } of accounts) {
    const token = before?.token;
    if (!token || token.owner !== wallet || (after?.lamports ?? 0n) > 0n) continue;
    rent += before.lamports - (token.isNative ? token.amount : 0n);
  }
  return rent;
}

/**
 * Refuses a swap that lets someone else close one of the wallet's token
 * accounts. A route running with the wallet's signature can set a close
 * authority through its own calls; no balance moves, so nothing else here
 * would see it, and that someone could later close the account and take
 * what it holds. Delegates and owner changes are already refused through the
 * effects (an approval, or an undetermined ownership change).
 */
function assertNoForeignCloseAuthority(accounts: Iterable<AccountChange>, wallet: string): void {
  for (const { address: account, before, after } of accounts) {
    const token = after?.token;
    const authority = token?.closeAuthority ?? null;
    if (!token || token.owner !== wallet || !authority || authority === wallet) continue;
    if (authority === (before?.token?.closeAuthority ?? null)) continue;
    throw new SolanaTransactionMismatchError(
      `The swap lets ${authority} close the wallet's token account ${account}`
    );
  }
}

/**
 * Simulates `transactionBase64` for `feePayer` and holds the result to `route`.
 *
 * Rent is allowed only for what the swap parks in the token accounts it
 * creates for the wallet or 0x's settlement account (`swapAccountCreates`) —
 * the lamports each one gains, up to one account's rent (`rentParked`) — so an
 * existing token account, one opened and closed again, or one handed to
 * another owner covers nothing. Any token's account counts for the wallet:
 * Jupiter can leave the wallet's account of an intermediate token open (a SOL
 * to USDC route through USD1, seen live), and its rent stays the wallet's,
 * recoverable by closing it. Rent the swap reclaims by closing
 * one of the wallet's own token accounts is not counted as SOL in. Otherwise
 * either would cover SOL leaving the wallet for something else.
 */
export async function assertSwapPaysWallet(
  rpc: SolanaRpc,
  transactionBase64: string,
  feePayer: string,
  route: SwapRouteExpectation
): Promise<void> {
  const effects = await previewTransactionEffects(
    rpc,
    transactionBase64 as Base64EncodedWireTransaction,
    address(feePayer)
  );
  const accounts = new Map<string, AccountChange>(
    (effects.kind === 'effects' ? (effects.accounts ?? []) : []).map((change) => [
      change.address,
      change,
    ])
  );
  assertNoForeignCloseAuthority(accounts.values(), feePayer);
  assertSwapEffects(
    effects,
    route,
    rentParked(accounts, swapAccountCreates(transactionBase64)),
    rentReclaimed(accounts.values(), feePayer)
  );
}
