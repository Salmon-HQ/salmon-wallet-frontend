/**
 * Solana transaction effect preview — "what will this do to my balances?"
 *
 * Derives, on-device and before signing, what a transaction would do to ONE
 * account's balances. It is used for arbitrary dApp-composed transactions the
 * user did not write and cannot read, so the emphasis is on being honest about
 * what could not be determined rather than on covering every case.
 *
 * How it works
 * ------------
 * `simulateTransaction` is asked for the *post-execution* state of a set of
 * accounts via its `accounts` configuration. The RPC only returns post state,
 * so the pre state is read separately with `getMultipleAccounts` and the two
 * snapshots are diffed. Both SPL token programs store balance, delegate and
 * delegated amount in the token account itself, so a post-state diff catches an
 * approval granted by *any* program via CPI — not only the ones we could
 * recognise by parsing instructions.
 *
 * The transaction does NOT need to be signed: simulation runs with
 * `sigVerify: false` and `replaceRecentBlockhash: true`, which is what makes
 * this usable on an approval screen, before the user has committed to anything.
 *
 * Nothing in this module broadcasts. It only ever calls `simulateTransaction`,
 * `getMultipleAccounts`, and reads address lookup tables.
 *
 * Scope of the first cut: native SOL, SPL / Token-2022 balances, and token
 * approvals. See `UndeterminedReason` and the module tests for what is
 * deliberately out of scope.
 */

import {
  getBase64Encoder,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  unwrapOption,
} from '@solana/kit';
import type { Address, Base64EncodedWireTransaction, TransactionError } from '@solana/kit';
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  getMintDecoder,
  getTokenDecoder,
} from '@solana-program/token-2022';
import { getAddressLookupTableDecoder } from '@solana-program/address-lookup-table';

import type { SolanaRpc } from './networks';

// ============================================================================
// Constants
// ============================================================================

/**
 * `u64::MAX` — the amount the SPL Token `approve` instruction is given when a
 * dApp wants a delegation that never needs topping up. The canonical, and by
 * far the most common, "unlimited approval".
 */
export const U64_MAX = 18_446_744_073_709_551_615n;

/** Size of an SPL token account without Token-2022 extensions. */
const TOKEN_ACCOUNT_BASE_SIZE = 165;

/** Size of an SPL mint account without Token-2022 extensions. */
const MINT_BASE_SIZE = 82;

/**
 * Token-2022 discriminates extended accounts with a byte at offset 165, since
 * an extended mint is padded to the same base length as a token account.
 * @see https://spl.solana.com/token-2022/extensions
 */
const ACCOUNT_TYPE_OFFSET = 165;
const ACCOUNT_TYPE_MINT = 1;
const ACCOUNT_TYPE_TOKEN = 2;

/** `getMultipleAccounts` refuses more than 100 addresses per call. */
const MAX_ACCOUNTS_PER_REQUEST = 100;

// ============================================================================
// Result types
// ============================================================================

/**
 * Why a preview could not be produced.
 *
 * Every one of these means "we do not know what this transaction will do",
 * never "this transaction does nothing".
 */
export type UndeterminedReason =
  /** The wire transaction could not be decoded at all. */
  | 'malformed-transaction'
  /** The RPC call itself failed — offline, rate limited, node error. */
  | 'simulation-unavailable'
  /**
   * The node accepted the request but never executed the transaction (it
   * returns no logs), so there is no post state to diff.
   */
  | 'simulation-not-executed'
  /** The node executed the transaction but withheld the account states we asked for. */
  | 'account-state-unavailable'
  /**
   * The request carries several transactions that execute in sequence. Each one
   * runs against the state the previous one left behind, so simulating them
   * independently would report numbers that are wrong for every transaction but
   * the first — worse than reporting nothing.
   */
  | 'batch-not-previewable';

/** The signer's native SOL movement, in lamports. */
export interface SolChange {
  /**
   * Net lamport change for the previewed account: negative means it leaves.
   *
   * This is an observed before/after difference, so it already contains
   * everything the transaction did to the account — the transfer itself, the
   * transaction fee when this account is the fee payer, and rent paid for any
   * account it funded. It is not a sum of parts we recognised.
   */
  readonly lamports: bigint;
  /**
   * The fee alone, when the node reports it, so a UI can show "of which fee".
   * `null` on nodes that do not return a fee from simulation — in which case
   * the fee is still inside `lamports`, just not separable.
   */
  readonly feeLamports: bigint | null;
}

/** A change to one SPL token account belonging to the previewed account. */
export interface TokenChange {
  /** The token account (usually an ATA) that changed. */
  readonly tokenAccount: Address;
  /** Mint of the token that moved. */
  readonly mint: Address;
  /** Net change in the mint's base units: negative means it leaves. */
  readonly amount: bigint;
  /** Decimals read from the mint on-chain, so the raw amount can be rendered. */
  readonly decimals: number;
  /**
   * Ticker, when a caller supplied a resolver that knows this mint.
   * `null` is normal and must be rendered as the mint address, never hidden.
   */
  readonly symbol: string | null;
}

/**
 * How much of a token an approval hands over.
 *
 * Three tiers rather than a boolean, because "more than you will ever hold" and
 * "more than you hold today" are different warnings, and collapsing them would
 * force the UI to re-derive the distinction.
 */
export type ApprovalScope =
  /** Cannot be exhausted: `u64::MAX`, or at least the mint's entire supply. */
  | 'unlimited'
  /** Bounded, but above the account's post-transaction balance — it can take everything. */
  | 'exceeds-balance'
  /** Bounded at or below the account's post-transaction balance. */
  | 'bounded';

/** A token delegation this transaction would grant. */
export interface ApprovalGrant {
  /** The token account whose delegate is being set. */
  readonly tokenAccount: Address;
  /** Mint of the token being delegated. */
  readonly mint: Address;
  /** The address that would gain the right to move the tokens. */
  readonly spender: Address;
  /** Delegated amount in the mint's base units, after the transaction. */
  readonly amount: bigint;
  /** Decimals read from the mint on-chain. */
  readonly decimals: number;
  /** Ticker where resolvable, otherwise `null`. */
  readonly symbol: string | null;
  /** How dangerous the size of this delegation is. See {@link ApprovalScope}. */
  readonly scope: ApprovalScope;
}

/** The balance movements a transaction would cause for one account. */
export interface EffectDetails {
  /** Native SOL movement. */
  readonly sol: SolChange;
  /** One entry per token account of the previewed account that changed. */
  readonly tokens: readonly TokenChange[];
  /** One entry per token delegation the transaction would grant. */
  readonly approvals: readonly ApprovalGrant[];
}

/**
 * What a transaction would do to one account.
 *
 * The four cases are separate variants on purpose. A caller cannot reach the
 * numbers without first proving, in the type system, which case it is in — so
 * "we failed to simulate" can never be rendered with the same empty UI as
 * "nothing will change". A user reads absence as safety, which makes a silent
 * failure worse than not shipping the feature at all.
 */
export type TransactionEffects = NoEffect | Effects | TransactionWouldFail | UndeterminedEffects;

/** The transaction executes and leaves this account's balances untouched. */
export interface NoEffect {
  readonly kind: 'no-effect';
  /** The account these effects are reported for. */
  readonly account: Address;
}

/** The transaction executes and moves at least one of this account's balances. */
export interface Effects extends EffectDetails {
  readonly kind: 'effects';
  /** The account these effects are reported for. */
  readonly account: Address;
}

/**
 * The transaction was simulated and would fail on-chain.
 *
 * Kept apart from `no-effect` deliberately: both have zero balance movement,
 * but only one of them means "this is safe to sign".
 */
export interface TransactionWouldFail {
  readonly kind: 'transaction-would-fail';
  /** The account these effects would have been reported for. */
  readonly account: Address;
  /** The error the runtime returned. */
  readonly error: TransactionError;
  /** Program logs up to the failure, for a details drawer. */
  readonly logs: readonly string[];
}

/** The effects could not be established. Never render this as "no change". */
export interface UndeterminedEffects {
  readonly kind: 'undetermined';
  /** The account these effects would have been reported for. */
  readonly account: Address;
  /** Machine-readable cause. */
  readonly reason: UndeterminedReason;
  /** Human-readable cause, for logs and a details drawer. */
  readonly detail: string;
}

// ============================================================================
// Pure derivation
// ============================================================================

/** The parts of a token account this layer diffs. */
export interface TokenAccountState {
  readonly mint: Address;
  readonly owner: Address;
  readonly amount: bigint;
  /** Current delegate, or `null` when none is set. */
  readonly delegate: Address | null;
  /** Amount the delegate may move. Meaningless when `delegate` is `null`. */
  readonly delegatedAmount: bigint;
}

/** The parts of a mint this layer needs. */
export interface MintState {
  readonly decimals: number;
  readonly supply: bigint;
}

/** One account, at one point in time. `null` means the account does not exist. */
export interface AccountState {
  readonly lamports: bigint;
  /** Decoded token account, or `null` if this account is not an SPL token account. */
  readonly token: TokenAccountState | null;
}

/** Everything {@link deriveEffects} needs, with all decoding already done. */
export interface DerivationInput {
  /** The account whose balances are being reported. */
  readonly account: Address;
  /** State before the transaction, keyed by address. */
  readonly before: ReadonlyMap<Address, AccountState | null>;
  /** State after the transaction, keyed by address. */
  readonly after: ReadonlyMap<Address, AccountState | null>;
  /** Mints referenced by the token accounts above. */
  readonly mints: ReadonlyMap<Address, MintState>;
  /** The fee the node reported, or `null` if it reported none. */
  readonly feeLamports: bigint | null;
  /** Optional ticker lookup. Missing entries yield `symbol: null`. */
  readonly resolveSymbol?: ResolveSymbolFn;
}

/**
 * Resolves a mint address to a ticker.
 *
 * Synchronous and optional by design: the derivation must stay pure and must
 * never make a preview depend on a token-list request succeeding. Callers pass
 * a lookup into whatever token list they already hold.
 */
export type ResolveSymbolFn = (mint: Address) => string | undefined;

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
 * {@link previewTransactionEffects}, which calls this.
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

// ============================================================================
// Decoding
// ============================================================================

/** Raw account data as the RPC returns it under base64 encoding. */
type Base64AccountData = readonly [string, 'base64'];

/** The account shape shared by `getMultipleAccounts` and simulated accounts. */
interface RawAccount {
  readonly lamports: bigint;
  readonly owner: Address;
  readonly data: Base64AccountData;
}

/** True when the account is owned by either SPL token program. */
function isTokenProgram(owner: Address): boolean {
  return owner === TOKEN_PROGRAM_ADDRESS || owner === TOKEN_2022_PROGRAM_ADDRESS;
}

/**
 * Tells an SPL token account from a mint.
 *
 * Length alone is ambiguous under Token-2022, which pads an extended mint to
 * the same base size as a token account and writes a discriminator byte at
 * offset 165.
 *
 * @param data - Raw account data.
 * @returns Which SPL account this is, or `null` when it is neither.
 */
function classifySplAccount(data: Uint8Array): 'token' | 'mint' | null {
  if (data.length === TOKEN_ACCOUNT_BASE_SIZE) {
    return 'token';
  }
  if (data.length === MINT_BASE_SIZE) {
    return 'mint';
  }
  if (data.length > ACCOUNT_TYPE_OFFSET) {
    const type = data[ACCOUNT_TYPE_OFFSET];
    if (type === ACCOUNT_TYPE_TOKEN) return 'token';
    if (type === ACCOUNT_TYPE_MINT) return 'mint';
  }
  return null;
}

/** Decodes base64 account data to bytes. */
function toBytes(data: Base64AccountData): Uint8Array {
  return new Uint8Array(getBase64Encoder().encode(data[0]));
}

/**
 * Decodes one RPC account into the snapshot shape the derivation diffs.
 *
 * Only SPL token accounts are decoded further; anything else contributes its
 * lamports and nothing more. Decoding is defensive because the bytes come from
 * an arbitrary transaction's account list.
 *
 * @param account - The account as returned by the RPC, or `null` if absent.
 * @returns The snapshot, or `null` when the account does not exist.
 */
export function decodeAccountState(account: RawAccount | null): AccountState | null {
  if (!account) {
    return null;
  }
  const state: AccountState = { lamports: BigInt(account.lamports), token: null };
  if (!isTokenProgram(account.owner)) {
    return state;
  }

  const bytes = toBytes(account.data);
  if (classifySplAccount(bytes) !== 'token') {
    return state;
  }

  try {
    const token = getTokenDecoder().decode(bytes);
    return {
      lamports: state.lamports,
      token: {
        mint: token.mint,
        owner: token.owner,
        amount: token.amount,
        delegate: unwrapOption(token.delegate),
        delegatedAmount: token.delegatedAmount,
      },
    };
  } catch {
    // Malformed or a layout we do not know. Lamports are still valid, and the
    // caller reports the token side as unknown rather than as zero.
    return state;
  }
}

/** Decodes an SPL mint, returning `null` when the bytes are not a mint. */
function decodeMintState(account: RawAccount | null): MintState | null {
  if (!account || !isTokenProgram(account.owner)) {
    return null;
  }
  const bytes = toBytes(account.data);
  if (classifySplAccount(bytes) !== 'mint') {
    return null;
  }
  try {
    const mint = getMintDecoder().decode(bytes);
    return { decimals: mint.decimals, supply: mint.supply };
  } catch {
    return null;
  }
}

// ============================================================================
// RPC orchestration
// ============================================================================

/** Options for {@link previewTransactionEffects}. */
export interface PreviewOptions {
  /**
   * Ticker lookup for the mints that appear in the preview. Synchronous, so a
   * preview never blocks on, or fails because of, a token-list request.
   */
  readonly resolveSymbol?: ResolveSymbolFn;
}

/** Reads accounts in chunks, because the RPC caps a request at 100 addresses. */
async function fetchAccounts(
  rpc: SolanaRpc,
  addresses: readonly Address[]
): Promise<Map<Address, RawAccount | null>> {
  const result = new Map<Address, RawAccount | null>();
  for (let i = 0; i < addresses.length; i += MAX_ACCOUNTS_PER_REQUEST) {
    const chunk = addresses.slice(i, i + MAX_ACCOUNTS_PER_REQUEST);
    const { value } = await rpc.getMultipleAccounts(chunk, { encoding: 'base64' }).send();
    chunk.forEach((address, index) => {
      result.set(address, (value[index] as RawAccount | null) ?? null);
    });
  }
  return result;
}

/**
 * Every account key the transaction will load.
 *
 * Static keys come straight out of the compiled message; the rest are resolved
 * by reading the address lookup tables the message points at. Read-only
 * accounts are deliberately NOT filtered out: the saving is not worth the risk
 * of a bad index calculation silently dropping the user's own token account and
 * turning a real balance change into a confident "nothing happens".
 *
 * @returns The account keys, or `null` when a lookup table could not be read.
 */
async function resolveAccountKeys(
  rpc: SolanaRpc,
  wireTransaction: Base64EncodedWireTransaction
): Promise<readonly Address[] | null> {
  const bytes = new Uint8Array(getBase64Encoder().encode(wireTransaction));
  const { messageBytes } = getTransactionDecoder().decode(bytes);
  const message = getCompiledTransactionMessageDecoder().decode(messageBytes);

  const lookups = 'addressTableLookups' in message ? (message.addressTableLookups ?? []) : [];
  if (lookups.length === 0) {
    return message.staticAccounts;
  }

  const tables = await fetchAccounts(
    rpc,
    lookups.map((lookup) => lookup.lookupTableAddress)
  );

  const loaded: Address[] = [];
  for (const lookup of lookups) {
    const account = tables.get(lookup.lookupTableAddress);
    if (!account) {
      return null;
    }
    const table = getAddressLookupTableDecoder().decode(toBytes(account.data));
    for (const index of [...lookup.writableIndexes, ...lookup.readonlyIndexes]) {
      const address = table.addresses[index];
      if (!address) {
        return null;
      }
      loaded.push(address);
    }
  }
  return [...message.staticAccounts, ...loaded];
}

/** Builds an `undetermined` result. */
function undetermined(
  account: Address,
  reason: UndeterminedReason,
  detail: string
): UndeterminedEffects {
  return { kind: 'undetermined', account, reason, detail };
}

/** Extracts a message from an unknown thrown value. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Previews what a transaction would do to one account's balances.
 *
 * Simulates without signature verification and with a fresh blockhash, so it
 * works on an unsigned, dApp-supplied transaction on an approval screen. It
 * never sends anything.
 *
 * Deltas are reported for `account` and for `account` only. A transaction may
 * touch dozens of accounts; the other accounts' movements are not this
 * function's subject and are not returned.
 *
 * @param rpc - Solana RPC client.
 * @param wireTransaction - The transaction to preview, base64 wire format.
 * @param account - The account whose balances should be reported — normally the
 * wallet address that is being asked to sign.
 * @param options - Optional symbol resolution.
 * @returns One of four typed outcomes. Anything other than `effects` must not
 * be rendered as an empty balance-change list.
 *
 * @example
 * ```typescript
 * const preview = await previewTransactionEffects(rpc, wireTx, wallet.address);
 * switch (preview.kind) {
 *   case 'effects': return <BalanceChanges {...preview} />;
 *   case 'no-effect': return <NoBalanceChange />;
 *   case 'transaction-would-fail': return <WouldFail error={preview.error} />;
 *   case 'undetermined': return <CouldNotDetermine reason={preview.reason} />;
 * }
 * ```
 */
export async function previewTransactionEffects(
  rpc: SolanaRpc,
  wireTransaction: Base64EncodedWireTransaction,
  account: Address,
  options: PreviewOptions = {}
): Promise<TransactionEffects> {
  let addresses: readonly Address[] | null;
  try {
    addresses = await resolveAccountKeys(rpc, wireTransaction);
  } catch (error) {
    return undetermined(account, 'malformed-transaction', errorMessage(error));
  }
  if (!addresses) {
    return undetermined(
      account,
      'account-state-unavailable',
      'An address lookup table this transaction uses could not be read.'
    );
  }

  let before: Map<Address, RawAccount | null>;
  let simulation: Awaited<ReturnType<typeof simulate>>;
  try {
    [before, simulation] = await Promise.all([
      fetchAccounts(rpc, addresses),
      simulate(rpc, wireTransaction, addresses),
    ]);
  } catch (error) {
    return undetermined(account, 'simulation-unavailable', errorMessage(error));
  }

  // `logs === null` means the node rejected the transaction before running it,
  // so there is nothing to diff and nothing to reassure the user with.
  if (simulation.logs === null) {
    return undetermined(
      account,
      'simulation-not-executed',
      'The node did not execute the transaction, so its effects are unknown.'
    );
  }

  if (simulation.err !== null) {
    return {
      kind: 'transaction-would-fail',
      account,
      error: simulation.err,
      logs: simulation.logs,
    };
  }

  if (!simulation.accounts) {
    return undetermined(
      account,
      'account-state-unavailable',
      'The node executed the transaction but returned no post-execution account state.'
    );
  }

  const after = new Map<Address, RawAccount | null>();
  addresses.forEach((address, index) => {
    after.set(address, simulation.accounts?.[index] ?? null);
  });

  // The previewed account existing before but not after is not a drain to
  // zero — it is the node declining to report the one account whose numbers
  // this whole feature is about. Guessing here would put a fabricated,
  // maximally alarming figure in front of the user.
  if (before.get(account) && !after.get(account)) {
    return undetermined(
      account,
      'account-state-unavailable',
      'The node returned no post-execution state for the previewed account.'
    );
  }

  const decode = (accounts: ReadonlyMap<Address, RawAccount | null>) =>
    new Map([...accounts].map(([address, raw]) => [address, decodeAccountState(raw)] as const));

  const beforeStates = decode(before);
  const afterStates = decode(after);

  const mints = await fetchMints(rpc, [beforeStates, afterStates], [before, after]);

  return deriveEffects({
    account,
    before: beforeStates,
    after: afterStates,
    mints,
    feeLamports:
      simulation.fee === null || simulation.fee === undefined ? null : BigInt(simulation.fee),
    resolveSymbol: options.resolveSymbol,
  });
}

/** The subset of the simulation response this module consumes. */
interface SimulationResponse {
  readonly err: TransactionError | null;
  readonly logs: readonly string[] | null;
  readonly fee?: bigint | null;
  readonly accounts: readonly (RawAccount | null)[] | null;
}

/**
 * Asks the node to run the transaction and hand back the post-execution state
 * of every account it loads.
 *
 * `sigVerify: false` with `replaceRecentBlockhash: true` is what allows an
 * unsigned transaction to be previewed; the two options are mutually exclusive
 * at the RPC, and signature verification is the one worth giving up, since a
 * preview happens before there is a signature to verify.
 */
async function simulate(
  rpc: SolanaRpc,
  wireTransaction: Base64EncodedWireTransaction,
  addresses: readonly Address[]
): Promise<SimulationResponse> {
  const { value } = await rpc
    .simulateTransaction(wireTransaction, {
      accounts: { addresses, encoding: 'base64' },
      encoding: 'base64',
      replaceRecentBlockhash: true,
      sigVerify: false,
    })
    .send();
  return value as unknown as SimulationResponse;
}

/**
 * Reads the mints behind the previewed token accounts, for decimals and supply.
 *
 * A mint is only present in the transaction's own account list for the
 * `*Checked` instructions, so it is fetched separately when missing.
 */
async function fetchMints(
  rpc: SolanaRpc,
  states: readonly ReadonlyMap<Address, AccountState | null>[],
  raw: readonly ReadonlyMap<Address, RawAccount | null>[]
): Promise<Map<Address, MintState>> {
  const wanted = new Set<Address>();
  for (const snapshot of states) {
    for (const state of snapshot.values()) {
      if (state?.token) {
        wanted.add(state.token.mint);
      }
    }
  }

  const mints = new Map<Address, MintState>();
  for (const snapshot of raw) {
    for (const [address, account] of snapshot) {
      if (!wanted.has(address)) continue;
      const mint = decodeMintState(account);
      if (mint) {
        mints.set(address, mint);
        wanted.delete(address);
      }
    }
  }

  if (wanted.size > 0) {
    const fetched = await fetchAccounts(rpc, [...wanted]);
    for (const [address, account] of fetched) {
      const mint = decodeMintState(account);
      if (mint) {
        mints.set(address, mint);
      }
    }
  }
  return mints;
}
