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
 * Signing and verification use the same `nacl.sign.detached` + legacy `Keypair`
 * pattern as `approveSolanaSignMessage` in `utils/dapp-approval.ts` rather than the
 * library's own `signOffchainMessageEnvelope`/`verifyOffchainMessageEnvelope`
 * helpers, because those operate on WebCrypto `CryptoKeyPair`/`CryptoKey` objects
 * (via `@solana/keys`), not the `Keypair` type this wallet already derives, stores,
 * and signs with everywhere else.
 */
import nacl from 'tweetnacl';
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
 * Signs an OCMS v1 message with the account's ed25519 keypair.
 *
 * @param account - The signing account (uses `account.keyPair.secretKey`)
 * @param content - Raw UTF-8-encoded message bytes (as received from a dApp)
 * @param signers - Accounts required to sign this message, per the OCMS spec
 * @returns The signature and the exact buffer it was computed over
 * @throws If `account` is not among `signers` (the wallet never signs an OCMS
 *   message that omits the signing account from its required-signatory list)
 */
export function signOffchainMessage(
  account: SolanaAccount,
  content: Uint8Array,
  signers: Address[],
): SignedOffchainMessage {
  // Refuse to sign a message whose required-signatory list does not include this
  // account. Otherwise a dApp could obtain the user's signature over an OCMS
  // message that structurally attributes it to a different set of signers.
  if (!signers.some((signer) => signer === account.keyPair.publicKey.toBase58())) {
    throw new Error(
      'Refusing to sign: the signing account is not listed in the required signers.',
    );
  }

  const buffer = buildOffchainMessageV1(content, signers);
  const signature = nacl.sign.detached(buffer, account.keyPair.secretKey);
  return { signature, buffer };
}

/**
 * Verifies an OCMS v1 signature over `buffer`.
 *
 * @remarks The published `@solana/offchain-messages` verifier
 * (`verifyOffchainMessageEnvelope`) is built around WebCrypto `CryptoKey` objects
 * (via `@solana/keys`), which this wallet does not use for signing. Verification is
 * done directly with tweetnacl instead, over the same domain-separated buffer
 * `buildOffchainMessageV1` produces.
 *
 * @param buffer - The signed buffer, as produced by `buildOffchainMessageV1`
 * @param signature - The 64-byte ed25519 signature to verify
 * @param signer - The public key the signature is claimed to be from
 */
export function verifyOffchainMessage(buffer: Uint8Array, signature: Uint8Array, signer: Address): boolean {
  return nacl.sign.detached.verify(buffer, signature, Uint8Array.from(getAddressEncoder().encode(signer)));
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
