/**
 * Pure derivation for the transaction effect preview: diffs two decoded
 * account snapshots into a typed effect report. No RPC, no clock, no
 * randomness — everything network-shaped lives in `simulation.ts`.
 */

import type { Address } from '@solana/kit';

import { decodeAccountState, decodeMintState, toBytes } from './simulation-decode';
import type {
  ApprovalGrant,
  ApprovalScope,
  DerivationInput,
  Effects,
  NoEffect,
  RawAccount,
  UndeterminedEffects,
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
 * @returns `no-effect` when nothing moved, `effects` otherwise, and
 * `undetermined` when an account changes owner, which no balance row can show.
 * Every other kind of uncertainty is decided before decoding.
 */
export function deriveEffects(input: DerivationInput): NoEffect | Effects | UndeterminedEffects {
  const { account, before, after, mints, resolveSymbol } = input;

  // System Assign moves the wallet's own account to another program, which can
  // then debit every lamport in it. No lamports move, so every diff below would
  // report no-effect or the fee alone. Same treatment as a token account
  // changing owner: undetermined, which the approval screen holds.
  const ownerBefore = before.get(account)?.owner;
  const ownerAfter = after.get(account)?.owner;
  if (ownerBefore && ownerAfter && ownerBefore !== ownerAfter) {
    return {
      kind: 'undetermined',
      account,
      reason: 'ownership-change',
      detail: `Account ${account} changes owner program from ${ownerBefore} to ${ownerAfter}.`,
    };
  }

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

    // Ownership is diffed before amounts, because losing the account outranks
    // anything that moved inside it. SetAuthority(AccountOwner) leaves the
    // balance and the delegate identical, so every comparison below reports
    // nothing and the whole preview collapses to `no-effect` — the UI then
    // says the transaction moves none of your balances while handing the
    // account away. Report it as undetermined: this build has no row for it,
    // and the approval screen turns undetermined into hold-to-approve plus an
    // explicit "could not determine what this does".
    if (pre?.owner && post?.owner && pre.owner !== post.owner) {
      return {
        kind: 'undetermined',
        account,
        reason: 'ownership-change',
        detail: `Token account ${tokenAccount} changes owner from ${pre.owner} to ${post.owner}.`,
      };
    }

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

/** Bytes 36..44 of a mint hold its supply, the one field minting and burning change. */
const MINT_SUPPLY_START = 36;
const MINT_SUPPLY_END = 44;

/** Same data, or the same mint with only its supply moved. */
function sameData(pre: RawAccount, post: RawAccount): boolean {
  if (pre.data[0] === post.data[0]) return true;
  if (!decodeMintState(pre) || !decodeMintState(post)) return false;
  const [a, b] = [toBytes(pre.data), toBytes(post.data)];
  a.fill(0, MINT_SUPPLY_START, MINT_SUPPLY_END);
  b.fill(0, MINT_SUPPLY_START, MINT_SUPPLY_END);
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

/** Everything `findUnreadChange` compares. */
export interface UnreadChangeInput {
  /** The account whose balances `deriveEffects` reports. */
  readonly account: Address;
  /** The keys the transaction may write. */
  readonly writable: ReadonlySet<Address>;
  /** The keys that sign it. */
  readonly signers: ReadonlySet<Address>;
  readonly before: ReadonlyMap<Address, RawAccount | null>;
  readonly after: ReadonlyMap<Address, RawAccount | null>;
  /** The fee the previewed account pays: 0 when another signer pays it. */
  readonly accountFee: bigint;
}

/**
 * The first of the previewed account's token accounts that hands over what
 * the diff does not show, or `null`: a new close authority, or lamports that
 * leave — the account closed, or its excess withdrawn — without reaching the
 * account itself. Wrapped SOL that leaves as tokens is a row of its own.
 */
function findUnreadWalletTokenChange({
  account,
  before,
  after,
  accountFee,
}: UnreadChangeInput): Address | null {
  let lost = 0n;
  let firstLoser: Address | null = null;
  for (const [address, pre] of before) {
    const post = after.get(address) ?? null;
    const preToken = decodeAccountState(pre)?.token ?? null;
    const postToken = decodeAccountState(post)?.token ?? null;
    if (preToken?.owner !== account || !pre) continue;
    if (postToken && postToken.closeAuthority !== preToken.closeAuthority) return address;
    const leftAsTokens = preToken.isNative ? preToken.amount - (postToken?.amount ?? 0n) : 0n;
    const loss = pre.lamports - (post?.lamports ?? 0n) - leftAsTokens;
    if (loss > 0n) {
      lost += loss;
      firstLoser ??= address;
    }
  }
  const received = (after.get(account)?.lamports ?? 0n) - (before.get(account)?.lamports ?? 0n);
  return firstLoser && lost > received + accountFee ? firstLoser : null;
}

/**
 * The first account the transaction changes in a way the balance diff does
 * not show, or `null`.
 *
 * `deriveEffects` reads the previewed account and its token accounts. Any
 * other writable account is fine when it only receives — the other side of a
 * movement the diff already shows — or when it, or the owner of its tokens,
 * signs the transaction too, since that signer answers for its own funds.
 * Anything else is value or control the wallet's signature hands over out of
 * sight: lamports leaving an account derived from the wallet, a token account
 * the wallet is a delegate of, an authority rewritten in a mint or a nonce
 * account.
 */
export function findUnreadChange(input: UnreadChangeInput): Address | null {
  const { account, writable, signers, before, after } = input;
  const walletChange = findUnreadWalletTokenChange(input);
  if (walletChange) return walletChange;

  for (const address of writable) {
    if (address === account || signers.has(address)) continue;
    const pre = before.get(address) ?? null;
    const post = after.get(address) ?? null;
    // Created by the transaction: whatever funded it shows in the diff.
    if (!pre) continue;

    const preToken = decodeAccountState(pre)?.token ?? null;
    const postToken = decodeAccountState(post)?.token ?? null;
    if (preToken?.owner === account || postToken?.owner === account) continue;
    if (preToken && signers.has(preToken.owner)) continue;

    if (!post || post.lamports < pre.lamports || post.owner !== pre.owner) return address;
    if (preToken || postToken) {
      if (
        !preToken ||
        !postToken ||
        postToken.amount < preToken.amount ||
        postToken.owner !== preToken.owner ||
        postToken.delegate !== preToken.delegate ||
        postToken.delegatedAmount !== preToken.delegatedAmount
      ) {
        return address;
      }
    } else if (!sameData(pre, post)) {
      return address;
    }
  }
  return null;
}
