import { describe, it, expect } from 'vitest';
import nacl from 'tweetnacl';
import { Keypair } from '@solana/web3.js';
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

describe('signOffchainMessage', () => {
  it('signs a text message and verifies successfully in a round trip', () => {
    // Arrange
    const account = { keyPair: Keypair.generate() };
    const content = encode('Hello from Salmon Wallet');

    // Act
    const { signature, buffer } = signOffchainMessage(account as never, content, [
      account.keyPair.publicKey,
    ]);
    const isValid = verifyOffchainMessage(buffer, signature, account.keyPair.publicKey);

    // Assert
    expect(isValid).toBe(true);
  });

  it('produces a buffer that always starts with the fixed OCMS signing domain', () => {
    // Arrange
    const account = { keyPair: Keypair.generate() };
    const content = encode('Sign in to Salmon Wallet');

    // Act
    const { buffer } = signOffchainMessage(account as never, content, [account.keyPair.publicKey]);

    // Assert
    expect(buffer.slice(0, OCMS_SIGNING_DOMAIN.length)).toEqual(OCMS_SIGNING_DOMAIN);
  });

  it('fails verification when the signature was produced by a different keypair', () => {
    // Arrange
    const account = { keyPair: Keypair.generate() };
    const impostor = Keypair.generate();
    const content = encode('Approve this action');
    const { buffer } = signOffchainMessage(account as never, content, [account.keyPair.publicKey]);
    const forgedSignature = nacl.sign.detached(buffer, impostor.secretKey);

    // Act
    const isValid = verifyOffchainMessage(buffer, forgedSignature, account.keyPair.publicKey);

    // Assert
    expect(isValid).toBe(false);
  });

  it('rejects content that is not valid UTF-8', () => {
    // Arrange
    const account = { keyPair: Keypair.generate() };
    const invalidUtf8 = new Uint8Array([0xff, 0xfe, 0xfd]);

    // Act & Assert
    expect(() => buildOffchainMessageV1(invalidUtf8, [account.keyPair.publicKey])).toThrow();
  });

  it('refuses to sign when the account is not among the required signers', () => {
    // Arrange
    const account = { keyPair: Keypair.generate() };
    const other = Keypair.generate();
    const content = encode('Sign as someone else');

    // Act & Assert
    expect(() => signOffchainMessage(account as never, content, [other.publicKey])).toThrow(
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
    const { buffer } = signOffchainMessage(account as never, content, [account.keyPair.publicKey]);
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
