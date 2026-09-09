/**
 * Types for the transaction effect preview.
 *
 * The result variants are separate on purpose: a caller cannot reach the
 * numbers without first proving, in the type system, which case it is in — so
 * "we failed to simulate" can never be rendered with the same empty UI as
 * "nothing will change". See `simulation.ts` for how they are produced.
 */

import type { Address, TransactionError } from '@solana/kit';

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
  /**
   * The wire transaction declares a version newer than this build decodes
   * (legacy, 0 and 1). Its bytes may well be a valid transaction — which is
   * exactly why it cannot be previewed, and must not be signed blind.
   */
  | 'unsupported-transaction-version'
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
// Snapshot types (decoded account state the derivation diffs)
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

/**
 * Resolves a mint address to a ticker.
 *
 * Synchronous and optional by design: the derivation must stay pure and must
 * never make a preview depend on a token-list request succeeding. Callers pass
 * a lookup into whatever token list they already hold.
 */
export type ResolveSymbolFn = (mint: Address) => string | undefined;

/** Everything `deriveEffects` needs, with all decoding already done. */
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

/** Options for `previewTransactionEffects`. */
export interface PreviewOptions {
  /**
   * Ticker lookup for the mints that appear in the preview. Synchronous, so a
   * preview never blocks on, or fails because of, a token-list request.
   */
  readonly resolveSymbol?: ResolveSymbolFn;
}

// ============================================================================
// RPC wire shapes (internal to the simulation modules)
// ============================================================================

/** Raw account data as the RPC returns it under base64 encoding. */
export type Base64AccountData = readonly [string, 'base64'];

/** The account shape shared by `getMultipleAccounts` and simulated accounts. */
export interface RawAccount {
  readonly lamports: bigint;
  readonly owner: Address;
  readonly data: Base64AccountData;
}

/** The subset of the simulation response this module consumes. */
export interface SimulationResponse {
  readonly err: TransactionError | null;
  readonly logs: readonly string[] | null;
  readonly fee?: bigint | null;
  readonly accounts: readonly (RawAccount | null)[] | null;
}
