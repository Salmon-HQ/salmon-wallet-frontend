/**
 * Biometric seal — the envelope a biometric unlock opens.
 *
 * The keychain must not hold the vault key. A vault key is bound to the
 * vault's salt, and the salt legitimately rotates (a KDF upgrade, a password
 * change), which orphans anything pinned to it. What the keychain holds here
 * instead is a random wrapping key with no relationship to the vault; the
 * password travels beside it, sealed under that wrapping key, in a record
 * that needs no protection of its own.
 *
 * Neither half is worth anything alone: the sealed record without the
 * wrapping key is ciphertext, and the wrapping key without the record opens
 * nothing. Only the two together yield the password, which then feeds the
 * ordinary password unlock path — so a biometric unlock and a typed unlock
 * run the exact same code, and every vault maintenance step applies to both.
 */

import bs58 from 'bs58';
import { randomBytes, secretbox } from 'tweetnacl';

/**
 * The password, sealed. Stored unprotected beside the biometrically-gated
 * wrapping key — it is inert without it.
 */
export interface SealedPassword {
  /** The secretbox nonce, base58 encoded */
  nonce: string;
  /** The sealed password, base58 encoded */
  sealed: string;
}

/** Thrown when a seal cannot be opened: wrong wrapping key, or tampering. */
export class SealOpenError extends Error {
  constructor(message = 'Failed to open the sealed password') {
    super(message);
    this.name = 'SealOpenError';
    Object.setPrototypeOf(this, SealOpenError.prototype);
  }
}

/**
 * Mints a wrapping key: 32 random bytes, base58 encoded for storage.
 *
 * Single-purpose and disposable — losing one costs the user a re-enrolment,
 * never funds, because the vault does not know this key exists.
 */
export function generateWrapKey(): string {
  return bs58.encode(randomBytes(secretbox.keyLength));
}

/**
 * Seals a password under a wrapping key.
 *
 * @param password - The vault password to seal
 * @param wrapKey - A base58 wrapping key from {@link generateWrapKey}
 */
export function sealPassword(password: string, wrapKey: string): SealedPassword {
  const key = decodeWrapKey(wrapKey);
  const nonce = randomBytes(secretbox.nonceLength);
  const sealed = secretbox(Buffer.from(password, 'utf8'), nonce, key);

  return {
    nonce: bs58.encode(nonce),
    sealed: bs58.encode(sealed),
  };
}

/**
 * Opens a sealed password.
 *
 * @throws {SealOpenError} When the wrapping key is wrong or the record was
 * tampered with — secretbox authenticates, so a modified ciphertext fails
 * rather than yielding garbage.
 */
export function openSealedPassword(record: SealedPassword, wrapKey: string): string {
  const key = decodeWrapKey(wrapKey);

  let opened: Uint8Array | null;
  try {
    opened = secretbox.open(bs58.decode(record.sealed), bs58.decode(record.nonce), key);
  } catch {
    // A malformed base58 field is the same failure as a wrong key, and the
    // caller has the same single remedy: re-arm.
    throw new SealOpenError();
  }

  if (!opened) {
    throw new SealOpenError();
  }

  return Buffer.from(opened).toString('utf8');
}

/** A record is only usable when both halves are present and base58-shaped. */
export function isSealedPassword(value: unknown): value is SealedPassword {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<SealedPassword>;
  return typeof record.nonce === 'string' && typeof record.sealed === 'string';
}

function decodeWrapKey(wrapKey: string): Uint8Array {
  let key: Uint8Array;
  try {
    key = bs58.decode(wrapKey);
  } catch {
    throw new SealOpenError('Wrapping key is not valid base58');
  }

  if (key.length !== secretbox.keyLength) {
    throw new SealOpenError(`Wrapping key must be ${secretbox.keyLength} bytes`);
  }

  return key;
}
