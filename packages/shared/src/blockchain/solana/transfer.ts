/**
 * Solana Transfer Service
 * Migrated from salmon-wallet-v2/src/adapter/services/solana/solana-transfer-service.js
 *
 * Provides functionality for transferring SOL and SPL tokens on Solana.
 * Supports both legacy SPL Token Program and Token-2022 extensions.
 *
 * Features:
 * - Native SOL transfers
 * - SPL token transfers (Token Program and Token-2022)
 * - Transfer fee handling for Token-2022
 * - Memo support for Token-2022 transfers
 * - Fee estimation
 *
 * Instructions are built with @solana-program/token-2022 for BOTH token
 * programs: @solana-program/token does not load against @solana/kit@7, and
 * Token-2022's instruction set is a superset of the classic one, so passing the
 * classic program address through `programAddress` / `tokenProgram` emits
 * byte-identical instructions.
 */

import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  assertAccountExists,
  compileTransaction,
  createTransactionMessage,
  decodeAccount,
  fetchEncodedAccount,
  getI64Decoder,
  getStructDecoder,
  getU64Decoder,
  getBase64Decoder,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  unwrapOption,
  setTransactionMessageConfig,
} from '@solana/kit';
import type {
  Base64EncodedWireTransaction,
  Address,
  Instruction,
  Signature,
  TransactionMessageBytesBase64,
  TransactionSigner,
  V1TransactionConfig,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { sendExpectingOutcome } from './confirm';
import { getAddMemoInstruction } from '@solana-program/memo';
import { getSetComputeUnitPriceInstruction } from '@solana-program/compute-budget';
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  fetchMaybeToken,
  fetchMint,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedWithFeeInstruction,
  getTransferInstruction,
} from '@solana-program/token-2022';
import type { Extension, TransferFee } from '@solana-program/token-2022';

import { applyDecimals, parseDecimal, shiftDecimal, toBaseUnits } from '../../utils/decimals';
import { isNativeSol } from '../../utils/tokens';
import { LAMPORTS_PER_SOL, SOL_CONSTANTS } from '../../utils/balance';
import type { SolanaRpc } from './networks';
import { resolvePriorityFeeMicroLamports, toPriorityFeeLamports } from './priority-fee';

// ============================================================================
// Constants
// ============================================================================

/** Native SOL mint address (wrapped SOL) */
export const SOL_ADDRESS = SOL_CONSTANTS.ADDRESS;

/** Denominator of a transfer-fee basis-point rate. */
const ONE_IN_BASIS_POINTS = 10_000n;

/**
 * The classic SPL Memo program (v3), immutable. @solana-program/memo ≥ 0.14
 * defaults to Memo v4 (Memo4c2p…), which is upgradeable, unaudited as far as we
 * know, and invisible to RPC nodes older than Agave 4.2 — so a recipient that
 * reads deposit memos could miss ours. Moving to v4 is a deliberate decision.
 */
const MEMO_PROGRAM_ADDRESS = address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// ============================================================================
// Types
// ============================================================================

/**
 * Options for creating a transfer transaction
 */
/** The transaction message versions Send can build; see SOLANA_TRANSACTION_VERSION. */
export type TransferTransactionVersion = 0 | 1;

export interface TransferOptions {
  /** Simulate transaction instead of sending */
  simulate?: boolean;
  /** Message version to build; defaults to 0 (see `SOLANA_TRANSACTION_VERSION`) */
  version?: TransferTransactionVersion;
  /** Memo instruction placed immediately before the transfer instruction */
  memo?: string;
  /** Token decimals (used as fallback if mint lookup fails) */
  decimals?: number;
  /**
   * Solana Pay references: keys the transfer instruction carries as read-only
   * non-signers, in order, so the receiver's wallet finds the payment by them.
   */
  references?: readonly string[];
  /**
   * The user asked for the whole balance (Max). On a mint whose displayed
   * amount carries a multiplier, the shown balance converted back can fall
   * short of the raw balance, so the transfer sends the account's raw balance
   * when it shows as the amount on screen.
   */
  max?: boolean;
  /**
   * The amount exactly as typed. On a mint with a display multiplier it is
   * converted from this text, which a floating-point `amount` can misread.
   */
  amountText?: string;
}

/** Payload returned by `simulateTransaction` when `TransferOptions.simulate` is set. */
export type SimulatedTransferResponse = Awaited<
  ReturnType<ReturnType<SolanaRpc['simulateTransaction']>['send']>
>['value'];

/** A transaction message ready to be signed and submitted, in either version. */
type TransferTransactionMessage = Awaited<ReturnType<typeof buildTransactionMessage>>;

/**
 * Result of a transfer operation
 */
export interface TransferResult {
  /** Transaction ID (signature) */
  txId: Signature | SimulatedTransferResponse;
  /** Block height after which the sent transaction can never land — the bound of the confirmation wait. */
  lastValidBlockHeight: bigint;
  /**
   * The signed bytes exactly as broadcast, base64. Re-sending these is safe by
   * construction — same blockhash, same signature — which is what lets the
   * confirmation wait cover a node that dropped the transaction. Absent on a
   * simulation, which broadcasts nothing.
   */
  wireTransaction?: Base64EncodedWireTransaction;
}

/**
 * Options for estimating transaction fees
 */
export interface EstimateFeeOptions {
  /** Token decimals (used as fallback) */
  decimals?: number;
  /** Message version to estimate on; the same one the send will build */
  version?: TransferTransactionVersion;
}

/**
 * Transfer fee information for Token-2022 tokens
 */
export interface TransferFeeInfo {
  /** Fee amount in token's smallest unit */
  fee: bigint;
  /** Maximum fee amount */
  maximumFee: bigint;
  /** Fee basis points */
  transferFeeBasisPoints: number;
}

// ============================================================================
// Helpers
// ============================================================================

/** Reads the owning program of an account, which for a mint is its token program. */
async function getAccountOwner(rpc: SolanaRpc, account: Address): Promise<Address | null> {
  const { value } = await rpc.getAccountInfo(account, { encoding: 'base64' }).send();
  return value?.owner ?? null;
}

/** Extensions of a decoded mint or token account, as a plain array. */
function getExtensions(extensions: ReturnType<typeof unwrapOption<Extension[]>>): Extension[] {
  return extensions ?? [];
}

/**
 * Ported verbatim from @solana/spl-token's `calculateFee`.
 * @solana-program/token-2022 ships no fee arithmetic: the basis-point fee is
 * ceil-divided and then clamped to the schedule's maximum.
 */
function calculateFee(transferFee: TransferFee, preFeeAmount: bigint): bigint {
  const basisPoints = BigInt(transferFee.transferFeeBasisPoints);
  if (basisPoints === 0n || preFeeAmount === 0n) {
    return 0n;
  }
  const numerator = preFeeAmount * basisPoints;
  const rawFee = (numerator + ONE_IN_BASIS_POINTS - 1n) / ONE_IN_BASIS_POINTS;
  return rawFee > transferFee.maximumFee ? transferFee.maximumFee : rawFee;
}

/** The fee a Token-2022 transfer-fee schedule takes from `rawAmount`, in the current epoch. */
async function transferFeeFor(
  rpc: SolanaRpc,
  config: Extract<Extension, { __kind: 'TransferFeeConfig' }>,
  rawAmount: bigint
): Promise<bigint> {
  // Token-2022 mints can schedule a fee change for a future epoch; the older
  // schedule stays in force until that epoch is reached.
  const { epoch } = await rpc.getEpochInfo().send();
  const schedule =
    BigInt(epoch) >= config.newerTransferFee.epoch
      ? config.newerTransferFee
      : config.olderTransferFee;
  return calculateFee(schedule, rawAmount);
}

const CLOCK_SYSVAR_ADDRESS = address('SysvarC1ock11111111111111111111111111111111');

/** The Clock sysvar's layout (`solana-clock`); only the unix timestamp is read. */
const clockDecoder = getStructDecoder([
  ['slot', getU64Decoder()],
  ['epochStartTimestamp', getI64Decoder()],
  ['epoch', getU64Decoder()],
  ['leaderScheduleEpoch', getU64Decoder()],
  ['unixTimestamp', getI64Decoder()],
]);

/** Seconds in the 365.24-day year `interest_bearing_mint` compounds over. */
const SECONDS_PER_YEAR = 60 * 60 * 24 * 365.24;

/**
 * How close to a scheduled multiplier change a transfer is refused. A
 * transaction converted before the switch can land after it — its blockhash
 * stays valid for about a minute, and the chain clock follows validators'
 * votes rather than the wall — so within this window the amount shown and the
 * amount signed could part.
 */
const MULTIPLIER_SWITCH_MARGIN_SECONDS = 5n * 60n;

/** A mint's display multiplier and the extension it comes from. */
interface DisplayMultiplier {
  multiplier: number;
  kind: 'scaled' | 'interest';
}

/**
 * The multiplier a Token-2022 mint applies to the amount its holders see, or
 * `null` for a mint that shows its raw amount. Scaled UI Amount stores one
 * (a split, a rebase) and swaps in its scheduled successor once the chain
 * clock reaches the effective time; Interest Bearing compounds a rate
 * continuously, so it grows with every second. Both are read from the mint and
 * the chain's own clock (at `confirmed`), the inputs the token program itself
 * uses, and computed as the program does (`interface/src/extension/
 * scaled_ui_amount` and `interest_bearing_mint` in solana-program/token-2022).
 *
 * @throws When the clock cannot be read, the multiplier is not a positive
 * number, or a change of multiplier is due within the margin: an amount that
 * cannot be converted reliably is not sent.
 */
async function readDisplayMultiplier(
  rpc: SolanaRpc,
  extensions: Extension[]
): Promise<DisplayMultiplier | null> {
  const scaled = extensions.find((ext) => ext.__kind === 'ScaledUiAmountConfig');
  const interest = extensions.find((ext) => ext.__kind === 'InterestBearingConfig');
  if (!scaled && !interest) return null;

  const clock = await fetchEncodedAccount(rpc, CLOCK_SYSVAR_ADDRESS, { commitment: 'confirmed' });
  assertAccountExists(clock);
  const now = decodeAccount(clock, clockDecoder).data.unixTimestamp;

  if (scaled && scaled.newMultiplier !== scaled.multiplier) {
    const untilSwitch = scaled.newMultiplierEffectiveTimestamp - now;
    const distance = untilSwitch < 0n ? -untilSwitch : untilSwitch;
    if (distance <= MULTIPLIER_SWITCH_MARGIN_SECONDS) {
      throw new Error('Token mint display multiplier is about to change');
    }
  }

  const growth = (rate: number, from: bigint, to: bigint) =>
    Math.exp((rate * Number(to - from)) / SECONDS_PER_YEAR / Number(ONE_IN_BASIS_POINTS));
  const multiplier = scaled
    ? now >= scaled.newMultiplierEffectiveTimestamp
      ? scaled.newMultiplier
      : scaled.multiplier
    : interest
      ? growth(
          interest.preUpdateAverageRate,
          interest.initializationTimestamp,
          interest.lastUpdateTimestamp
        ) * growth(interest.currentRate, interest.lastUpdateTimestamp, now)
      : Number.NaN;
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new Error(`Token mint display multiplier is not usable: ${multiplier}`);
  }
  return { multiplier, kind: scaled ? 'scaled' : 'interest' };
}

/** A multiplier as an exact decimal, `units × 10^exponent`. */
type ExactMultiplier = ReturnType<typeof parseDecimal>;

/** How `raw` shows, in the mint's base units: `trunc(raw × multiplier)`. */
function shownBaseUnits(raw: bigint, { units, exponent }: ExactMultiplier): bigint {
  return shiftDecimal(raw * units, exponent);
}

/**
 * Raw base units for an amount typed as the holder sees it, on a mint whose
 * displayed amount is `raw × multiplier`, truncated to the mint's decimals.
 *
 * The answer is the smallest raw amount that shows as exactly what was typed;
 * when no raw amount does (a large multiplier leaves gaps), the largest that
 * shows as less, so the transfer never moves more than the user saw. Token-2022's
 * own UiAmountToAmount does this in floating point, which its interface says
 * is "not guaranteed to give consistent behavior"; here the amount is read as
 * the text typed and the multiplier as its shortest round-trip decimal, and the
 * division is done on integers.
 */
function displayToRawAmount(target: bigint, multiplier: ExactMultiplier): bigint {
  const { units, exponent } = multiplier;
  // target / multiplier, as numerator / denominator.
  const [numerator, denominator] =
    exponent >= 0
      ? [target, shiftDecimal(units, exponent)]
      : [shiftDecimal(target, -exponent), units];
  const smallest = (numerator + denominator - 1n) / denominator;
  return shownBaseUnits(smallest, multiplier) === target ? smallest : smallest - 1n;
}

/**
 * The raw amount a transfer of `amount` (as the holder sees it, typed as
 * `amountText` when known) moves. Unchanged for a mint without a display
 * multiplier; on one with, converted at the multiplier in force now. On Max it
 * is the whole raw balance of `maxSource` — but only when that balance shows
 * as the amount on screen: exactly on a scaled mint, within one display unit on
 * an interest-bearing one, whose balance grows between the read and the send.
 * Otherwise (funds arrived, or left) it is the amount shown.
 */
async function rawTransferAmount(
  rpc: SolanaRpc,
  extensions: Extension[],
  amount: number,
  decimals: number,
  { amountText, maxSource }: { amountText?: string; maxSource?: Address } = {}
): Promise<bigint> {
  const display = await readDisplayMultiplier(rpc, extensions);
  if (display === null) return BigInt(applyDecimals(amount, decimals));

  const multiplier = parseDecimal(display.multiplier);
  const target = toBaseUnits(amountText ?? amount, decimals);
  const shown = displayToRawAmount(target, multiplier);
  if (!maxSource) return shown;

  const source = await fetchMaybeToken(rpc, maxSource);
  if (!source.exists) return shown;
  const gap = shownBaseUnits(source.data.amount, multiplier) - target;
  const tolerance = display.kind === 'interest' ? 1n : 0n;
  return gap >= -tolerance && gap <= tolerance ? source.data.amount : shown;
}

/**
 * The resource budget a legacy/v0 transaction gets without asking: 200k compute
 * units per instruction (capped at the transaction maximum) and 64 MiB of loaded
 * account data. A v1 message that leaves these unset is budgeted zero of each
 * and fails at preflight (`Transaction exceeded max loaded accounts data size
 * cap`, measured on devnet), so the transfer writes the same budget into the
 * header the runtime used to assume.
 */
const V0_COMPUTE_UNITS_PER_INSTRUCTION = 200_000;
const MAX_COMPUTE_UNIT_LIMIT = 1_400_000;
const V0_LOADED_ACCOUNTS_DATA_SIZE_LIMIT = 64 * 1024 * 1024;

/**
 * The Solana Pay wire shape: references ride on the transfer instruction as
 * read-only non-signer metas, appended after the program's own accounts. The
 * kit builders take no extra metas, so they are added to the built instruction.
 */
function withReferences<T extends Instruction>(
  instruction: T,
  references: readonly string[] | undefined
): T {
  if (!references || references.length === 0) return instruction;
  return {
    ...instruction,
    accounts: [
      ...(instruction.accounts ?? []),
      ...references.map((reference) => ({
        address: address(reference),
        role: AccountRole.READONLY,
      })),
    ],
  };
}

/** The v1 header equivalent of what a v0 transaction with `instructions` is granted. */
export function v1ResourceBudget(instructions: readonly Instruction[]): V1TransactionConfig {
  return {
    computeUnitLimit: Math.min(
      V0_COMPUTE_UNITS_PER_INSTRUCTION * instructions.length,
      MAX_COMPUTE_UNIT_LIMIT
    ),
    loadedAccountsDataSizeLimit: V0_LOADED_ACCOUNTS_DATA_SIZE_LIMIT,
  };
}

/**
 * Assembles a transaction message paid for and signed by `signer`.
 *
 * A v1 message (SIMD-0296) admits no address-lookup-table instructions; the
 * transfer never used any. Each `createTransactionMessage` call keeps its
 * literal version so kit's typed message shapes carry through to the signer,
 * and the v1 branch writes the resource budget v0 received implicitly.
 */
// ponytail: a fixed v0-equivalent compute budget, not a measured one; simulate
// for `unitsConsumed` and size the limit to it if the fee ever needs to be
// tighter than the clamp in `priority-fee.ts` makes it.
async function buildTransactionMessage(
  rpc: SolanaRpc,
  signer: TransactionSigner,
  instructions: Instruction[],
  version: TransferTransactionVersion = 0
) {
  // The base fee buys no priority, so a transfer that bids nothing waits out
  // its blockhash whenever the network is busy. Both formats carry the same
  // bid; only the way they express it differs.
  const [{ value: latestBlockhash }, priorityFeeMicroLamports] = await Promise.all([
    rpc.getLatestBlockhash().send(),
    resolvePriorityFeeMicroLamports(rpc, instructions),
  ]);

  if (version === 0) {
    // Legacy and v0 read the bid off a ComputeBudget instruction, as a price
    // per compute unit against the 200k-per-instruction default.
    const priced = [
      getSetComputeUnitPriceInstruction({ microLamports: BigInt(priorityFeeMicroLamports) }),
      ...instructions,
    ];
    return pipe(
      createTransactionMessage({ version: 0 }),
      (message) => setTransactionMessageFeePayerSigner(signer, message),
      (message) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
      (message) => appendTransactionMessageInstructions(priced, message)
    );
  }

  // v1 takes ComputeBudget instructions out of the picture: the budget and the
  // bid live in the message header, and the bid is one total figure in
  // lamports rather than a rate.
  const budget = v1ResourceBudget(instructions);
  return pipe(
    createTransactionMessage({ version: 1 }),
    (message) => setTransactionMessageFeePayerSigner(signer, message),
    (message) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
    (message) => appendTransactionMessageInstructions(instructions, message),
    (message) =>
      setTransactionMessageConfig(
        {
          ...budget,
          priorityFeeLamports: toPriorityFeeLamports(
            priorityFeeMicroLamports,
            budget.computeUnitLimit ?? 0
          ),
        },
        message
      )
  );
}

// ============================================================================
// Transfer Functions
// ============================================================================

/**
 * Creates and executes a transfer transaction for SOL or SPL tokens
 *
 * @param rpc - Solana RPC client
 * @param signer - Sender's transaction signer
 * @param to - Recipient's address
 * @param token - Token mint address (SOL_ADDRESS for native SOL)
 * @param amount - Amount to transfer (in human-readable format)
 * @param opts - Transfer options
 * @returns Transfer result with transaction ID
 *
 * @example
 * ```typescript
 * // Transfer SOL
 * const result = await createTransfer(rpc, signer, recipient, SOL_ADDRESS, 1.5);
 *
 * // Transfer SPL token
 * const result = await createTransfer(rpc, signer, recipient, 'TokenMintAddress...', 100);
 * ```
 */
export async function createTransfer(
  rpc: SolanaRpc,
  signer: TransactionSigner,
  to: Address,
  token: string,
  amount: number,
  opts: TransferOptions = {}
): Promise<TransferResult> {
  const { simulate = false } = opts;

  const transaction = isNativeSol(token)
    ? await createSolTransaction(rpc, signer, to, amount, opts)
    : await createSplTransaction(rpc, signer, to, token, amount, opts);

  const { result, wireTransaction } = await executeTransaction(rpc, transaction, simulate);
  return {
    txId: result,
    lastValidBlockHeight: transaction.lifetimeConstraint.lastValidBlockHeight,
    wireTransaction,
  };
}

/**
 * Creates a native SOL transfer transaction message
 *
 * @param rpc - Solana RPC client
 * @param signer - Sender's transaction signer
 * @param to - Recipient's address
 * @param amount - Amount in SOL
 * @param opts - Transfer options (`version`, `memo`, `references` apply)
 * @returns Prepared transaction message
 */
export async function createSolTransaction(
  rpc: SolanaRpc,
  signer: TransactionSigner,
  to: Address,
  amount: number,
  opts: Pick<TransferOptions, 'version' | 'memo' | 'references'> = {}
) {
  const instructions: Instruction[] = [];
  if (opts.memo) {
    instructions.push(
      getAddMemoInstruction(
        { memo: opts.memo, signers: [signer] },
        { programAddress: MEMO_PROGRAM_ADDRESS }
      )
    );
  }
  instructions.push(
    withReferences(
      getTransferSolInstruction({
        source: signer,
        destination: to,
        amount: BigInt(Math.floor(LAMPORTS_PER_SOL * amount)),
      }),
      opts.references
    )
  );
  return buildTransactionMessage(rpc, signer, instructions, opts.version);
}

/**
 * Creates an SPL token transfer transaction message
 *
 * Handles both legacy Token Program and Token-2022:
 * - Automatically detects the token program
 * - Creates destination token account if needed
 * - Handles transfer fees for Token-2022 tokens
 * - Supports memo instructions for Token-2022
 *
 * @param rpc - Solana RPC client
 * @param signer - Sender's transaction signer
 * @param to - Recipient's address
 * @param tokenAddress - Token mint address
 * @param amount - Amount in human-readable format
 * @param opts - Transfer options
 * @returns Prepared transaction message
 */
export async function createSplTransaction(
  rpc: SolanaRpc,
  signer: TransactionSigner,
  to: Address,
  tokenAddress: string,
  amount: number,
  opts: TransferOptions = {}
): Promise<TransferTransactionMessage> {
  const { memo, references } = opts;

  const mintAddress = address(tokenAddress);

  // The mint's owner is its token program (classic Token or Token-2022).
  const tokenProgram = await getAccountOwner(rpc, mintAddress);
  if (!tokenProgram) {
    throw new Error(`Token mint ${tokenAddress} not found`);
  }

  const [fromTokenAddress] = await findAssociatedTokenPda({
    owner: signer.address,
    mint: mintAddress,
    tokenProgram,
  });
  const [toTokenAddress] = await findAssociatedTokenPda({
    owner: to,
    mint: mintAddress,
    tokenProgram,
  });

  const mint = await fetchMint(rpc, mintAddress);
  const decimals = mint.data.decimals ?? opts?.decimals ?? 0;
  const extensions =
    tokenProgram === TOKEN_2022_PROGRAM_ADDRESS
      ? getExtensions(unwrapOption(mint.data.extensions))
      : [];
  const transferAmount = await rawTransferAmount(rpc, extensions, amount, decimals, {
    amountText: opts.amountText,
    maxSource: opts.max ? fromTokenAddress : undefined,
  });

  const instructions: Instruction[] = [
    // Idempotent ATA creation: adds the instruction to the same transaction.
    // If the account already exists the instruction is a no-op on-chain,
    // so there is no need to check beforehand with a separate RPC call.
    // This avoids a separate on-chain transaction that Helius cannot parse.
    // @see https://spl.solana.com/associated-token-account
    getCreateAssociatedTokenIdempotentInstruction({
      payer: signer,
      ata: toTokenAddress,
      owner: to,
      mint: mintAddress,
      tokenProgram,
    }),
  ];

  if (memo) {
    // `signers` is required: without it the instruction carries no accounts at
    // all, and the memo is not attributable to the payer.
    instructions.push(
      getAddMemoInstruction({ memo, signers: [signer] }, { programAddress: MEMO_PROGRAM_ADDRESS })
    );
  }

  const transferFeeConfig = extensions.find((ext) => ext.__kind === 'TransferFeeConfig');

  if (transferFeeConfig) {
    const fee = await transferFeeFor(rpc, transferFeeConfig, transferAmount);

    instructions.push(
      withReferences(
        getTransferCheckedWithFeeInstruction({
          source: fromTokenAddress,
          mint: mintAddress,
          destination: toTokenAddress,
          // Must be the signer, not its address: a bare Address yields a
          // READONLY account meta and the authority silently loses isSigner.
          authority: signer,
          amount: transferAmount,
          decimals,
          fee,
        }),
        references
      )
    );
  } else {
    instructions.push(
      withReferences(
        getTransferInstruction(
          {
            source: fromTokenAddress,
            destination: toTokenAddress,
            // Same signer-vs-address constraint as above.
            authority: signer,
            amount: transferAmount,
          },
          { programAddress: tokenProgram }
        ),
        references
      )
    );
  }

  return buildTransactionMessage(rpc, signer, instructions, opts.version);
}

/**
 * Executes a prepared transaction message
 *
 * @param rpc - Solana RPC client
 * @param transaction - Prepared transaction message
 * @param simulate - Whether to simulate instead of send
 * @returns Transaction signature or simulation result
 */
async function executeTransaction(
  rpc: SolanaRpc,
  transaction: TransferTransactionMessage,
  simulate: boolean
): Promise<{
  result: Signature | SimulatedTransferResponse;
  wireTransaction?: Base64EncodedWireTransaction;
}> {
  const signed = await signTransactionMessageWithSigners(transaction);
  const wireTransaction = getBase64EncodedWireTransaction(signed);

  if (simulate) {
    const { value } = await rpc.simulateTransaction(wireTransaction, { encoding: 'base64' }).send();
    return { result: value };
  }

  // skipPreflight: false (default) ensures transactions are simulated before sending.
  // This prevents loss of fees on transactions that would fail.
  //
  // maxRetries: 0 hands re-broadcasting to us. The node's own retry loop runs
  // on a cadence we cannot see or stop, and the confirmation wait already
  // re-sends these same bytes every couple of seconds
  // (`confirmSolanaSignature`), so leaving the default would put two
  // uncoordinated loops on one transaction. Solana's retry guide asks for
  // exactly this pairing: "set maxRetries to 0 and manually rebroadcast via a
  // custom algorithm".
  // @see https://solana.com/developers/guides/advanced/retry
  // A lost answer can follow a broadcast the node accepted: the caller's
  // confirmation wait settles it by this signature (see `sendExpectingOutcome`).
  const result = await sendExpectingOutcome(
    () =>
      rpc
        .sendTransaction(wireTransaction, {
          encoding: 'base64',
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 0n,
        })
        .send(),
    getSignatureFromTransaction(signed)
  );
  return { result, wireTransaction };
}

/**
 * Re-broadcasts already-signed bytes. Preflight is skipped: the transaction
 * passed it on the way out, and a re-send exists precisely for the case where
 * the cluster has not seen it, so re-simulating only adds latency. `maxRetries`
 * stays at zero here too — the interval driving this is the retry.
 */
export function resendTransaction(
  rpc: SolanaRpc,
  wireTransaction: Base64EncodedWireTransaction
): Promise<Signature> {
  return rpc
    .sendTransaction(wireTransaction, {
      encoding: 'base64',
      skipPreflight: true,
      preflightCommitment: 'confirmed',
      maxRetries: 0n,
    })
    .send();
}

// ============================================================================
// Fee Estimation
// ============================================================================

/**
 * Estimates the transaction fee for a transfer
 *
 * @param rpc - Solana RPC client
 * @param signer - Sender's transaction signer
 * @param to - Recipient's address
 * @param token - Token mint address
 * @param amount - Transfer amount
 * @param opts - Options
 * @returns Estimated fee in lamports or null
 */
export async function estimateFee(
  rpc: SolanaRpc,
  signer: TransactionSigner,
  to: Address,
  token: string,
  amount: number,
  opts: EstimateFeeOptions = {}
): Promise<number | null> {
  const transaction = isNativeSol(token)
    ? await createSolTransaction(rpc, signer, to, amount, opts)
    : await createSplTransaction(rpc, signer, to, token, amount, opts);

  const compiled = compileTransaction(transaction);
  const message = getBase64Decoder().decode(compiled.messageBytes) as TransactionMessageBytesBase64;
  const { value } = await rpc.getFeeForMessage(message).send();
  return value === null ? null : Number(value);
}

/**
 * Calculates the transfer fee for a Token-2022 token with transfer fee extension
 *
 * @param rpc - Solana RPC client
 * @param mint - Token mint address
 * @param amount - Transfer amount (human-readable)
 * @param opts - The same Max and typed-amount inputs the transfer takes, so the
 *   fee is the one the transfer will be charged; Max needs the sending `owner`
 * @returns Fee amount in token's smallest unit, or null if no fee
 */
export async function calculateTransferFee(
  rpc: SolanaRpc,
  mint: string,
  amount: number,
  opts: { max?: boolean; owner?: Address; amountText?: string } = {}
): Promise<bigint | null> {
  if (!mint || isNativeSol(mint)) {
    return null;
  }

  const mintAddress = address(mint);
  const owner = await getAccountOwner(rpc, mintAddress);

  if (owner !== TOKEN_2022_PROGRAM_ADDRESS) {
    return null;
  }

  const mintInfo = await fetchMint(rpc, mintAddress);
  const extensions = getExtensions(unwrapOption(mintInfo.data.extensions));
  const transferFeeConfig = extensions.find((ext) => ext.__kind === 'TransferFeeConfig');

  if (!transferFeeConfig) {
    return null;
  }

  const maxSource =
    opts.max && opts.owner
      ? (
          await findAssociatedTokenPda({
            owner: opts.owner,
            mint: mintAddress,
            tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
          })
        )[0]
      : undefined;
  const transferAmount = await rawTransferAmount(rpc, extensions, amount, mintInfo.data.decimals, {
    amountText: opts.amountText,
    maxSource,
  });
  return transferFeeFor(rpc, transferFeeConfig, transferAmount);
}

// ============================================================================
// Memo Requirements
// ============================================================================

/**
 * Checks if the destination token account requires a memo for transfers
 *
 * This is a Token-2022 feature that allows accounts to require
 * incoming transfers to include a memo instruction.
 *
 * @param rpc - Solana RPC client
 * @param to - Recipient's address
 * @param tokenAddress - Token mint address
 * @returns True if memo is required
 */
export async function requiresMemo(
  rpc: SolanaRpc,
  to: Address,
  tokenAddress: string | null | undefined
): Promise<boolean> {
  if (isNativeSol(tokenAddress)) {
    return false;
  }

  const mintAddress = address(tokenAddress!);
  const tokenProgram = await getAccountOwner(rpc, mintAddress);

  if (tokenProgram !== TOKEN_2022_PROGRAM_ADDRESS) {
    return false;
  }

  const [toTokenAddress] = await findAssociatedTokenPda({
    owner: to,
    mint: mintAddress,
    tokenProgram,
  });

  const account = await fetchMaybeToken(rpc, toTokenAddress);
  if (!account.exists) {
    return false;
  }

  const memoDetails = getExtensions(unwrapOption(account.data.extensions)).find(
    (ext) => ext.__kind === 'MemoTransfer'
  );

  return memoDetails?.requireIncomingTransferMemos ?? false;
}
