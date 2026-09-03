/**
 * Bitcoin Transfer Service
 * Migrated from salmon-wallet-v2/src/adapter/services/bitcoin/bitcoin-transfer-service.js
 *
 * Provides functionality for creating and broadcasting Bitcoin transactions.
 * Uses bitcoinjs-lib for transaction building and signing.
 *
 * Features:
 * - UTXO-based transaction building
 * - P2PKH (legacy) address support
 * - Fee estimation based on transaction size
 * - Transaction signing with BIP32 node
 * - Transaction broadcasting via API
 */

import * as bitcoin from 'bitcoinjs-lib';
import type { BitcoinNetwork } from '../../types/blockchain';
import { btcToSatoshis, satoshisToBtc, SATOSHIS_PER_BTC } from '../../utils/decimals';
import type {
  UTXO,
  TransferTransactionResult,
  BroadcastResult,
  SigningKeyPair,
  FetchUtxosFn,
  FetchTransactionHexFn,
  BroadcastTransactionFn,
} from '../../types/transfer';

/**
 * Resolved inputs for transaction building
 */
interface ResolvedInputs {
  /** Array of UTXOs to use as inputs */
  inputs: UTXO[];
  /** Total value of all inputs in satoshis */
  totalAmountAvailable: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default fee rate in satoshis per byte */
export const DEFAULT_FEE_RATE = 2;

/** Input size for P2PKH in bytes (approximate) */
const INPUT_SIZE = 146;

/** Output size for P2PKH in bytes */
const OUTPUT_SIZE = 34;

/** Transaction overhead in bytes */
const TX_OVERHEAD = 10;

// ============================================================================
// Fee Estimation
// ============================================================================

/**
 * Estimates the transaction fee based on input and output counts.
 *
 * Uses a simplified formula for P2PKH transactions:
 * fee = (inputCount * 146 + outputCount * 34 + 10 - inputCount) * feeRate
 *
 * @param inputCount - Number of transaction inputs
 * @param outputCount - Number of transaction outputs
 * @param feeRate - Fee rate in satoshis per byte (default: 2)
 * @returns Estimated fee in satoshis
 *
 * @example
 * ```typescript
 * // Estimate fee for 2 inputs and 2 outputs at 2 sat/byte
 * const fee = estimateBitcoinFee(2, 2);
 * console.log(`Fee: ${fee} satoshis`);
 * ```
 */
export function estimateBitcoinFee(
  inputCount: number,
  outputCount: number,
  feeRate: number = DEFAULT_FEE_RATE
): number {
  const transactionSize =
    inputCount * INPUT_SIZE + outputCount * OUTPUT_SIZE + TX_OVERHEAD - inputCount;
  return transactionSize * feeRate;
}

// ============================================================================
// UTXO Management
// ============================================================================

/**
 * Fetches UTXOs for a given address from the API.
 *
 * @param network - Bitcoin network configuration
 * @param address - Bitcoin address to fetch UTXOs for
 * @param fetchUtxos - Function to fetch UTXOs from the API
 * @returns Promise resolving to array of UTXOs
 */
export async function getUtxos(
  network: BitcoinNetwork,
  address: string,
  fetchUtxos: FetchUtxosFn = () => Promise.resolve([])
): Promise<UTXO[]> {
  return fetchUtxos(network.id, address);
}

/**
 * How many previous-transaction lookups may be in flight at once.
 *
 * Four is a compromise, not a measurement: enough that a handful of inputs
 * resolve in one round trip's time, few enough that a wallet with dozens does
 * not look like a burst to a public relay. Raise it only with evidence from a
 * relay that tolerates more.
 */
const TX_HEX_CONCURRENCY = 4;

/**
 * Resolves inputs by fetching UTXOs and calculating total available amount.
 *
 * @param network - Bitcoin network configuration
 * @param sourceAddress - Address to fetch UTXOs from
 * @param fetchUtxos - Function to fetch UTXOs from the API
 * @returns Promise resolving to resolved inputs
 */
async function resolveInputs(
  network: BitcoinNetwork,
  sourceAddress: string,
  fetchUtxos: FetchUtxosFn,
  fetchTransactionHex?: FetchTransactionHexFn
): Promise<ResolvedInputs> {
  const utxos = await getUtxos(network, sourceAddress, fetchUtxos);

  // Every input this wallet spends is P2PKH, so each one has to carry the
  // whole transaction it spends. The UTXO listing does not include it, so it
  // is read here — only for the inputs that arrived without it, so a provider
  // that ever starts sending `rawTx` costs nothing.
  //
  // A few at a time, not all at once. A public relay rate-limits, and a wallet
  // with many small inputs would open one request per input in the same
  // instant and be told to go away — which is the shape of the 429 the
  // backend's own provider already hits walking a large UTXO set. Spending a
  // little wall-clock here is cheaper than a send that dies at the last step.
  const inputs = fetchTransactionHex ? [] : utxos;
  if (fetchTransactionHex) {
    for (let i = 0; i < utxos.length; i += TX_HEX_CONCURRENCY) {
      const window = utxos.slice(i, i + TX_HEX_CONCURRENCY);
      const resolved = await Promise.all(
        window.map(async (utxo) =>
          utxo.rawTx ? utxo : { ...utxo, rawTx: await fetchTransactionHex(network.id, utxo.txid) }
        )
      );
      inputs.push(...resolved);
    }
  }

  const totalAmountAvailable = inputs.reduce((total, utxo) => total + utxo.satoshis, 0);

  return { inputs, totalAmountAvailable };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates that the balance is sufficient for the transaction.
 *
 * @param totalAmountAvailable - Total available balance in satoshis
 * @param satoshiToSend - Amount to send in satoshis
 * @param fee - Transaction fee in satoshis
 * @throws Error if balance is insufficient
 */
function validateBalance(totalAmountAvailable: number, satoshiToSend: number, fee: number): void {
  if (totalAmountAvailable - satoshiToSend - fee < 0) {
    throw new Error('Balance is too low for this transaction');
  }
}

// ============================================================================
// Transaction Building
// ============================================================================

/**
 * Builds a Bitcoin transaction with the specified parameters.
 *
 * @param params - Transaction building parameters
 * @returns Partially signed Bitcoin transaction (PSBT)
 */
function buildTransaction(params: {
  sourceAddress: string;
  receiverAddress: string;
  satoshiToSend: number;
  inputs: UTXO[];
  fee: number;
  network: bitcoin.Network;
}): bitcoin.Psbt {
  const { sourceAddress, receiverAddress, satoshiToSend, inputs, fee, network } = params;

  const psbt = new bitcoin.Psbt({ network });

  // Calculate total input amount
  const totalInput = inputs.reduce((sum, utxo) => sum + utxo.satoshis, 0);

  // Add inputs
  for (const utxo of inputs) {
    // For P2PKH, we need the full previous transaction
    if (utxo.rawTx) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(utxo.rawTx, 'hex'),
      });
    } else {
      throw new Error(
        `UTXO ${utxo.txid}:${utxo.vout} missing rawTx: cannot build secure transaction input`
      );
    }
  }

  // Add output to receiver
  psbt.addOutput({
    address: receiverAddress,
    value: BigInt(satoshiToSend),
  });

  // Add change output back to sender
  const change = totalInput - satoshiToSend - fee;
  if (change > 0) {
    psbt.addOutput({
      address: sourceAddress,
      value: BigInt(change),
    });
  }

  return psbt;
}

// ============================================================================
// Transfer Functions
// ============================================================================

/**
 * Creates a signed Bitcoin transfer transaction.
 *
 * This function:
 * 1. Converts the amount from BTC to satoshis
 * 2. Fetches available UTXOs from the API
 * 3. Estimates the transaction fee
 * 4. Validates sufficient balance
 * 5. Builds and signs the transaction
 *
 * @param network - Bitcoin network configuration
 * @param keyPair - Signing keypair with BIP32 node
 * @param receiverAddress - Recipient's Bitcoin address
 * @param amountBtc - Amount to send in BTC
 * @param fetchUtxos - Function to fetch UTXOs from the API
 * @returns Promise resolving to transaction ID and serialized hex
 *
 * @example
 * ```typescript
 * import { createBitcoinAccount, BITCOIN_NETWORKS } from '@salmon/shared';
 *
 * const account = await createBitcoinAccount({
 *   network: BITCOIN_NETWORKS['bitcoin-mainnet'],
 *   mnemonic: 'your mnemonic...',
 * });
 *
 * const node = account.getBip32Node();
 * if (!node) throw new Error('No signing key available');
 *
 * const keyPair = {
 *   ...account.keyPair,
 *   node,
 * };
 *
 * const result = await createTransferTransaction(
 *   BITCOIN_NETWORKS['bitcoin-mainnet'],
 *   keyPair,
 *   '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
 *   0.001, // 0.001 BTC
 *   fetchUtxos
 * );
 *
 * console.log(`Transaction ID: ${result.txId}`);
 * ```
 */
export async function createTransferTransaction(
  network: BitcoinNetwork,
  keyPair: SigningKeyPair,
  receiverAddress: string,
  amountBtc: number,
  fetchUtxos: FetchUtxosFn = () => Promise.resolve([]),
  fetchTransactionHex?: FetchTransactionHexFn
): Promise<TransferTransactionResult> {
  const sourceAddress = keyPair.address;
  const satoshiToSend = Math.round(amountBtc * SATOSHIS_PER_BTC);

  // Fetch UTXOs and calculate available balance
  const { inputs, totalAmountAvailable } = await resolveInputs(
    network,
    sourceAddress,
    fetchUtxos,
    fetchTransactionHex
  );

  // Estimate fee (2 outputs: receiver + change)
  const outputCount = 2;
  const inputCount = inputs.length;
  const fee = estimateBitcoinFee(inputCount, outputCount);

  // Validate sufficient balance
  validateBalance(totalAmountAvailable, satoshiToSend, fee);

  // Build the transaction
  const psbt = buildTransaction({
    sourceAddress,
    receiverAddress,
    satoshiToSend,
    inputs,
    fee,
    network: network.config.network,
  });

  // Sign all inputs with the private key
  for (let i = 0; i < inputs.length; i++) {
    psbt.signInput(i, {
      publicKey: Buffer.from(keyPair.publicKey),
      sign: (hash: Buffer) => {
        const signature = keyPair.node.sign(hash);
        return Buffer.from(signature);
      },
    });
  }

  // Finalize the transaction
  psbt.finalizeAllInputs();

  // Extract the final transaction
  const tx = psbt.extractTransaction();
  const txId = tx.getId();
  const serializedTx = tx.toHex();

  return { txId, serializedTx };
}

/**
 * Broadcasts a signed transaction to the Bitcoin network.
 *
 * @param network - Bitcoin network configuration
 * @param address - Address associated with the transaction (for API routing)
 * @param serializedTx - Serialized transaction hex
 * @param broadcast - Function to broadcast the transaction via the API
 * @returns Promise resolving to broadcast result
 *
 * @example
 * ```typescript
 * const result = await confirmTransferTransaction(
 *   BITCOIN_NETWORKS['bitcoin-mainnet'],
 *   senderAddress,
 *   signedTxHex,
 *   broadcastTransaction
 * );
 *
 * if (result.success) {
 *   console.log(`Broadcasted: ${result.txId}`);
 * } else {
 *   console.error(`Failed: ${result.error}`);
 * }
 * ```
 */
export async function confirmTransferTransaction(
  network: BitcoinNetwork,
  address: string,
  serializedTx: string,
  broadcast: BroadcastTransactionFn = () =>
    Promise.resolve({ success: false, error: 'No broadcast function provided' })
): Promise<BroadcastResult> {
  try {
    const response = await broadcast(network.id, address, serializedTx);

    return {
      txId: response.txId,
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Creates and broadcasts a Bitcoin transfer in one step.
 *
 * This is a convenience function that combines createTransferTransaction
 * and confirmTransferTransaction.
 *
 * @param network - Bitcoin network configuration
 * @param keyPair - Signing keypair with BIP32 node
 * @param receiverAddress - Recipient's Bitcoin address
 * @param amountBtc - Amount to send in BTC
 * @param fetchUtxos - Function to fetch UTXOs from the API
 * @param broadcast - Function to broadcast the transaction via the API
 * @returns Promise resolving to broadcast result with transaction ID
 *
 * @example
 * ```typescript
 * const result = await sendBitcoin(
 *   BITCOIN_NETWORKS['bitcoin-mainnet'],
 *   keyPair,
 *   '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
 *   0.001,
 *   fetchUtxos,
 *   broadcastTransaction
 * );
 *
 * if (result.success) {
 *   console.log(`Sent! TxID: ${result.txId}`);
 * }
 * ```
 */
export async function sendBitcoin(
  network: BitcoinNetwork,
  keyPair: SigningKeyPair,
  receiverAddress: string,
  amountBtc: number,
  fetchUtxos: FetchUtxosFn = () => Promise.resolve([]),
  broadcast: BroadcastTransactionFn = () =>
    Promise.resolve({ success: false, error: 'No broadcast function provided' }),
  fetchTransactionHex?: FetchTransactionHexFn
): Promise<BroadcastResult> {
  const { txId, serializedTx } = await createTransferTransaction(
    network,
    keyPair,
    receiverAddress,
    amountBtc,
    fetchUtxos,
    fetchTransactionHex
  );

  const result = await confirmTransferTransaction(
    network,
    keyPair.address,
    serializedTx,
    broadcast
  );

  return {
    ...result,
    txId: result.txId ?? txId,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export { btcToSatoshis, satoshisToBtc };

/**
 * Calculates the maximum sendable amount after fees.
 *
 * @param network - Bitcoin network configuration
 * @param address - Source address
 * @param feeRate - Fee rate in satoshis per byte (default: 2)
 * @param fetchUtxos - Function to fetch UTXOs from the API
 * @returns Promise resolving to maximum sendable amount in BTC
 *
 * @example
 * ```typescript
 * const maxAmount = await getMaxSendableAmount(
 *   BITCOIN_NETWORKS['bitcoin-mainnet'],
 *   myAddress,
 *   2,
 *   fetchUtxos
 * );
 * console.log(`Max sendable: ${maxAmount} BTC`);
 * ```
 */
export async function getMaxSendableAmount(
  network: BitcoinNetwork,
  address: string,
  feeRate: number = DEFAULT_FEE_RATE,
  fetchUtxos: FetchUtxosFn = () => Promise.resolve([])
): Promise<number> {
  const { inputs, totalAmountAvailable } = await resolveInputs(network, address, fetchUtxos);

  if (inputs.length === 0) {
    return 0;
  }

  // Only 1 output when sending max (no change)
  const fee = estimateBitcoinFee(inputs.length, 1, feeRate);
  const maxSatoshis = totalAmountAvailable - fee;

  return maxSatoshis > 0 ? satoshisToBtc(maxSatoshis) : 0;
}
