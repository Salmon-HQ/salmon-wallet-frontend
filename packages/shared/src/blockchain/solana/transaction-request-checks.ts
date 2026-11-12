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
  address,
  assertIsTransactionWithinSizeLimit,
  compileTransaction,
  decompileTransactionMessageFetchingLookupTables,
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  getPublicKeyFromAddress,
  getTransactionDecoder,
  isSolanaError,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  SOLANA_ERROR__ACCOUNTS__ONE_OR_MORE_ACCOUNTS_NOT_FOUND,
  verifySignature,
  type Address,
  type Blockhash,
  type CompiledTransactionMessage,
  type Transaction,
  type TransactionMessageBytes,
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

/**
 * A durable-nonce transaction never expires, so whoever holds the user's
 * signature could send it whenever they liked. The network recognises one by
 * its first instruction: System `AdvanceNonceAccount` (tag 4; the runtime
 * ignores bytes after the tag). A v1 message lays its instructions out as
 * headers and payloads instead of `instructions`.
 */
export function opensWithAdvanceNonce(message: CompiledTransactionMessage): boolean {
  const [program, data] =
    'instructions' in message
      ? [message.instructions[0]?.programAddressIndex, message.instructions[0]?.data]
      : [
          message.instructionHeaders[0]?.programAccountIndex,
          message.instructionPayloads[0]?.instructionData,
        ];
  return (
    program !== undefined &&
    message.staticAccounts[program] === SYSTEM_PROGRAM &&
    data?.[0] === 4 &&
    data[1] === 0 &&
    data[2] === 0 &&
    data[3] === 0
  );
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
  if (opensWithAdvanceNonce(message)) throw new TransactionRequestError('staleOrWrongNetwork');
}

async function assertLifetimeValid(rpc: SolanaRpc, lifetime: string): Promise<void> {
  const { value } = await rpc
    .isBlockhashValid(lifetime as Blockhash, { commitment: 'confirmed' })
    .send();
  if (!value) throw new TransactionRequestError('staleOrWrongNetwork');
}

/**
 * An unsigned transaction becomes the user's to pay: fee payer = the user,
 * lifetime = the latest blockhash. When the user already pays, only the
 * blockhash changes, patched in the compiled message so every other byte
 * stays as the merchant built it; otherwise the message is rebuilt with its
 * lookup tables read, its instructions unchanged.
 */
async function makeTheUserPay(
  rpc: SolanaRpc,
  signer: string,
  transaction: Transaction,
  message: ReturnType<typeof decodeMerchantTransaction>['message']
): Promise<Transaction> {
  const { value: latest } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send();
  if (String(message.staticAccounts[0]) === signer) {
    const messageBytes = getCompiledTransactionMessageEncoder().encode({
      ...message,
      lifetimeToken: latest.blockhash,
    }) as TransactionMessageBytes;
    return { messageBytes, signatures: transaction.signatures };
  }
  let decompiled: Awaited<ReturnType<typeof decompileTransactionMessageFetchingLookupTables>>;
  try {
    decompiled = await decompileTransactionMessageFetchingLookupTables(message, rpc);
  } catch (error) {
    // A lookup table the active network does not have: built for another one.
    if (isSolanaError(error, SOLANA_ERROR__ACCOUNTS__ONE_OR_MORE_ACCOUNTS_NOT_FOUND)) {
      throw new TransactionRequestError('staleOrWrongNetwork');
    }
    throw error;
  }
  return compileTransaction(
    pipe(
      decompiled,
      (m) => setTransactionMessageFeePayer(address(signer), m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latest, m)
    )
  );
}

/**
 * Decodes and checks the merchant's transaction for `signer`. One that
 * arrived signed is kept byte for byte; one that arrived unsigned is made the
 * user's to pay first. Either way the result passes the same checks core runs
 * before signing.
 *
 * @throws TransactionRequestError - With the reason the transaction is refused.
 */
export async function prepareMerchantTransaction(
  rpc: SolanaRpc,
  signer: string,
  transactionBase64: string
): Promise<PreparedMerchantTransaction> {
  const received = decodeMerchantTransaction(transactionBase64);
  const sponsored = Object.values(received.transaction.signatures).some(
    (signature) => signature !== null
  );
  const transaction = sponsored
    ? received.transaction
    : await makeTheUserPay(rpc, signer, received.transaction, received.message);
  const message = sponsored
    ? received.message
    : getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);

  await assertReceivedTransactionSignable(transaction, signer);
  const lifetime = String(message.lifetimeToken);
  // A fresh blockhash needs no asking; the merchant's must still be valid here.
  if (sponsored) await assertLifetimeValid(rpc, lifetime);

  return {
    wire: sponsored ? transactionBase64 : getBase64EncodedWireTransaction(transaction),
    message: bs58.encode(new Uint8Array(transaction.messageBytes)),
    sponsored,
    feePayer: String(message.staticAccounts[0]),
    signer,
    lifetime,
  };
}
