import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Keypair,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { createKeyPairSignerFromPrivateKeyBytes } from '@solana/kit';
import type { Address } from '@solana/addresses';
import { verifyOffchainMessage } from '../blockchain/solana';
import {
  approveSolanaSignMessage,
  approveSolanaSignOffchainMessage,
  approveSolanaTransactionRequest,
  isTransactionLookalike,
  loadSolanaTransactionApprovalDetails,
  parseOffchainMessageForApproval,
  serializeSignedTransactionFromApproval,
  TransactionLookalikeMessageError,
} from './dapp-approval';

vi.mock('../hooks/useAvailableNetworks', () => ({
  fetchAndMergeNetworkConfigs: vi.fn().mockResolvedValue(true),
}));

// TEST-ONLY deterministic keypairs. Seeds are constants so golden vectors are
// reproducible; these keys hold no funds and must never be used outside tests.
const testKeypair = (seed: number) => Keypair.fromSeed(new Uint8Array(32).fill(seed));

// TEST-ONLY: the minimal shape the arbitrary-byte signing paths read off a
// SolanaAccount.
async function signingAccount(seed: Uint8Array = crypto.getRandomValues(new Uint8Array(32))) {
  const signer = await createKeyPairSignerFromPrivateKeyBytes(seed, false);
  return { signer, getReceiveAddress: () => signer.address as string };
}

describe('dapp approval utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the signature for the matching versioned signer instead of slot 0', async () => {
    const payer = Keypair.generate();
    const salmon = Keypair.generate();
    const recipient = Keypair.generate();
    const recentBlockhash = Keypair.generate().publicKey.toBase58();

    const instruction = SystemProgram.transfer({
      fromPubkey: salmon.publicKey,
      toPubkey: recipient.publicKey,
      lamports: 1,
    });

    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash,
      instructions: [instruction],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    const encodedMessage = bs58.encode(tx.message.serialize());

    const account = {
      keyPair: salmon,
      getReceiveAddress: () => salmon.publicKey.toBase58(),
    };

    const result = await approveSolanaTransactionRequest(account as never, {
      id: 'req-1',
      method: 'signTransaction',
      params: { message: encodedMessage },
    });

    expect('signature' in result).toBe(true);
    if (!('signature' in result)) return;

    const expectedTx = new VersionedTransaction(message);
    expectedTx.sign([salmon]);

    expect(result.signature).toBe(bs58.encode(expectedTx.signatures[1]));
    expect(result.signature).not.toBe(bs58.encode(expectedTx.signatures[0]));
  });

  it('rebuilds versioned transactions using the signer slot that matches the public key', async () => {
    const payer = Keypair.generate();
    const salmon = Keypair.generate();
    const recipient = Keypair.generate();
    const recentBlockhash = Keypair.generate().publicKey.toBase58();

    const instruction = SystemProgram.transfer({
      fromPubkey: salmon.publicKey,
      toPubkey: recipient.publicKey,
      lamports: 1,
    });

    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash,
      instructions: [instruction],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign([salmon]);

    const rebuilt = serializeSignedTransactionFromApproval(
      bs58.encode(tx.message.serialize()),
      salmon.publicKey.toBase58(),
      bs58.encode(tx.signatures[1]),
    );
    const rebuiltTx = VersionedTransaction.deserialize(rebuilt);

    expect(bs58.encode(rebuiltTx.signatures[1])).toBe(bs58.encode(tx.signatures[1]));
    expect(bs58.encode(rebuiltTx.signatures[0])).toBe(bs58.encode(tx.signatures[0]));
  });

  it('returns the original versioned blockhash in transaction approval details', async () => {
    const payer = Keypair.generate();
    const recentBlockhash = Keypair.generate().publicKey.toBase58();

    const instruction = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 1,
    });

    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash,
      instructions: [instruction],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);

    const details = await loadSolanaTransactionApprovalDetails(
      {
        getRpc: () => ({
          getFeeForMessage: () => ({ send: async () => ({ value: 5000n }) }),
        }),
      } as never,
      {
        id: 'req-2',
        method: 'signTransaction',
        params: { message: bs58.encode(tx.message.serialize()) },
      },
    );

    expect(details.recentBlockhash).toBe(recentBlockhash);
  });
});

describe('approveSolanaTransactionRequest signAndSendTransaction co-signers', () => {
  // Fee payer and co-signer is seed 1; the wallet's own account is seed 2. Both
  // must sign, so a transaction submitted with only the wallet's signature is
  // invalid.
  const BLOCKHASH = '11111111111111111111111111111111';
  const coSigner = testKeypair(1);
  const salmon = testKeypair(2);

  const transferInstructions = () => [
    SystemProgram.transfer({
      fromPubkey: coSigner.publicKey,
      toPubkey: testKeypair(3).publicKey,
      lamports: 1,
    }),
    SystemProgram.transfer({
      fromPubkey: salmon.publicKey,
      toPubkey: testKeypair(3).publicKey,
      lamports: 2,
    }),
  ];

  const makeAccount = (connection: Record<string, unknown>) => ({
    keyPair: salmon,
    getReceiveAddress: () => salmon.publicKey.toBase58(),
    getConnection: async () => connection,
  });

  it('preserves co-signer signatures when signing and sending a versioned transaction', async () => {
    const message = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();
    const partiallySigned = new VersionedTransaction(message);
    partiallySigned.sign([coSigner]);

    const sendTransaction = vi.fn().mockResolvedValue('sig');
    const account = makeAccount({ sendTransaction });

    await approveSolanaTransactionRequest(account as never, {
      id: 'req-1',
      method: 'signAndSendTransaction',
      params: {
        message: bs58.encode(message.serialize()),
        transaction: bs58.encode(partiallySigned.serialize()),
      },
    });

    const submitted = sendTransaction.mock.calls[0][0] as VersionedTransaction;
    expect(submitted.signatures[0].some((byte) => byte !== 0)).toBe(true);
    expect(submitted.signatures[1].some((byte) => byte !== 0)).toBe(true);
  });

  it('preserves co-signer signatures when signing and sending a legacy transaction', async () => {
    const partiallySigned = new Transaction({
      feePayer: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
    }).add(...transferInstructions());
    const encodedMessage = bs58.encode(partiallySigned.serializeMessage());
    partiallySigned.partialSign(coSigner);

    const sendTransaction = vi.fn().mockResolvedValue('sig');
    const account = makeAccount({ sendTransaction });

    await approveSolanaTransactionRequest(account as never, {
      id: 'req-2',
      method: 'signAndSendTransaction',
      params: {
        message: encodedMessage,
        transaction: bs58.encode(
          partiallySigned.serialize({ requireAllSignatures: false, verifySignatures: false }),
        ),
      },
    });

    const submitted = sendTransaction.mock.calls[0][0] as VersionedTransaction;
    expect(submitted.message.version).toBe('legacy');
    // Re-serializing must yield a legacy transaction whose signature slots are both
    // filled, which is what Transaction.from requires to reconstruct it.
    const roundTripped = Transaction.from(submitted.serialize());
    expect(roundTripped.signatures).toHaveLength(2);
    expect(roundTripped.signatures.every((entry) => entry.signature !== null)).toBe(true);
  });

  it('falls back to the message-only path when no full transaction is sent', async () => {
    const message = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();

    const sendTransaction = vi.fn().mockResolvedValue('sig');
    const account = makeAccount({ sendTransaction });

    const result = await approveSolanaTransactionRequest(account as never, {
      id: 'req-3',
      method: 'signAndSendTransaction',
      params: { message: bs58.encode(message.serialize()) },
    });

    expect(result).toEqual({ signature: 'sig' });
    const submitted = sendTransaction.mock.calls[0][0] as VersionedTransaction;
    expect(submitted.signatures[0].every((byte) => byte === 0)).toBe(true);
    expect(submitted.signatures[1].some((byte) => byte !== 0)).toBe(true);
  });

  // The approval screen previews `message` while this path signs `transaction`.
  // If the two are allowed to differ, a page can show a harmless transaction and
  // have a completely different one signed and broadcast.
  it('refuses to sign when the transaction does not match the previewed message', async () => {
    const previewed = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();

    // Same shape, but drains 1_000_000 lamports instead of 2.
    const malicious = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: coSigner.publicKey,
          toPubkey: testKeypair(3).publicKey,
          lamports: 1,
        }),
        SystemProgram.transfer({
          fromPubkey: salmon.publicKey,
          toPubkey: testKeypair(3).publicKey,
          lamports: 1_000_000,
        }),
      ],
    }).compileToV0Message();
    const maliciousTransaction = new VersionedTransaction(malicious);
    maliciousTransaction.sign([coSigner]);

    const sendTransaction = vi.fn().mockResolvedValue('sig');
    const account = makeAccount({ sendTransaction });

    await expect(
      approveSolanaTransactionRequest(account as never, {
        id: 'req-4',
        method: 'signAndSendTransaction',
        params: {
          message: bs58.encode(previewed.serialize()),
          transaction: bs58.encode(maliciousTransaction.serialize()),
        },
      }),
    ).rejects.toThrow(/does not match the approved message/);

    expect(sendTransaction).not.toHaveBeenCalled();
    // The wallet's slot must still be empty: nothing was signed.
    expect(maliciousTransaction.signatures[1].every((byte) => byte === 0)).toBe(true);
  });

  it('refuses to sign when the transaction is legacy but the previewed message is not', async () => {
    const previewed = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();

    const legacyTransaction = new Transaction({
      feePayer: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
    }).add(...transferInstructions());
    legacyTransaction.partialSign(coSigner);

    const sendTransaction = vi.fn().mockResolvedValue('sig');
    const account = makeAccount({ sendTransaction });

    await expect(
      approveSolanaTransactionRequest(account as never, {
        id: 'req-5',
        method: 'signAndSendTransaction',
        params: {
          message: bs58.encode(previewed.serialize()),
          transaction: bs58.encode(
            legacyTransaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
          ),
        },
      }),
    ).rejects.toThrow(/does not match the approved message/);

    expect(sendTransaction).not.toHaveBeenCalled();
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
describe('serializeSignedTransactionFromApproval golden vectors', () => {
  // Fee payer is seed 1, the wallet signer is seed 2, and both sign, so the wallet's
  // signature belongs in slot 1 rather than slot 0.
  const BLOCKHASH = '11111111111111111111111111111111';
  const walletAddress = testKeypair(2).publicKey.toBase58();

  const transferInstructions = () => [
    SystemProgram.transfer({
      fromPubkey: testKeypair(1).publicKey,
      toPubkey: testKeypair(3).publicKey,
      lamports: 1,
    }),
    SystemProgram.transfer({
      fromPubkey: testKeypair(2).publicKey,
      toPubkey: testKeypair(3).publicKey,
      lamports: 2,
    }),
  ];

  /** Signature-slot layout of a re-serialized v0 transaction: slot 0 stays zeroed. */
  const GOLDEN_V0_TX =
    'AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2qbSfFSf2dqZn7d0dfZp2kiTMqLWtvP9NcLn2LV/g2+yBJi1bIXCkkdeprdPFgAMje5gFV1f4Myszb9FbMAsMgAIAAQSKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXIE5dw6ofRdfVqNUZsNMfszLjYqRtO43ol32D1uPybOU7UkoxijRwsbq6QM4kFmVYSlZJzpcY/k2NsFGFKyHN9EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgMCAAIMAgAAAAEAAAAAAAAAAwIBAgwCAAAAAgAAAAAAAAAA';
  /** The same layout for a legacy transaction, where addSignature places the slot. */
  const GOLDEN_LEGACY_TX =
    'AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACFOIKAoH8TYeMLq23PBztoOIK9NGB4bDqwqCBR9doB9wIeKzeQ1+ZXLIUyTTJokE8xseeZlFN6DjCiL7iN12MFAgABBIqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cgTl3Dqh9F19Wo1Rmw0x+zMuNipG07jeiXfYPW4/Js5TtSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAwIAAgwCAAAAAQAAAAAAAAADAgECDAIAAAACAAAAAAAAAA==';

  it('pins the serialized bytes of a signed multi-signer v0 transaction', () => {
    const message = new TransactionMessage({
      payerKey: testKeypair(1).publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);
    tx.sign([testKeypair(2)]);

    const serialized = serializeSignedTransactionFromApproval(
      bs58.encode(message.serialize()),
      walletAddress,
      bs58.encode(tx.signatures[1]),
    );

    expect(Buffer.from(serialized).toString('base64')).toBe(GOLDEN_V0_TX);
    // Slot 0 (the co-signer) is left zeroed: the approval flow only ever knows the
    // wallet's own signature. Pinned as current behavior, not endorsed as correct.
    expect(VersionedTransaction.deserialize(serialized).signatures[0].every((b) => b === 0)).toBe(
      true,
    );
  });

  it('pins the serialized bytes of a signed multi-signer legacy transaction', () => {
    const tx = new Transaction({
      feePayer: testKeypair(1).publicKey,
      recentBlockhash: BLOCKHASH,
    }).add(...transferInstructions());
    const encodedMessage = bs58.encode(tx.serializeMessage());
    tx.partialSign(testKeypair(2));
    const signed = tx.signatures.find((entry) =>
      entry.publicKey.equals(testKeypair(2).publicKey),
    );

    const serialized = serializeSignedTransactionFromApproval(
      encodedMessage,
      walletAddress,
      bs58.encode(signed!.signature!),
    );

    expect(Buffer.from(serialized).toString('base64')).toBe(GOLDEN_LEGACY_TX);
  });

  it('rejects a signature for a public key that is not a required signer', () => {
    const message = new TransactionMessage({
      payerKey: testKeypair(1).publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);
    tx.sign([testKeypair(2)]);

    expect(() =>
      serializeSignedTransactionFromApproval(
        bs58.encode(message.serialize()),
        testKeypair(3).publicKey.toBase58(),
        bs58.encode(tx.signatures[1]),
      ),
    ).toThrow('Signer public key not found in transaction message');
  });
});

describe('isTransactionLookalike', () => {
  it('returns true for a serialized versioned transaction message', () => {
    const payer = Keypair.generate();
    const recentBlockhash = Keypair.generate().publicKey.toBase58();
    const instruction = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 1,
    });

    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash,
      instructions: [instruction],
    }).compileToV0Message();

    expect(isTransactionLookalike(message.serialize())).toBe(true);
  });

  it('returns true for a serialized legacy transaction message', () => {
    const payer = Keypair.generate();
    const recentBlockhash = Keypair.generate().publicKey.toBase58();
    const transaction = new Transaction({
      feePayer: payer.publicKey,
      recentBlockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: Keypair.generate().publicKey,
        lamports: 1,
      }),
    );

    expect(isTransactionLookalike(transaction.compileMessage().serialize())).toBe(true);
  });

  it('returns false for plain UTF-8 text', () => {
    const plainText = new TextEncoder().encode('Sign in to Salmon Wallet at 2026-07-28T00:00:00Z');
    expect(isTransactionLookalike(plainText)).toBe(false);
  });

  it('returns false for an empty buffer', () => {
    expect(isTransactionLookalike(new Uint8Array(0))).toBe(false);
  });

  /**
   * GOLDEN CLASSIFICATION CORPUS — migration acceptance gate.
   *
   * `isTransactionLookalike` is the guard that stops a dApp from smuggling a real
   * transaction through `signMessage`, and its behavior is defined entirely by what
   * @solana/web3.js's deserializers happen to reject. That makes it the most
   * migration-fragile security check in the repo, so every shape's current answer
   * is pinned below — including the ones where the current answer is arguably
   * wrong. The point is to detect change, not to endorse it.
   *
   * A flip in any of these under @solana/kit must be reviewed and signed off, not
   * absorbed by updating the expectation.
   */
  describe('classification corpus', () => {
    // Both messages compile from the same fixture: fee payer seed 1, wallet signer
    // seed 2, two transfers to seed 3, blockhash '11111111111111111111111111111111'.
    const LEGACY_MESSAGE_B64 =
      'AgABBIqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cgTl3Dqh9F19Wo1Rmw0x+zMuNipG07jeiXfYPW4/Js5TtSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAwIAAgwCAAAAAQAAAAAAAAADAgECDAIAAAACAAAAAAAAAA==';
    const V0_MESSAGE_B64 =
      'gAIAAQSKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXIE5dw6ofRdfVqNUZsNMfszLjYqRtO43ol32D1uPybOU7UkoxijRwsbq6QM4kFmVYSlZJzpcY/k2NsFGFKyHN9EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgMCAAIMAgAAAAEAAAAAAAAAAwIBAgwCAAAAAgAAAAAAAAAA';
    // The v0 bytes with the version prefix changed from 0x80 to 0x81.
    const V1_MESSAGE_B64 =
      'gQIAAQSKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXIE5dw6ofRdfVqNUZsNMfszLjYqRtO43ol32D1uPybOU7UkoxijRwsbq6QM4kFmVYSlZJzpcY/k2NsFGFKyHN9EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgMCAAIMAgAAAAEAAAAAAAAAAwIBAgwCAAAAAgAAAAAAAAAA';
    const TRUNCATED_V0_MESSAGE_B64 = 'gAIAAQSKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXIE5dw==';

    const decode = (base64: string) => new Uint8Array(Buffer.from(base64, 'base64'));

    const corpus: [string, string, boolean][] = [
      ['a legacy message', LEGACY_MESSAGE_B64, true],
      ['a v0 message', V0_MESSAGE_B64, true],
      // A v1-versioned message is NOT detected: VersionedMessage.deserialize rejects
      // version 1, and Message.from refuses versioned bytes, so the wallet would sign
      // v1 transaction bytes as a plain message. Theoretical today (no v1 format is
      // deployed). @solana/kit may accept v1 and flip this to true, which would be a
      // security improvement — but still a behavior change that needs sign-off.
      ['a v1 message', V1_MESSAGE_B64, false],
      ['a truncated v0 message', TRUNCATED_V0_MESSAGE_B64, false],
      ['short random bytes', 'AQIDBAU=', false],
      ['plain UTF-8 text', 'SGVsbG8gZnJvbSBTYWxtb24gV2FsbGV0', false],
      ['empty bytes', '', false],
    ];

    it.each(corpus)('classifies %s as %s', (_name, base64, expected) => {
      expect(isTransactionLookalike(decode(base64))).toBe(expected);
    });

    // Trailing bytes do not defeat the guard: VersionedMessage.deserialize ignores
    // bytes past the end of the message. Good, but pinned so a stricter or looser
    // codec becomes visible.
    it('classifies a v0 message with trailing bytes as a transaction', () => {
      const withGarbage = Uint8Array.from([...decode(V0_MESSAGE_B64), 1, 2, 3, 4]);

      expect(isTransactionLookalike(withGarbage)).toBe(true);
    });
  });
});

describe('approveSolanaSignMessage', () => {
  it('signs a normal text message and returns a signature that verifies', async () => {
    // Arrange
    const account = await signingAccount();
    const text = 'Sign in to Salmon Wallet';
    const data = Array.from(new TextEncoder().encode(text));

    // Act
    const result = await approveSolanaSignMessage(account as never, data);

    // Assert
    expect(result.publicKey).toBe(account.getReceiveAddress());
    expect(
      nacl.sign.detached.verify(
        Uint8Array.from(data),
        bs58.decode(result.signature),
        bs58.decode(account.signer.address),
      ),
    ).toBe(true);
  });

  it('throws TransactionLookalikeMessageError instead of signing transaction-lookalike bytes', async () => {
    // Arrange
    const payer = Keypair.generate();
    const recentBlockhash = Keypair.generate().publicKey.toBase58();
    const instruction = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 1,
    });
    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash,
      instructions: [instruction],
    }).compileToV0Message();
    const account = await signingAccount();
    const data = Array.from(message.serialize());

    // Act & Assert
    await expect(approveSolanaSignMessage(account as never, data)).rejects.toThrow(
      TransactionLookalikeMessageError,
    );
  });
});

describe('approveSolanaSignOffchainMessage', () => {
  it('returns signedOffchainMessage/signature/signatureType and a signature that verifies against the account', async () => {
    // Arrange
    const account = await signingAccount();
    const text = 'Please confirm your login';
    const data = Array.from(new TextEncoder().encode(text));

    // Act
    const result = await approveSolanaSignOffchainMessage(account as never, data, [
      account.signer.address,
    ]);

    // Assert
    expect(result.signatureType).toBe('ed25519');
    expect(typeof result.signedOffchainMessage).toBe('string');
    expect(typeof result.signature).toBe('string');
    await expect(
      verifyOffchainMessage(
        bs58.decode(result.signedOffchainMessage),
        bs58.decode(result.signature),
        account.signer.address as Address,
      ),
    ).resolves.toBe(true);
  });

  it('throws when a required signer is not a valid base58 address', async () => {
    const account = await signingAccount();
    const data = Array.from(new TextEncoder().encode('hello'));

    await expect(
      approveSolanaSignOffchainMessage(account as never, data, ['not-a-valid-address']),
    ).rejects.toThrow();
  });
});

describe('parseOffchainMessageForApproval', () => {
  it('decodes the content and required signatories for approval-UI display', () => {
    // Arrange
    const salmon = Keypair.generate();
    const text = 'Please confirm your login';
    const data = Array.from(new TextEncoder().encode(text));

    // Act
    const parsed = parseOffchainMessageForApproval(data, [salmon.publicKey.toBase58()]);

    // Assert
    expect(parsed.content).toBe(text);
    expect(parsed.requiredSignatories).toEqual([{ address: salmon.publicKey.toBase58() }]);
  });

  it('throws when a required signer is not a valid base58 address', () => {
    // Arrange
    const data = Array.from(new TextEncoder().encode('hello'));

    // Act & Assert
    expect(() => parseOffchainMessageForApproval(data, ['not-a-valid-address'])).toThrow();
  });
});
