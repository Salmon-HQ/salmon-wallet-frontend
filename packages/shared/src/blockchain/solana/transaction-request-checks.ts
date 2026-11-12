/**
 * The merchant's transaction, checked by the Solana Pay rules before anything
 * is shown as signable (spec 043, research R3). The result is the one set of
 * bytes that is previewed, shown and signed.
 *
 * A transaction that arrives with signatures (a fee sponsor such as Kora signed
 * first) is never changed: its fee payer, blockhash and every instruction are
 * the merchant's, and the wallet only adds the user's signature at the end.
 */
import bs58 from 'bs58';
import {
  assertIsTransactionWithinSizeLimit,
  getCompiledTransactionMessageDecoder,
  getPublicKeyFromAddress,
  getTransactionDecoder,
  verifySignature,
  type Address,
  type Blockhash,
  type CompiledTransactionMessage,
  type Transaction,
} from '@solana/kit';
import { TransactionRequestError } from './transaction-request';
import type { SolanaRpc } from './networks';

export interface PreparedMerchantTransaction {
  /** Base64 wire bytes, signatures included: exactly what is previewed and signed. */
  wire: string;
  /** Base58 message bytes, for the dApp preview functions. */
  message: string;
  /** Arrived signed: someone else pays the fee and the blockhash is the merchant's. */
  sponsored: boolean;
  feePayer: string;
  /** The address that was posted to the merchant: the only key that may sign. */
  signer: string;
  /** The recent blockhash the message carries. */
  lifetime: string;
}

/**
 * The compiled message and its signature map. The decoder refuses a version
 * it cannot read; the size check refuses what the network would (the same
 * two steps as `buildTransactionFromEncodedMessage`, which this module cannot
 * import without a cycle through the `blockchain/solana` barrel).
 */
function decodeMerchantTransaction(transactionBase64: string) {
  try {
    const transaction = getTransactionDecoder().decode(
      new Uint8Array(Buffer.from(transactionBase64, 'base64'))
    );
    assertIsTransactionWithinSizeLimit(transaction);
    const message = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
    return { transaction, message };
  } catch {
    throw new TransactionRequestError('malformedTransaction');
  }
}

const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const ADVANCE_NONCE_ACCOUNT = [4, 0, 0, 0];

/**
 * A durable-nonce transaction never expires, so a merchant holding the
 * user's signature could send it whenever it liked. The network recognises
 * one by its first instruction: the System program's `AdvanceNonceAccount`.
 */
function usesDurableNonce(message: CompiledTransactionMessage): boolean {
  if (!('instructions' in message)) return false;
  const [first] = message.instructions;
  if (!first || message.staticAccounts[first.programAddressIndex] !== SYSTEM_PROGRAM) return false;
  const data = first.data ?? new Uint8Array();
  return ADVANCE_NONCE_ACCOUNT.every((byte, i) => data[i] === byte);
}

/**
 * The signed-case rules alone, on exact bytes; core runs them again right
 * before the key is used. The user must be asked to sign and not have signed
 * yet; every other party must already have signed, each signature valid over
 * these exact message bytes; and the lifetime must be a blockhash.
 *
 * @throws TransactionRequestError - With the first rule the bytes break.
 */
export async function assertReceivedTransactionSignable(
  transaction: Transaction,
  signer: string
): Promise<void> {
  const { signatures, messageBytes } = transaction;
  if (!(signer in signatures)) throw new TransactionRequestError('notForThisAccount');
  if (signatures[signer as Address] !== null) throw new TransactionRequestError('alreadySigned');

  const others = Object.entries(signatures).filter(([address]) => address !== signer);
  // Nobody else signs after the user: an empty slot means it could never land.
  if (others.some(([, signature]) => !signature)) {
    throw new TransactionRequestError('missingSignature');
  }
  for (const [address, signature] of others) {
    const key = await getPublicKeyFromAddress(address as Address);
    if (!signature || !(await verifySignature(key, signature, messageBytes))) {
      throw new TransactionRequestError('invalidSignature');
    }
  }

  let message: CompiledTransactionMessage;
  try {
    message = getCompiledTransactionMessageDecoder().decode(messageBytes);
  } catch {
    throw new TransactionRequestError('malformedTransaction');
  }
  if (usesDurableNonce(message)) throw new TransactionRequestError('staleOrWrongNetwork');
}

async function assertLifetimeValid(rpc: SolanaRpc, lifetime: string): Promise<void> {
  const { value } = await rpc
    .isBlockhashValid(lifetime as Blockhash, { commitment: 'confirmed' })
    .send();
  if (!value) throw new TransactionRequestError('staleOrWrongNetwork');
}

/**
 * Decodes and checks the merchant's transaction for `signer`.
 *
 * @throws TransactionRequestError - With the reason the transaction is refused.
 */
export async function prepareMerchantTransaction(
  rpc: SolanaRpc,
  signer: string,
  transactionBase64: string
): Promise<PreparedMerchantTransaction> {
  const { transaction, message } = decodeMerchantTransaction(transactionBase64);
  const sponsored = Object.values(transaction.signatures).some((signature) => signature !== null);
  // ponytail: an unsigned transaction is made the user's (fee payer and a
  // fresh blockhash) in spec 043 US3 (T049); until then it is refused.
  if (!sponsored) throw new TransactionRequestError('malformedTransaction');

  await assertReceivedTransactionSignable(transaction, signer);
  const lifetime = String(message.lifetimeToken);
  await assertLifetimeValid(rpc, lifetime);

  return {
    wire: transactionBase64,
    message: bs58.encode(new Uint8Array(transaction.messageBytes)),
    sponsored,
    feePayer: String(message.staticAccounts[0]),
    signer,
    lifetime,
  };
}
