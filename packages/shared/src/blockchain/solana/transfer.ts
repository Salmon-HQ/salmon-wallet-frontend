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
 * - Transaction confirmation
 * - Devnet airdrop support
 *
 * Instructions are built with @solana-program/token-2022 for BOTH token
 * programs: @solana-program/token does not load against @solana/kit@7, and
 * Token-2022's instruction set is a superset of the classic one, so passing the
 * classic program address through `programAddress` / `tokenProgram` emits
 * byte-identical instructions.
 */

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  TransactionSignature,
  RpcResponseAndContext,
  SignatureResult,
} from '@solana/web3.js';
import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase64Decoder,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  unwrapOption,
} from '@solana/kit';
import type {
  Address,
  Instruction,
  Signature,
  TransactionMessageBytesBase64,
  TransactionSigner,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { getAddMemoInstruction } from '@solana-program/memo';
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

import {
  applyDecimals,
} from '../../utils/decimals';
import {
  isNativeSol,
} from '../../utils/tokens';
import { SOL_CONSTANTS } from '../../utils/balance';
import type { SolanaRpc } from './networks';

// ============================================================================
// Constants
// ============================================================================

/** Native SOL mint address (wrapped SOL) */
export const SOL_ADDRESS = SOL_CONSTANTS.ADDRESS;

/** Denominator of a transfer-fee basis-point rate. */
const ONE_IN_BASIS_POINTS = 10_000n;

// ============================================================================
// Types
// ============================================================================

/**
 * Options for creating a transfer transaction
 */
export interface TransferOptions {
  /** Simulate transaction instead of sending */
  simulate?: boolean;
  /** Memo to attach to the transaction (for Token-2022) */
  memo?: string;
  /** Token decimals (used as fallback if mint lookup fails) */
  decimals?: number;
}

/** Payload returned by `simulateTransaction` when `TransferOptions.simulate` is set. */
export type SimulatedTransferResponse = Awaited<
  ReturnType<ReturnType<SolanaRpc['simulateTransaction']>['send']>
>['value'];

/** A transaction message ready to be signed and submitted. */
type TransferTransactionMessage = Awaited<ReturnType<typeof createSolTransaction>>;

/**
 * Result of a transfer operation
 */
export interface TransferResult {
  /** Transaction ID (signature) */
  txId: Signature | SimulatedTransferResponse;
}

/**
 * Options for estimating transaction fees
 */
export interface EstimateFeeOptions {
  /** Token decimals (used as fallback) */
  decimals?: number;
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

/** Assembles a v0 transaction message paid for and signed by `signer`. */
async function buildTransactionMessage(
  rpc: SolanaRpc,
  signer: TransactionSigner,
  instructions: Instruction[]
) {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  return pipe(
    createTransactionMessage({ version: 0 }),
    (message) => setTransactionMessageFeePayerSigner(signer, message),
    (message) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
    (message) => appendTransactionMessageInstructions(instructions, message)
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
    ? await createSolTransaction(rpc, signer, to, amount)
    : await createSplTransaction(rpc, signer, to, token, amount, opts);

  const result = await executeTransaction(rpc, transaction, simulate);
  return { txId: result };
}

/**
 * Creates a native SOL transfer transaction message
 *
 * @param rpc - Solana RPC client
 * @param signer - Sender's transaction signer
 * @param to - Recipient's address
 * @param amount - Amount in SOL
 * @returns Prepared transaction message
 */
export async function createSolTransaction(
  rpc: SolanaRpc,
  signer: TransactionSigner,
  to: Address,
  amount: number
) {
  return buildTransactionMessage(rpc, signer, [
    getTransferSolInstruction({
      source: signer,
      destination: to,
      amount: BigInt(Math.floor(LAMPORTS_PER_SOL * amount)),
    }),
  ]);
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
  const { memo } = opts;

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
  const transferAmount = applyDecimals(amount, decimals);

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
    instructions.push(getAddMemoInstruction({ memo, signers: [signer] }));
  }

  const transferFeeConfig =
    tokenProgram === TOKEN_2022_PROGRAM_ADDRESS
      ? getExtensions(unwrapOption(mint.data.extensions)).find(
          (ext) => ext.__kind === 'TransferFeeConfig'
        )
      : undefined;

  if (transferFeeConfig) {
    const fee = await calculateTransferFee(rpc, tokenAddress, amount);

    instructions.push(
      getTransferCheckedWithFeeInstruction({
        source: fromTokenAddress,
        mint: mintAddress,
        destination: toTokenAddress,
        // Must be the signer, not its address: a bare Address yields a
        // READONLY account meta and the authority silently loses isSigner.
        authority: signer,
        amount: BigInt(transferAmount),
        decimals,
        fee: fee ?? 0n,
      })
    );
  } else {
    instructions.push(
      getTransferInstruction(
        {
          source: fromTokenAddress,
          destination: toTokenAddress,
          // Same signer-vs-address constraint as above.
          authority: signer,
          amount: BigInt(transferAmount),
        },
        { programAddress: tokenProgram }
      )
    );
  }

  return buildTransactionMessage(rpc, signer, instructions);
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
): Promise<Signature | SimulatedTransferResponse> {
  const signed = await signTransactionMessageWithSigners(transaction);
  const wireTransaction = getBase64EncodedWireTransaction(signed);

  if (simulate) {
    const { value } = await rpc
      .simulateTransaction(wireTransaction, { encoding: 'base64' })
      .send();
    return value;
  }

  // skipPreflight: false (default) ensures transactions are simulated before sending.
  // This prevents loss of fees on transactions that would fail.
  // @see https://solana.com/developers/guides/advanced/retry
  return rpc
    .sendTransaction(wireTransaction, {
      encoding: 'base64',
      skipPreflight: false,
      preflightCommitment: 'confirmed',
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
    ? await createSolTransaction(rpc, signer, to, amount)
    : await createSplTransaction(rpc, signer, to, token, amount, opts);

  const compiled = compileTransaction(transaction);
  const message = getBase64Decoder().decode(
    compiled.messageBytes
  ) as TransactionMessageBytesBase64;
  const { value } = await rpc.getFeeForMessage(message).send();
  return value === null ? null : Number(value);
}

/**
 * Calculates the transfer fee for a Token-2022 token with transfer fee extension
 *
 * @param rpc - Solana RPC client
 * @param mint - Token mint address
 * @param amount - Transfer amount (human-readable)
 * @returns Fee amount in token's smallest unit, or null if no fee
 */
export async function calculateTransferFee(
  rpc: SolanaRpc,
  mint: string,
  amount: number
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
  const transferFeeConfig = getExtensions(unwrapOption(mintInfo.data.extensions)).find(
    (ext) => ext.__kind === 'TransferFeeConfig'
  );

  if (!transferFeeConfig) {
    return null;
  }

  // Token-2022 mints can schedule a fee change for a future epoch; the older
  // schedule stays in force until that epoch is reached.
  const { epoch } = await rpc.getEpochInfo().send();
  const transferAmount = BigInt(Math.floor(amount * 10 ** mintInfo.data.decimals));
  const schedule =
    BigInt(epoch) >= transferFeeConfig.newerTransferFee.epoch
      ? transferFeeConfig.newerTransferFee
      : transferFeeConfig.olderTransferFee;

  return calculateFee(schedule, transferAmount);
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

// ============================================================================
// Transaction Confirmation
// ============================================================================

/**
 * Confirms a transaction on the network
 *
 * @param connection - Solana connection
 * @param txId - Transaction signature to confirm
 * @returns Confirmation result
 */
export async function confirmTransaction(
  connection: Connection,
  txId: TransactionSignature
): Promise<RpcResponseAndContext<SignatureResult>> {
  return connection.confirmTransaction(txId);
}

// ============================================================================
// Airdrop (Devnet/Testnet only)
// ============================================================================

/**
 * Requests an airdrop of SOL (devnet/testnet only)
 *
 * @param connection - Solana connection
 * @param publicKey - Public key to receive the airdrop
 * @param amount - Amount in SOL
 * @returns Confirmation result
 *
 * @example
 * ```typescript
 * // Request 1 SOL on devnet
 * const devnetConnection = new Connection('https://api.devnet.solana.com');
 * await airdrop(devnetConnection, myPublicKey, 1);
 * ```
 */
export async function airdrop(
  connection: Connection,
  publicKey: PublicKey,
  amount: number
): Promise<RpcResponseAndContext<SignatureResult>> {
  const airdropSignature = await connection.requestAirdrop(
    publicKey,
    Math.floor(amount * LAMPORTS_PER_SOL)
  );
  return connection.confirmTransaction(airdropSignature);
}
