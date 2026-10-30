/**
 * Fresh co-signers (spec 043 FR-041, FR-044): keys core generates for one
 * request, signs with, and drops. A Powerup only ever sees their public keys
 * (`requestFreshSignature` in core/confirmation); this module sits under
 * `core/signing/**`, which the Powerups boundary lint forbids.
 */
import {
  generateKeyPairSigner,
  getAddressEncoder,
  type Address,
  type KeyPairSigner,
  type MessagePartialSigner,
} from '@solana/kit';

import { signBytesWith } from '../../blockchain/solana/signing';
import type { ReadAuthorization } from '../confirmation/types';

/** The most co-signers one proposal may ask for (spec 043 O2). */
export const MAX_FRESH_SIGNERS = 1;

/** Read-message layout: chain, id length, the 32-byte id, empty key length, u64 epoch. */
const READ_MESSAGE_LENGTH = 1 + 1 + 32 + 1 + 8;

/**
 * `count` new signers whose private keys cannot be exported: they exist only
 * as non-extractable `CryptoKey`s in this process and die with the reference.
 */
export function generateFreshSigners(count: number): Promise<KeyPairSigner[]> {
  return Promise.all(Array.from({ length: count }, () => generateKeyPairSigner(false)));
}

/**
 * The Encrypt read message for one ciphertext account on chain 0 at epoch 0,
 * with an empty reencryption key: 43 bytes, research R6.
 */
export function encodeReadMessage(ciphertext: Address): Uint8Array {
  const message = new Uint8Array(READ_MESSAGE_LENGTH);
  message[1] = 32;
  message.set(getAddressEncoder().encode(ciphertext), 2);
  return message;
}

/** The viewer's authorization to read `ciphertext`: the only message a fresh key signs. */
export async function signReadMessage(
  viewer: MessagePartialSigner,
  ciphertext: Address
): Promise<ReadAuthorization> {
  const message = encodeReadMessage(ciphertext);
  const signature = await signBytesWith(viewer, message);
  return {
    message,
    signature: new Uint8Array(signature),
    signer: new Uint8Array(getAddressEncoder().encode(viewer.address)),
  };
}
