/**
 * core/verify — what a backend-built transaction claims, checked before it is
 * signed.
 *
 * The signing boundary says Salmon's backend never holds a signed transaction:
 * it builds, the device signs, the device broadcasts. That keeps the backend
 * from moving a user's assets. It does not keep a wrong or compromised backend
 * from returning a transaction that does something other than what the screen
 * says, and having the user sign it themselves — because the confirmation
 * screen is drawn from the response's own fields, not from the bytes.
 *
 * This module closes that gap. The caller states what the transaction is for,
 * and the transaction is refused unless it agrees.
 *
 * What is checked, and why only these three:
 *
 * - **The fee payer** is the signing wallet. A transaction that pays from
 *   another account is not this user's to sign.
 * - **Every invoked program** is one the flow declared. Solana requires a
 *   program to be a static account, never one resolved from a lookup table, so
 *   this check cannot be dodged by hiding the program in a table.
 * - **Named accounts are present**, when the message carries no table lookups.
 *   With lookups the static list is incomplete, and an account missing from it
 *   proves nothing, so the check is skipped rather than made to lie.
 */
import { getCompiledTransactionMessageDecoder, getTransactionDecoder } from '@solana/kit';

/** What a flow declares about the transaction it asked the backend to build. */
export interface SolanaTransactionExpectation {
  /** The address that must pay the fee: the signing wallet's own. */
  feePayer: string;
  /** The programs this transaction may invoke. Anything else is refused. */
  allowedPrograms: readonly string[];
  /**
   * Accounts the transaction must name — a mint, a destination. Checked only
   * when the message resolves no addresses through a lookup table.
   */
  requiredAccounts?: readonly string[];
}

/**
 * A flow that has not declared what its transaction may do.
 *
 * Passing this is a decision, not an oversight: it says the caller knows the
 * transaction is unverified. Grep for it to find what is still trusted blindly.
 */
export const UNVERIFIED = 'unverified' as const;
export type Unverified = typeof UNVERIFIED;

/** A compiled message, whichever transaction version it carries. */
type CompiledMessage = ReturnType<
  ReturnType<typeof getCompiledTransactionMessageDecoder>['decode']
>;

/**
 * Which static account each instruction invokes.
 *
 * Legacy and v0 messages carry `instructions`; a v1 message carries
 * `instructionHeaders` instead, and names the same field differently. A shape
 * that is neither is refused rather than waved through: a check that cannot
 * read a transaction has not approved it.
 */
function programIndexes(message: CompiledMessage): number[] {
  if ('instructions' in message) {
    return message.instructions.map((instruction) => instruction.programAddressIndex);
  }
  if ('instructionHeaders' in message) {
    return message.instructionHeaders.map((header) => header.programAccountIndex);
  }
  throw new SolanaTransactionMismatchError(
    'Transaction uses a message version this wallet cannot read before signing'
  );
}

/** Raised when the built transaction disagrees with what the flow declared. */
export class SolanaTransactionMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolanaTransactionMismatchError';
  }
}

/**
 * Refuses a transaction that disagrees with what the flow declared.
 *
 * @param transactionBase64 - The unsigned transaction, base64 wire format.
 * @param expectation - What the flow says the transaction is for.
 * @throws SolanaTransactionMismatchError - On the first disagreement found.
 */
export function assertSolanaTransactionMatches(
  transactionBase64: string,
  expectation: SolanaTransactionExpectation
): void {
  const decoded = getTransactionDecoder().decode(
    new Uint8Array(Buffer.from(transactionBase64, 'base64'))
  );
  const message = getCompiledTransactionMessageDecoder().decode(decoded.messageBytes);
  const accounts = message.staticAccounts.map(String);

  const feePayer = accounts[0];
  if (feePayer !== expectation.feePayer) {
    throw new SolanaTransactionMismatchError(
      `Transaction pays from ${feePayer ?? 'no account'}, not from ${expectation.feePayer}`
    );
  }

  const allowed = new Set(expectation.allowedPrograms);
  for (const index of programIndexes(message)) {
    // A program is always a static account: Solana refuses to invoke one
    // resolved through an address table. An index past the static list is
    // therefore not a program this wallet can account for.
    const program = accounts[index];
    if (program === undefined) {
      throw new SolanaTransactionMismatchError(
        `Transaction invokes an account outside its static list (index ${index})`
      );
    }
    if (!allowed.has(program)) {
      throw new SolanaTransactionMismatchError(
        `Transaction invokes ${program}, which this flow does not use`
      );
    }
  }

  const required = expectation.requiredAccounts ?? [];
  const usesLookupTables =
    'addressTableLookups' in message && (message.addressTableLookups ?? []).length > 0;
  if (required.length === 0 || usesLookupTables) {
    return;
  }

  const named = new Set(accounts);
  for (const account of required) {
    if (!named.has(account)) {
      throw new SolanaTransactionMismatchError(`Transaction does not name ${account}`);
    }
  }
}
