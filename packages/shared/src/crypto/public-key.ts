/**
 * Public-key parsing for watch-only account import.
 *
 * The counterpart to `crypto/private-key`, and deliberately much smaller: an
 * address is public, so there is nothing here to protect. What there is to get
 * right is refusing an address the wallet could never read from — a truncated
 * paste, or an address from another chain — before it becomes an account the
 * user then has to delete.
 *
 * `isAddress` from kit is the whole check: base58, decoding to 32 bytes. It
 * does NOT test curve membership — a PDA or program address passes — and that
 * is deliberate here. Those are real addresses that hold real balances, and
 * watching one is harmless; the wallet only ever reads from it. What the check
 * does catch is the failure that actually happens: a truncated paste, or an
 * address from another chain.
 *
 * @module crypto/public-key
 */

import { isAddress } from '@solana/kit';

/**
 * Why a pasted address was rejected. Values are i18n keys, matching the
 * convention `crypto/private-key` established.
 */
export type PublicKeyErrorReason =
  | 'wallet.watchOnly.errors.empty'
  | 'wallet.watchOnly.errors.format'
  | 'wallet.watchOnly.errors.looksLikeSecret';

export type ParsePublicKeyResult =
  | { ok: true; address: string }
  | { ok: false; reason: PublicKeyErrorReason };

/**
 * A base58 string long enough to be a 64-byte secret key rather than a
 * 32-byte address. Used only to give a clearer refusal, never to validate.
 */
const SECRET_KEY_BASE58_MIN_LENGTH = 80;

/**
 * Parses and validates a Solana address for watch-only import.
 *
 * @param input - Raw user input, trimmed internally
 * @returns The canonical address, or an i18n key explaining the refusal
 */
export function parseSolanaPublicKey(input: string): ParsePublicKeyResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, reason: 'wallet.watchOnly.errors.empty' };
  }

  // A user who pastes a private key into this field has made a dangerous
  // mistake, and "invalid address" would not tell them so. The length check is
  // a heuristic for the message only — the address validation below is what
  // actually decides. Note this never echoes the input.
  if (trimmed.length >= SECRET_KEY_BASE58_MIN_LENGTH || trimmed.startsWith('[')) {
    return { ok: false, reason: 'wallet.watchOnly.errors.looksLikeSecret' };
  }

  if (!isAddress(trimmed)) {
    return { ok: false, reason: 'wallet.watchOnly.errors.format' };
  }

  return { ok: true, address: trimmed };
}
