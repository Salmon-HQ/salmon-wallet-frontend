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
 *
 * Layout: this file orchestrates; the pieces live next to it.
 * - `simulation-types.ts`  — result variants and snapshot types
 * - `simulation-derive.ts` — pure before/after diff
 * - `simulation-decode.ts` — raw RPC account → snapshot
 * - `simulation-rpc.ts`    — account reads and the simulate call
 */

import {
  isSolanaError,
  SOLANA_ERROR__TRANSACTION__VERSION_NUMBER_NOT_SUPPORTED,
} from '@solana/kit';
import type { Address, Base64EncodedWireTransaction } from '@solana/kit';

import type { SolanaRpc } from './networks';
import { decodeAccountState } from './simulation-decode';
import { deriveEffects } from './simulation-derive';
import { fetchAccounts, fetchMints, resolveAccountKeys, simulate } from './simulation-rpc';
import type {
  PreviewOptions,
  RawAccount,
  TransactionEffects,
  UndeterminedEffects,
  UndeterminedReason,
} from './simulation-types';

export { U64_MAX, classifyApprovalScope, deriveEffects } from './simulation-derive';
export { decodeAccountState } from './simulation-decode';
export type {
  AccountState,
  ApprovalGrant,
  ApprovalScope,
  DerivationInput,
  EffectDetails,
  Effects,
  MintState,
  NoEffect,
  PreviewOptions,
  ResolveSymbolFn,
  SolChange,
  TokenAccountState,
  TokenChange,
  TransactionEffects,
  TransactionWouldFail,
  UndeterminedEffects,
  UndeterminedReason,
} from './simulation-types';

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
    const reason = isSolanaError(error, SOLANA_ERROR__TRANSACTION__VERSION_NUMBER_NOT_SUPPORTED)
      ? 'unsupported-transaction-version'
      : 'malformed-transaction';
    return undetermined(account, reason, errorMessage(error));
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
