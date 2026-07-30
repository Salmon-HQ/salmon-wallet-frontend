/**
 * OCMS (Off-Chain Message Signing) v1 primitive.
 *
 * Builds and signs Solana off-chain messages per the v1 wire format defined by the
 * OCMS specification (https://github.com/solana-foundation/SRFCs/discussions/3),
 * using Anza's official `@solana/offchain-messages` codec so the domain-separated
 * signing buffer is never hand-rolled.
 *
 * Every OCMS buffer starts with a fixed 16-byte signing domain (`0xff` followed by
 * the ASCII string `"solana offchain"`). No valid Solana transaction message can
 * start with those bytes, which is what makes an off-chain message signature
 * structurally impossible to replay as a transaction signature.
 *
 * Signing and verification go through `@solana/kit`'s WebCrypto-backed `signBytes`
 * and `verifySignature` rather than the library's own
 * `signOffchainMessageEnvelope`/`verifyOffchainMessageEnvelope` helpers, which
 * expect a full `CryptoKeyPair`. The account only carries a signer whose private
 * key is non-extractable, which is all `signBytes` needs.
 */
import { isSignatureBytes, signBytes, verifySignature } from '@solana/kit';
import { getAddressEncoder, type Address } from '@solana/addresses';
import {
  compileOffchainMessageV1Envelope,
  getOffchainMessageV1Decoder,
  type OffchainMessageSignatory,
  type OffchainMessageV1,
} from '@solana/offchain-messages';
import type { SolanaAccount } from './SolanaAccount';

export interface SignedOffchainMessage {
  /** Raw 64-byte ed25519 signature over `buffer`. */
  signature: Uint8Array;
  /** The exact domain-separated bytes that were signed. */
  buffer: Uint8Array;
}

/**
 * Builds the OCMS v1 signing buffer for a text message and its required signers.
 * `content` must decode as UTF-8 text — OCMS v1 only supports UTF-8 message
 * content, so binary content is rejected rather than silently mangled.
 *
 * @param content - Raw UTF-8-encoded message bytes (as received from a dApp)
 * @param signers - Accounts required to sign this message, per the OCMS spec
 * @returns The signing-domain-prefixed buffer, ready to be signed or hashed
 */
export function buildOffchainMessageV1(content: Uint8Array, signers: Address[]): Uint8Array {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(content);

  const message: OffchainMessageV1 = {
    version: 1,
    requiredSignatories: signers.map((signer): OffchainMessageSignatory => ({ address: signer })),
    content: text,
  };

  return Uint8Array.from(compileOffchainMessageV1Envelope(message).content);
}

/**
 * Signs an OCMS v1 message with the account's ed25519 signer.
 *
 * @param account - The signing account (uses `account.signer`)
 * @param content - Raw UTF-8-encoded message bytes (as received from a dApp)
 * @param signers - Accounts required to sign this message, per the OCMS spec
 * @returns The signature and the exact buffer it was computed over
 * @throws If `account` is not among `signers` (the wallet never signs an OCMS
 *   message that omits the signing account from its required-signatory list)
 */
export async function signOffchainMessage(
  account: SolanaAccount,
  content: Uint8Array,
  signers: Address[],
): Promise<SignedOffchainMessage> {
  // Refuse to sign a message whose required-signatory list does not include this
  // account. Otherwise a dApp could obtain the user's signature over an OCMS
  // message that structurally attributes it to a different set of signers.
  if (!signers.some((signer) => signer === account.signer.address)) {
    throw new Error(
      'Refusing to sign: the signing account is not listed in the required signers.',
    );
  }

  const buffer = buildOffchainMessageV1(content, signers);
  const signature = await signBytes(account.signer.keyPair.privateKey, buffer);
  return { signature, buffer };
}

/**
 * Verifies an OCMS v1 signature over `buffer`.
 *
 * @remarks The published `@solana/offchain-messages` verifier
 * (`verifyOffchainMessageEnvelope`) works on envelope objects. This verifies the
 * raw domain-separated buffer `buildOffchainMessageV1` produces, so the caller
 * can check exactly the bytes that were signed. `verifySignature` needs a
 * `CryptoKey`, so the signer's address bytes are imported as an Ed25519 public key.
 *
 * @param buffer - The signed buffer, as produced by `buildOffchainMessageV1`
 * @param signature - The 64-byte ed25519 signature to verify
 * @param signer - The public key the signature is claimed to be from
 */
export async function verifyOffchainMessage(
  buffer: Uint8Array,
  signature: Uint8Array,
  signer: Address,
): Promise<boolean> {
  // `signature` is untrusted: it arrives from a dApp or from storage. Narrow it
  // with kit's guard rather than casting. A wrong-length signature is simply an
  // invalid one, so this reports false instead of throwing — callers treat this
  // function's boolean as the verdict.
  if (!isSignatureBytes(signature)) {
    return false;
  }

  const publicKey = await crypto.subtle.importKey(
    'raw',
    Uint8Array.from(getAddressEncoder().encode(signer)),
    'Ed25519',
    true,
    ['verify'],
  );
  return verifySignature(publicKey, signature, buffer);
}

/**
 * Decodes an OCMS v1 signing buffer back into its structured message, so the
 * approval UI can render the human-readable content and validate the required
 * signatories before asking the user to sign. Throws if `buffer` is not a
 * well-formed OCMS v1 message (wrong domain, wrong version, unsorted or duplicate
 * signatories, etc.) — see `@solana/offchain-messages`'s `getOffchainMessageV1Decoder`.
 */
export function parseOffchainMessageV1(buffer: Uint8Array): OffchainMessageV1 {
  return getOffchainMessageV1Decoder().decode(buffer);
}
