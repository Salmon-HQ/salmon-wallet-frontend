/**
 * The one way a Solana account signs.
 *
 * An account's signer is either a kit `KeyPairSigner` (the key lives in this
 * process) or one that holds no key and asks something else to sign — Seed
 * Vault on a Seeker. Both satisfy kit's partial-signer interfaces, so every
 * signing site goes through these two helpers and never reaches into a key:
 * a key-less account then signs everything a key-holding one can.
 *
 * @module blockchain/solana/signing
 */

import {
  createSignableMessage,
  type Address,
  type MessagePartialSigner,
  type SignatureBytes,
  type Transaction,
  type TransactionPartialSigner,
} from '@solana/kit';

/** What an account needs to sign: transactions and raw bytes. */
export type SolanaSigner = TransactionPartialSigner & MessagePartialSigner;

/**
 * Adds the signer's signature to a transaction, leaving every other signature
 * as it was.
 *
 * @throws when the signer is not one of the transaction's required signers —
 *   a signature in a slot the message does not declare would be ignored by the
 *   network at best, and is never what the user approved.
 */
export async function signTransactionWith<T extends Transaction>(
  signer: TransactionPartialSigner,
  transaction: T
): Promise<T> {
  if (!(signer.address in transaction.signatures)) {
    throw new Error(`${signer.address} is not a required signer of this transaction`);
  }
  // The signer interface asks for kit's size and lifetime brands, which are
  // compile-time markers only; `partiallySignTransaction`, which this
  // replaces, never required them, and the callers decode wire bytes.
  const [signatures] = await signer.signTransactions([
    transaction as unknown as Parameters<TransactionPartialSigner['signTransactions']>[0][number],
  ]);
  return withOwnSignature(signer.address, transaction, signatures);
}

/**
 * The transaction with the signer's own slot filled, and nothing else touched:
 * a signer that answers for other addresses cannot overwrite a co-signer's
 * signature, and one that answers nothing is an error, not an unsigned send.
 */
function withOwnSignature<T extends Transaction>(
  signer: Address,
  transaction: T,
  signatures: Readonly<Record<Address, SignatureBytes>> | undefined
): T {
  const own = signatures?.[signer];
  if (!own) throw new Error(`${signer} returned no signature`);
  return Object.freeze({
    ...transaction,
    signatures: Object.freeze({ ...transaction.signatures, [signer]: own }),
  });
}

/**
 * Signs a batch in one request to the signer, so a signer that asks the user
 * (Seed Vault) can group the confirmations instead of asking once per
 * transaction. Same rules as {@link signTransactionWith}, for every element.
 */
export async function signTransactionsWith<T extends Transaction>(
  signer: TransactionPartialSigner,
  transactions: T[]
): Promise<T[]> {
  for (const transaction of transactions) {
    if (!(signer.address in transaction.signatures)) {
      throw new Error(`${signer.address} is not a required signer of this transaction`);
    }
  }
  const dictionaries = await signer.signTransactions(
    transactions as unknown as Parameters<TransactionPartialSigner['signTransactions']>[0]
  );
  return transactions.map((transaction, i) =>
    withOwnSignature(signer.address, transaction, dictionaries[i])
  );
}

/** The signer's ed25519 signature over `bytes`. */
export async function signBytesWith(
  signer: MessagePartialSigner,
  bytes: Uint8Array
): Promise<SignatureBytes> {
  const [signatures] = await signer.signMessages([createSignableMessage(bytes)]);
  const signature = signatures?.[signer.address];
  if (!signature) throw new Error(`${signer.address} returned no signature`);
  return signature;
}
