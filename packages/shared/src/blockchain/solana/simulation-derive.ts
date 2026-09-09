/**
 * Pure derivation for the transaction effect preview: diffs two decoded
 * account snapshots into a typed effect report. No RPC, no clock, no
 * randomness — everything network-shaped lives in `simulation.ts`.
 */

import type { Address } from '@solana/kit';

import type {
  ApprovalGrant,
  ApprovalScope,
  DerivationInput,
  Effects,
  NoEffect,
  SolChange,
  TokenChange,
} from './simulation-types';

/**
 * `u64::MAX` — the amount the SPL Token `approve` instruction is given when a
 * dApp wants a delegation that never needs topping up. The canonical, and by
 * far the most common, "unlimited approval".
 */
export const U64_MAX = 18_446_744_073_709_551_615n;

/**
 * Decides how dangerous a delegation's size is.
 *
 * `u64::MAX` is the obvious unlimited approval, but it is not the only one.
 * Two further cases are treated as effectively unbounded or near enough:
 *
 * - **At or above the mint's total supply.** No holder can ever exceed the
 *   supply, so such a delegation can never be exhausted. Approving
 *   `u64::MAX - 1`, or the supply exactly, is `u64::MAX` in every way that
 *   matters to the user, and a check for the sentinel alone would miss it.
 * - **Above the account's balance after the transaction.** Not unlimited, but
 *   it lets the spender take everything currently held *and* anything received
 *   later up to the cap — including the common case of a delegation granted on
 *   an account that is empty today. Reported as `exceeds-balance` rather than
 *   `unlimited` so the UI can be accurate instead of merely loud.
 *
 * @param amount - Delegated amount in the mint's base units.
 * @param balance - The token account's balance after the transaction.
 * @param supply - The mint's total supply.
 * @returns The scope tier for this delegation.
 */
export function classifyApprovalScope(
  amount: bigint,
  balance: bigint,
  supply: bigint
): ApprovalScope {
  if (amount >= U64_MAX || (supply > 0n && amount >= supply)) {
    return 'unlimited';
  }
  return amount > balance ? 'exceeds-balance' : 'bounded';
}

/** Token accounts owned by `account` that appear in either snapshot. */
function collectOwnedTokenAccounts(input: DerivationInput): readonly Address[] {
  const owned = new Set<Address>();
  for (const snapshot of [input.before, input.after]) {
    for (const [address, state] of snapshot) {
      if (state?.token && state.token.owner === input.account) {
        owned.add(address);
      }
    }
  }
  return [...owned];
}

/**
 * Diffs two decoded snapshots into a typed effect report.
 *
 * Pure: no RPC, no clock, no randomness. Everything network-shaped happens in
 * `previewTransactionEffects`, which calls this.
 *
 * @param input - Before/after snapshots plus the mints they reference.
 * @returns `no-effect` when nothing moved, `effects` otherwise. This function
 * never returns `undetermined` — uncertainty is decided before decoding.
 */
export function deriveEffects(input: DerivationInput): NoEffect | Effects {
  const { account, before, after, mints, resolveSymbol } = input;

  const lamportsBefore = before.get(account)?.lamports ?? 0n;
  const lamportsAfter = after.get(account)?.lamports ?? 0n;
  const sol: SolChange = {
    lamports: lamportsAfter - lamportsBefore,
    feeLamports: input.feeLamports,
  };

  const tokens: TokenChange[] = [];
  const approvals: ApprovalGrant[] = [];

  for (const tokenAccount of collectOwnedTokenAccounts(input)) {
    const pre = before.get(tokenAccount)?.token ?? null;
    const post = after.get(tokenAccount)?.token ?? null;
    const mintAddress = post?.mint ?? pre?.mint;
    if (!mintAddress) {
      continue;
    }

    const mint = mints.get(mintAddress);
    const decimals = mint?.decimals ?? 0;
    const symbol = resolveSymbol?.(mintAddress) ?? null;

    // A missing snapshot is a real balance of zero: absent before means the
    // transaction created the account, absent after means it closed it.
    const amount = (post?.amount ?? 0n) - (pre?.amount ?? 0n);
    if (amount !== 0n) {
      tokens.push({ tokenAccount, mint: mintAddress, amount, decimals, symbol });
    }

    // An approval is a *new or enlarged* delegation in the post state. A
    // delegation that was already there and is untouched is pre-existing
    // exposure, not something this transaction is asking for.
    if (!post?.delegate) {
      continue;
    }
    const isNewSpender = pre?.delegate !== post.delegate;
    const isLarger = post.delegatedAmount > (pre?.delegatedAmount ?? 0n);
    if (!isNewSpender && !isLarger) {
      continue;
    }

    approvals.push({
      tokenAccount,
      mint: mintAddress,
      spender: post.delegate,
      amount: post.delegatedAmount,
      decimals,
      symbol,
      scope: classifyApprovalScope(post.delegatedAmount, post.amount, mint?.supply ?? 0n),
    });
  }

  if (sol.lamports === 0n && tokens.length === 0 && approvals.length === 0) {
    return { kind: 'no-effect', account };
  }
  return { kind: 'effects', account, sol, tokens, approvals };
}
