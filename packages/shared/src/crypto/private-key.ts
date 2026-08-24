/**
 * Private-key parsing for account import.
 *
 * A user pasting a key has it in whichever shape the wallet they are leaving
 * exported: Phantom and this wallet emit base58 of the 64-byte ed25519 secret
 * key, while the Solana CLI, Solflare and `solana-keygen` emit a JSON array of
 * the same 64 bytes. Both are the same secret, so both are accepted and
 * normalised to the one form the rest of the codebase already speaks — the
 * base58 that `SolanaAccount.retrieveSecurePrivateKey()` produces.
 *
 * Nothing in this module logs, throws, or returns the key material itself:
 * failures carry an i18n key and no context, because "invalid key: 3xY..." in a
 * console or a crash report is the leak the whole feature is trying to avoid.
 *
 * @module crypto/private-key
 */

import bs58 from 'bs58';
import { createKeyPairSignerFromBytes } from '@solana/kit';

/** Length of an ed25519 secret key in its `seed ‖ publicKey` form. */
const SECRET_KEY_LENGTH = 64;
/** Length of the bare seed some tools export instead of the full secret key. */
const SEED_LENGTH = 32;

/**
 * Why a pasted private key was rejected. Values are i18n keys — the raw key
 * never travels with the error.
 */
export type PrivateKeyErrorReason =
  | 'wallet.import.errors.empty'
  | 'wallet.import.errors.format'
  | 'wallet.import.errors.length'
  | 'wallet.import.errors.seedOnly'
  | 'wallet.import.errors.invalidKey';

export type ParsePrivateKeyResult =
  | { ok: true; secretKey: Uint8Array; privateKey: string; address: string }
  | { ok: false; reason: PrivateKeyErrorReason };

/**
 * Parses a JSON byte array (`[12,45,...]`), the shape the Solana CLI writes.
 * Returns null when the input is not that shape at all, so the caller can fall
 * through to base58 rather than reporting a JSON error for a base58 typo.
 */
function parseByteArray(input: string): Uint8Array | null {
  if (!input.startsWith('[')) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;
  // A single non-byte entry invalidates the whole array: silently coercing
  // 256 to 0 would import a different, attacker-influenced key.
  if (!parsed.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)) return null;

  return Uint8Array.from(parsed as number[]);
}

function parseBase58(input: string): Uint8Array | null {
  try {
    return bs58.decode(input);
  } catch {
    return null;
  }
}

/**
 * Parses a pasted Solana private key in either accepted format.
 *
 * @param input - Raw user input; surrounding whitespace is tolerated because
 *                copying from a terminal or a file routinely carries it.
 * @returns The decoded key with its canonical base58 form and the address it
 *          controls, or a reason the input was rejected.
 */
export async function parseSolanaPrivateKey(input: string): Promise<ParsePrivateKeyResult> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: 'wallet.import.errors.empty' };

  const bytes = parseByteArray(trimmed) ?? parseBase58(trimmed);
  if (!bytes) return { ok: false, reason: 'wallet.import.errors.format' };

  // A 32-byte input is a seed, not a secret key. It is recoverable in
  // principle, but accepting it silently would import an account whose stored
  // key is a different length than every other one, so it gets its own message
  // instead of a generic length complaint.
  if (bytes.length === SEED_LENGTH) {
    return { ok: false, reason: 'wallet.import.errors.seedOnly' };
  }
  if (bytes.length !== SECRET_KEY_LENGTH) {
    return { ok: false, reason: 'wallet.import.errors.length' };
  }

  // The trailing 32 bytes of an ed25519 secret key claim to be its public key,
  // but nothing so far has checked that they actually match the seed. Kit's
  // signer construction signs and verifies a random challenge, so it rejects a
  // truncated or hand-edited key instead of importing an address the seed
  // cannot sign for — an account that looks right and can never move funds.
  let signer;
  try {
    signer = await createKeyPairSignerFromBytes(bytes, false);
  } catch {
    return { ok: false, reason: 'wallet.import.errors.invalidKey' };
  }

  return {
    ok: true,
    secretKey: bytes,
    privateKey: bs58.encode(bytes),
    address: signer.address,
  };
}
