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
        getConnection: async () => ({
          getFeeForMessage: async () => ({ value: 5000 }),
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
});

describe('approveSolanaSignMessage', () => {
  it('signs a normal text message and returns a signature that verifies', () => {
    // Arrange
    const salmon = Keypair.generate();
    const account = {
      keyPair: salmon,
      getReceiveAddress: () => salmon.publicKey.toBase58(),
    };
    const text = 'Sign in to Salmon Wallet';
    const data = Array.from(new TextEncoder().encode(text));

    // Act
    const result = approveSolanaSignMessage(account as never, data);

    // Assert
    expect(result.publicKey).toBe(salmon.publicKey.toBase58());
    expect(
      nacl.sign.detached.verify(
        Uint8Array.from(data),
        bs58.decode(result.signature),
        salmon.publicKey.toBytes(),
      ),
    ).toBe(true);
  });

  it('throws TransactionLookalikeMessageError instead of signing transaction-lookalike bytes', () => {
    // Arrange
    const salmon = Keypair.generate();
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
    const account = {
      keyPair: salmon,
      getReceiveAddress: () => salmon.publicKey.toBase58(),
    };
    const data = Array.from(message.serialize());

    // Act & Assert
    expect(() => approveSolanaSignMessage(account as never, data)).toThrow(
      TransactionLookalikeMessageError,
    );
  });
});

describe('approveSolanaSignOffchainMessage', () => {
  it('returns signedOffchainMessage/signature/signatureType and a signature that verifies against the account', () => {
    // Arrange
    const salmon = Keypair.generate();
    const account = { keyPair: salmon };
    const text = 'Please confirm your login';
    const data = Array.from(new TextEncoder().encode(text));

    // Act
    const result = approveSolanaSignOffchainMessage(account as never, data, [salmon.publicKey]);

    // Assert
    expect(result.signatureType).toBe('ed25519');
    expect(typeof result.signedOffchainMessage).toBe('string');
    expect(typeof result.signature).toBe('string');
    expect(
      verifyOffchainMessage(
        bs58.decode(result.signedOffchainMessage),
        bs58.decode(result.signature),
        salmon.publicKey,
      ),
    ).toBe(true);
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
