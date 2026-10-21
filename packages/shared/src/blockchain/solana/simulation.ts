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
import { COMPUTE_BUDGET_PROGRAM_ADDRESS } from '@solana-program/compute-budget';
import {
  LEGACY_MEMO_PROGRAM_ADDRESS_V1,
  LEGACY_MEMO_PROGRAM_ADDRESS_V3,
} from '@solana-program/memo';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token-2022';

import type { SolanaRpc } from './networks';
import { decodeAccountState, hasTransferHook } from './simulation-decode';
import { deriveEffects, findUnreadChange } from './simulation-derive';
import { fetchAccountsAt, fetchMints, resolveMessage, simulate } from './simulation-rpc';
import type { ResolvedMessage } from './simulation-rpc';
import type {
  EffectDetails,
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

/**
 * Programs whose every effect on the wallet shows up in the balance diff, and
 * whose behaviour cannot change between the preview and the transaction
 * landing. Compute Budget and the immutable Memo programs write no account;
 * Associated Token only creates token accounts through System and SPL Token.
 * Memo v4 is left out because it is upgradeable.
 */
const ANALYSABLE_PROGRAMS: ReadonlySet<Address> = new Set<Address>([
  SYSTEM_PROGRAM_ADDRESS,
  COMPUTE_BUDGET_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  LEGACY_MEMO_PROGRAM_ADDRESS_V1,
  LEGACY_MEMO_PROGRAM_ADDRESS_V3,
]);

/**
 * The first program the transaction runs that this module cannot read, by
 * name, or `null` when it reads them all. Before the simulation only the
 * top-level programs are known; after it, the loaded accounts and the logs
 * name the programs run through another one.
 */
function findUnreadProgram(
  programs: readonly (Address | undefined)[],
  loaded?: ReadonlyMap<Address, RawAccount | null>,
  logs?: readonly string[] | null
): string | null {
  for (const program of programs) {
    if (!program) return 'an unknown program';
    if (!ANALYSABLE_PROGRAMS.has(program)) return program;
  }
  for (const [address, raw] of loaded ?? []) {
    if (hasTransferHook(raw)) return `the transfer hook of ${address}`;
  }
  for (const line of logs ?? []) {
    const invoked = /^Program (\S+) invoke \[(\d+)\]$/.exec(line);
    if (invoked && Number(invoked[2]) > 1 && !ANALYSABLE_PROGRAMS.has(invoked[1] as Address)) {
      return invoked[1]!;
    }
  }
  return null;
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
  let message: ResolvedMessage | null;
  try {
    message = await resolveMessage(rpc, wireTransaction);
  } catch (error) {
    const reason = isSolanaError(error, SOLANA_ERROR__TRANSACTION__VERSION_NUMBER_NOT_SUPPORTED)
      ? 'unsupported-transaction-version'
      : 'malformed-transaction';
    return undetermined(account, reason, errorMessage(error));
  }
  if (!message) {
    return undetermined(
      account,
      'account-state-unavailable',
      'An address lookup table this transaction uses could not be read.'
    );
  }
  const { addresses } = message;

  // In strict mode a program this module cannot read decides the outcome. Its
  // simulation shows what it did once, not what it will do on chain, so no
  // verdict of the simulation's (not even "would fail") is passed on; the
  // movements it read are kept as `known`, a floor shown beside the warning.
  let unreadProgram = options.strict ? findUnreadProgram(message.programs) : null;
  const unanalysed = (known?: EffectDetails): UndeterminedEffects => ({
    ...undetermined(
      account,
      'unanalysed-program',
      `The transaction runs ${unreadProgram}, which this preview cannot read.`
    ),
    ...(known ? { known } : {}),
  });

  let before: Map<Address, RawAccount | null>;
  let simulation: Awaited<ReturnType<typeof simulate>>;
  try {
    const read = await fetchAccountsAt(rpc, addresses);
    before = read.accounts;
    simulation = await simulate(rpc, wireTransaction, addresses, read.slot);
  } catch (error) {
    return unreadProgram
      ? unanalysed()
      : undetermined(account, 'simulation-unavailable', errorMessage(error));
  }
  if (options.strict) unreadProgram = findUnreadProgram(message.programs, before, simulation.logs);

  // `logs === null` means the node rejected the transaction before running it,
  // so there is nothing to diff and nothing to reassure the user with.
  if (simulation.logs === null) {
    return unreadProgram
      ? unanalysed()
      : undetermined(
          account,
          'simulation-not-executed',
          'The node did not execute the transaction, so its effects are unknown.'
        );
  }

  if (simulation.err !== null) {
    return unreadProgram
      ? unanalysed()
      : { kind: 'transaction-would-fail', account, error: simulation.err, logs: simulation.logs };
  }

  if (!simulation.accounts) {
    return unreadProgram
      ? unanalysed()
      : undetermined(
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

  // System Allocate writes data into the account itself. Nothing moves and
  // the owner stays put, so the diff below sees nothing, yet an account that
  // holds data can no longer send SOL with a System transfer.
  const walletBefore = before.get(account);
  const walletAfter = after.get(account);
  if (walletBefore && walletAfter && walletBefore.data[0] !== walletAfter.data[0]) {
    return undetermined(
      account,
      'unanalysed-account',
      `The transaction writes data into account ${account}.`
    );
  }

  const decode = (accounts: ReadonlyMap<Address, RawAccount | null>) =>
    new Map([...accounts].map(([address, raw]) => [address, decodeAccountState(raw)] as const));

  const beforeStates = decode(before);
  const afterStates = decode(after);

  let mints: Awaited<ReturnType<typeof fetchMints>>;
  try {
    mints = await fetchMints(rpc, [beforeStates, afterStates], [before, after]);
  } catch (error) {
    return undetermined(account, 'simulation-unavailable', errorMessage(error));
  }

  const feeLamports =
    simulation.fee === null || simulation.fee === undefined ? null : BigInt(simulation.fee);
  const effects = deriveEffects({
    account,
    before: beforeStates,
    after: afterStates,
    mints,
    feeLamports,
    resolveSymbol: options.resolveSymbol,
  });
  if (!options.strict || effects.kind === 'undetermined') return effects;

  const known: EffectDetails =
    effects.kind === 'effects'
      ? { sol: effects.sol, tokens: effects.tokens, approvals: effects.approvals }
      : { sol: { lamports: 0n, feeLamports }, tokens: [], approvals: [] };
  if (unreadProgram) return unanalysed(known);

  const changed = findUnreadChange({
    ...message,
    account,
    before,
    after,
    accountFee: message.feePayer === account ? (feeLamports ?? 0n) : 0n,
  });
  return changed
    ? {
        ...undetermined(
          account,
          'unanalysed-account',
          `Account ${changed} changes in a way this preview cannot show.`
        ),
        known,
      }
    : effects;
}
