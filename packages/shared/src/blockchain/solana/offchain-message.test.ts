import { describe, it, expect } from 'vitest';
import nacl from 'tweetnacl';
import { Keypair, type PublicKey } from '@solana/web3.js';
import type { Address } from '@solana/addresses';
import {
  buildOffchainMessageV1,
  parseOffchainMessageV1,
  signOffchainMessage,
  verifyOffchainMessage,
} from './offchain-message';

const OCMS_SIGNING_DOMAIN = new Uint8Array([
  0xff, 0x73, 0x6f, 0x6c, 0x61, 0x6e, 0x61, 0x20, 0x6f, 0x66, 0x66, 0x63, 0x68, 0x61, 0x69, 0x6e,
]);

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

// TEST-ONLY deterministic keypairs. Seeds are constants so golden vectors are
// reproducible; these keys hold no funds and must never be used outside tests.
const testKeypair = (seed: number) => Keypair.fromSeed(new Uint8Array(32).fill(seed));

// TEST-ONLY: these PublicKeys always come from freshly generated/seeded
// Keypairs, so a typecast skips address()'s redundant validation.
const addr = (publicKey: PublicKey): Address => publicKey.toBase58() as Address;

describe('signOffchainMessage', () => {
  it('signs a text message and verifies successfully in a round trip', () => {
    // Arrange
    const account = { keyPair: Keypair.generate() };
    const content = encode('Hello from Salmon Wallet');

    // Act
    const { signature, buffer } = signOffchainMessage(account as never, content, [
      addr(account.keyPair.publicKey),
    ]);
    const isValid = verifyOffchainMessage(buffer, signature, addr(account.keyPair.publicKey));

    // Assert
    expect(isValid).toBe(true);
  });

  it('produces a buffer that always starts with the fixed OCMS signing domain', () => {
    // Arrange
    const account = { keyPair: Keypair.generate() };
    const content = encode('Sign in to Salmon Wallet');

    // Act
    const { buffer } = signOffchainMessage(account as never, content, [
      addr(account.keyPair.publicKey),
    ]);

    // Assert
    expect(buffer.slice(0, OCMS_SIGNING_DOMAIN.length)).toEqual(OCMS_SIGNING_DOMAIN);
  });

  it('fails verification when the signature was produced by a different keypair', () => {
    // Arrange
    const account = { keyPair: Keypair.generate() };
    const impostor = Keypair.generate();
    const content = encode('Approve this action');
    const { buffer } = signOffchainMessage(account as never, content, [
      addr(account.keyPair.publicKey),
    ]);
    const forgedSignature = nacl.sign.detached(buffer, impostor.secretKey);

    // Act
    const isValid = verifyOffchainMessage(buffer, forgedSignature, addr(account.keyPair.publicKey));

    // Assert
    expect(isValid).toBe(false);
  });

  it('rejects content that is not valid UTF-8', () => {
    // Arrange
    const account = { keyPair: Keypair.generate() };
    const invalidUtf8 = new Uint8Array([0xff, 0xfe, 0xfd]);

    // Act & Assert
    expect(() => buildOffchainMessageV1(invalidUtf8, [addr(account.keyPair.publicKey)])).toThrow();
  });

  it('refuses to sign when the account is not among the required signers', () => {
    // Arrange
    const account = { keyPair: Keypair.generate() };
    const other = Keypair.generate();
    const content = encode('Sign as someone else');

    // Act & Assert
    expect(() => signOffchainMessage(account as never, content, [addr(other.publicKey)])).toThrow(
      /not listed in the required signers/,
    );
  });
});

describe('parseOffchainMessageV1', () => {
  it('decodes the original content and required signatories back out of the buffer', () => {
    // Arrange
    const account = { keyPair: Keypair.generate() };
    const content = encode('Please confirm your login');

    // Act
    const { buffer } = signOffchainMessage(account as never, content, [
      addr(account.keyPair.publicKey),
    ]);
    const parsed = parseOffchainMessageV1(buffer);

    // Assert
    expect(parsed.content).toBe('Please confirm your login');
    expect(parsed.requiredSignatories).toEqual([
      { address: account.keyPair.publicKey.toBase58() },
    ]);
  });

  it('throws when the buffer is not a well-formed OCMS v1 message', () => {
    // Arrange
    const garbage = encode('just some plain text, not an OCMS buffer');

    // Act & Assert
    expect(() => parseOffchainMessageV1(garbage)).toThrow();
  });
});

/**
 * GOLDEN VECTORS — migration acceptance gate.
 *
 * These constants pin the exact bytes produced by the @solana/web3.js
 * implementation as of commit 9e2e4bb. They are the acceptance criterion for the
 * @solana/kit migration: the ported code is correct iff these still pass.
 *
 * To regenerate (only ever when the wire format itself is intentionally
 * changed — NEVER to make a migration diff go green): replace the expected
 * constant with an empty string, run the suite, and paste the reported
 * `actual` value. A migration that changes these bytes is a bug, not a
 * vector that needs updating.
 */
describe('golden vectors', () => {
  const CONTENT = 'Hello from Salmon Wallet';
  const UNICODE_CONTENT = 'Ünïcödé ✓ 日本語';

  /** The domain-separated OCMS v1 signing buffer for a single signatory. */
  const GOLDEN_OCMS_SINGLE_SIGNER =
    '/3NvbGFuYSBvZmZjaGFpbgEBiojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1xIZWxsbyBmcm9tIFNhbG1vbiBXYWxsZXQ=';
  /** The same buffer for three signatories, in the encoder's normalized order. */
  const GOLDEN_OCMS_THREE_SIGNERS =
    '/3NvbGFuYSBvZmZjaGFpbgEDgTl3Dqh9F19Wo1Rmw0x+zMuNipG07jeiXfYPW4/Js5SKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXO1JKMYo0cLG6ukDOJBZlWEpWSc6XGP5NjbBRhSshzfRSGVsbG8gZnJvbSBTYWxtb24gV2FsbGV0';
  /** Non-ASCII content, pinning the UTF-8 encoding of the content section. */
  const GOLDEN_OCMS_UNICODE_CONTENT =
    '/3NvbGFuYSBvZmZjaGFpbgEBiojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1zDnG7Dr2PDtmTDqSDinJMg5pel5pys6Kqe';

  const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

  it('pins the OCMS v1 envelope bytes for a single signer', () => {
    const buffer = buildOffchainMessageV1(encode(CONTENT), [addr(testKeypair(1).publicKey)]);

    expect(toBase64(buffer)).toBe(GOLDEN_OCMS_SINGLE_SIGNER);
  });

  it('pins the OCMS v1 envelope bytes for non-ASCII content', () => {
    const buffer = buildOffchainMessageV1(encode(UNICODE_CONTENT), [addr(testKeypair(1).publicKey)]);

    expect(toBase64(buffer)).toBe(GOLDEN_OCMS_UNICODE_CONTENT);
  });

  // The encoder normalizes signatory order, so caller order is not observable in
  // the signed bytes. A port that preserved caller order would produce different
  // bytes and break the decoder, which requires sorted signatories.
  it('produces order-independent bytes for the same signatory set', () => {
    const signers = [1, 2, 3].map((seed) => addr(testKeypair(seed).publicKey));
    const sorted = [...signers].sort((a, b) => (a < b ? -1 : 1));

    const asGiven = buildOffchainMessageV1(encode(CONTENT), signers);
    const reversed = buildOffchainMessageV1(encode(CONTENT), [...signers].reverse());
    const preSorted = buildOffchainMessageV1(encode(CONTENT), sorted);

    expect(toBase64(asGiven)).toBe(GOLDEN_OCMS_THREE_SIGNERS);
    expect(toBase64(reversed)).toBe(GOLDEN_OCMS_THREE_SIGNERS);
    expect(toBase64(preSorted)).toBe(GOLDEN_OCMS_THREE_SIGNERS);
  });

  it('rejects a duplicated signatory', () => {
    const signer = addr(testKeypair(1).publicKey);

    expect(() => buildOffchainMessageV1(encode(CONTENT), [signer, signer])).toThrow(
      /no more than once/,
    );
  });
});
