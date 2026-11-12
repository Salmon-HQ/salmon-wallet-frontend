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
  getTransactionDecoder,
  type Blockhash,
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

/**
 * The signed-case rules alone, on exact bytes; core runs them again right
 * before the key is used.
 */
export async function assertReceivedTransactionSignable(
  transaction: Transaction,
  signer: string
): Promise<void> {
  // ponytail: US1 checks only that the user is an expected signer; the full
  // refusals (signature verification, missing co-signer, filled user slot)
  // land with spec 043 US2 (T038/T041).
  if (!(signer in transaction.signatures)) throw new TransactionRequestError('notForThisAccount');
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
