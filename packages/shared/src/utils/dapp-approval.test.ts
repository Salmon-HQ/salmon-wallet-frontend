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
import {
  appendTransactionMessageInstructions,
  blockhash,
  compileTransaction,
  createKeyPairSignerFromPrivateKeyBytes,
  createTransactionMessage,
  getTransactionDecoder,
  getTransactionEncoder,
  partiallySignTransaction,
  pipe,
  setTransactionMessageConfig,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
import { getAddMemoInstruction } from '@solana-program/memo';
import { getTransferSolInstruction } from '@solana-program/system';
import type { Address } from '@solana/addresses';
import { verifyOffchainMessage } from '../blockchain/solana';
import {
  approveSolanaSignMessage,
  approveSolanaSignOffchainMessage,
  approveSolanaTransactionRequest,
  isTransactionLookalike,
  loadSolanaTransactionApprovalDetails,
  parseOffchainMessageForApproval,
  previewSolanaApprovalEffects,
  serializeSignedTransactionFromApproval,
  TransactionLookalikeMessageError,
  UnsupportedTransactionVersionError,
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
      // Same key as `salmon`, reached through kit: the web3.js keypair's seed.
      signer: await createKeyPairSignerFromPrivateKeyBytes(salmon.secretKey.slice(0, 32), false),
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
      bs58.encode(tx.signatures[1])
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
      }
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

  // The kit signer and the web3.js keypair are the same key: both come from seed 2.
  const makeAccount = async (rpc: Record<string, unknown>) => ({
    signer: await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(2), false),
    getReceiveAddress: () => salmon.publicKey.toBase58(),
    getRpc: () => rpc,
  });

  const rpcSendTransaction = () => vi.fn().mockReturnValue({ send: async () => 'sig' });

  /** The base64 wire transaction handed to the RPC, back as a web3.js object. */
  const submittedTransaction = (sendTransaction: ReturnType<typeof vi.fn>) =>
    VersionedTransaction.deserialize(
      new Uint8Array(Buffer.from(sendTransaction.mock.calls[0][0] as string, 'base64'))
    );

  it('preserves co-signer signatures when signing and sending a versioned transaction', async () => {
    const message = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();
    const partiallySigned = new VersionedTransaction(message);
    partiallySigned.sign([coSigner]);

    const sendTransaction = rpcSendTransaction();
    const account = await makeAccount({ sendTransaction });

    await approveSolanaTransactionRequest(account as never, {
      id: 'req-1',
      method: 'signAndSendTransaction',
      params: {
        message: bs58.encode(message.serialize()),
        transaction: bs58.encode(partiallySigned.serialize()),
      },
    });

    const submitted = submittedTransaction(sendTransaction);
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

    const sendTransaction = rpcSendTransaction();
    const account = await makeAccount({ sendTransaction });

    await approveSolanaTransactionRequest(account as never, {
      id: 'req-2',
      method: 'signAndSendTransaction',
      params: {
        message: encodedMessage,
        transaction: bs58.encode(
          partiallySigned.serialize({ requireAllSignatures: false, verifySignatures: false })
        ),
      },
    });

    const submitted = submittedTransaction(sendTransaction);
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

    const sendTransaction = rpcSendTransaction();
    const account = await makeAccount({ sendTransaction });

    const result = await approveSolanaTransactionRequest(account as never, {
      id: 'req-3',
      method: 'signAndSendTransaction',
      params: { message: bs58.encode(message.serialize()) },
    });

    expect(result).toEqual({ signature: 'sig' });
    const submitted = submittedTransaction(sendTransaction);
    expect(submitted.signatures[0].every((byte) => byte === 0)).toBe(true);
    expect(submitted.signatures[1].some((byte) => byte !== 0)).toBe(true);
  });

  // `params.options` is untrusted JSON from the page. Anything the wallet does
  // not explicitly honour must be dropped rather than forwarded to the RPC node.
  it('forwards only allowlisted send options to the rpc', async () => {
    const message = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();
    const encodedMessage = bs58.encode(message.serialize());

    const sendTransaction = rpcSendTransaction();
    const account = await makeAccount({ sendTransaction });

    await approveSolanaTransactionRequest(
      account as never,
      {
        id: 'req-6',
        method: 'signAndSendTransaction',
        params: {
          message: encodedMessage,
          options: {
            skipPreflight: true,
            preflightCommitment: 'processed',
            maxRetries: 3,
            minContextSlot: 5,
            evil: 'drop me',
          },
        },
      } as never
    );

    expect(sendTransaction.mock.calls[0][1]).toEqual({
      encoding: 'base64',
      skipPreflight: true,
      preflightCommitment: 'processed',
      maxRetries: 3n,
      minContextSlot: 5n,
    });

    await approveSolanaTransactionRequest(
      account as never,
      {
        id: 'req-7',
        method: 'signAndSendTransaction',
        params: {
          message: encodedMessage,
          options: {
            preflightCommitment: 'whenever',
            skipPreflight: 'yes',
            maxRetries: 1.5,
          },
        },
      } as never
    );

    expect(sendTransaction.mock.calls[1][1]).toEqual({ encoding: 'base64' });
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

    const sendTransaction = rpcSendTransaction();
    const account = await makeAccount({ sendTransaction });

    await expect(
      approveSolanaTransactionRequest(account as never, {
        id: 'req-4',
        method: 'signAndSendTransaction',
        params: {
          message: bs58.encode(previewed.serialize()),
          transaction: bs58.encode(maliciousTransaction.serialize()),
        },
      })
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

    const sendTransaction = rpcSendTransaction();
    const account = await makeAccount({ sendTransaction });

    await expect(
      approveSolanaTransactionRequest(account as never, {
        id: 'req-5',
        method: 'signAndSendTransaction',
        params: {
          message: bs58.encode(previewed.serialize()),
          transaction: bs58.encode(
            legacyTransaction.serialize({ requireAllSignatures: false, verifySignatures: false })
          ),
        },
      })
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
      bs58.encode(tx.signatures[1])
    );

    expect(Buffer.from(serialized).toString('base64')).toBe(GOLDEN_V0_TX);
    // Slot 0 (the co-signer) is left zeroed: the approval flow only ever knows the
    // wallet's own signature. Pinned as current behavior, not endorsed as correct.
    expect(VersionedTransaction.deserialize(serialized).signatures[0].every((b) => b === 0)).toBe(
      true
    );
  });

  it('pins the serialized bytes of a signed multi-signer legacy transaction', () => {
    const tx = new Transaction({
      feePayer: testKeypair(1).publicKey,
      recentBlockhash: BLOCKHASH,
    }).add(...transferInstructions());
    const encodedMessage = bs58.encode(tx.serializeMessage());
    tx.partialSign(testKeypair(2));
    const signed = tx.signatures.find((entry) => entry.publicKey.equals(testKeypair(2).publicKey));

    const serialized = serializeSignedTransactionFromApproval(
      encodedMessage,
      walletAddress,
      bs58.encode(signed!.signature!)
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
        bs58.encode(tx.signatures[1])
      )
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
      })
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
    // Canonical v1 (SIMD-0296) message compiled by @solana/kit 8 from the same
    // fixture, with computeUnitLimit 200_000, loadedAccountsDataSizeLimit 65_536
    // and priorityFeeLamports 1_000 in its transactionConfig. Regenerate with
    // `compileTransaction` on a `createTransactionMessage({ version: 1 })` — never
    // by flipping a byte on the v0 fixture, which is not a v1 message at all.
    const V1_MESSAGE_B64 =
      'gQIAAQ8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIEiojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1yBOXcOqH0XX1ajVGbDTH7My42KkbTuN6Jd9g9bj8mzlO1JKMYo0cLG6ukDOJBZlWEpWSc6XGP5NjbBRhSshzfRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADoAwAAAAAAAEANAwAAAAEAAwIMAAMCDAAAAgIAAAABAAAAAAAAAAECAgAAAAIAAAAAAAAA';
    // The same v1 message with no transactionConfig at all — still a transaction.
    const V1_NO_LIMITS_MESSAGE_B64 =
      'gQEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEDiojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1ztSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgIMAAABAgAAAAEAAAAAAAAA';
    const TRUNCATED_V0_MESSAGE_B64 = 'gAIAAQSKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXIE5dw==';
    const TRUNCATED_V1_MESSAGE_B64 = 'gQIAAQ8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
    // The v1 bytes with the version prefix bumped to 0x82: a version this build
    // does not decode.
    const V2_MESSAGE_B64 = `gg${V1_MESSAGE_B64.slice(2)}`;

    const decode = (base64: string) => new Uint8Array(Buffer.from(base64, 'base64'));

    const corpus: [string, string, boolean][] = [
      ['a legacy message', LEGACY_MESSAGE_B64, true],
      ['a v0 message', V0_MESSAGE_B64, true],
      // Kit 8 decodes v1, so a v1 transaction can no longer be smuggled through
      // `signMessage`. Before Kit 8 this was `false` — the wallet would have signed
      // v1 transaction bytes as a plain message.
      ['a v1 message', V1_MESSAGE_B64, true],
      ['a v1 message without resource limits', V1_NO_LIMITS_MESSAGE_B64, true],
      ['a truncated v0 message', TRUNCATED_V0_MESSAGE_B64, false],
      ['a truncated v1 message', TRUNCATED_V1_MESSAGE_B64, false],
      // A version this build cannot decode is still refused when the bytes are
      // not text: a future format must not reopen the smuggling path just because
      // Kit has not caught up yet. Non-ASCII text starts with a high byte too and
      // trips the same decoder error, but it is valid UTF-8, so it stays signable.
      ['a v2 message (unsupported version, binary)', V2_MESSAGE_B64, true],
      ['non-ASCII UTF-8 text starting with a high byte', 'w6lsIGVzdMOhIGFxdcOt', false],
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
        bs58.decode(account.signer.address)
      )
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
      TransactionLookalikeMessageError
    );
  });

  it('throws TransactionLookalikeMessageError for a canonical v1 transaction message', async () => {
    // Arrange
    const account = await signingAccount();
    const data = Array.from((await v1Fixture()).messageBytes);

    // Act & Assert
    await expect(approveSolanaSignMessage(account as never, data)).rejects.toThrow(
      TransactionLookalikeMessageError
    );
  });
});

/**
 * Builds a canonical v1 (SIMD-0296) transaction with @solana/kit: fee payer and
 * co-signer is seed 1, the wallet's own account is seed 2, both transfer to
 * seed 3, blockhash '111…'. Same key material as the web3.js fixtures above,
 * reached through kit because web3.js 1.x cannot build v1.
 */
async function v1Fixture(options: { extraMemoBytes?: number; withConfig?: boolean } = {}) {
  const { extraMemoBytes = 0, withConfig = true } = options;
  const seedSigner = (seed: number) =>
    createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(seed), false);
  const [payer, wallet, destination] = await Promise.all([
    seedSigner(1),
    seedSigner(2),
    seedSigner(3),
  ]);
  const lifetime = {
    blockhash: blockhash('11111111111111111111111111111111'),
    lastValidBlockHeight: 0n,
  };
  const message = pipe(
    createTransactionMessage({ version: 1 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
    (m) =>
      appendTransactionMessageInstructions(
        [
          getTransferSolInstruction({
            source: payer,
            destination: destination.address,
            amount: 1n,
          }),
          getTransferSolInstruction({
            source: wallet,
            destination: destination.address,
            amount: 2n,
          }),
          ...(extraMemoBytes > 0
            ? [getAddMemoInstruction({ memo: 'x'.repeat(extraMemoBytes) })]
            : []),
        ],
        m
      ),
    (m) =>
      withConfig
        ? setTransactionMessageConfig(
            {
              computeUnitLimit: 200_000,
              loadedAccountsDataSizeLimit: 65_536,
              priorityFeeLamports: 1_000n,
            },
            m
          )
        : m
  );
  const transaction = compileTransaction(message);
  const partiallySigned = await partiallySignTransaction([payer.keyPair], transaction);
  return {
    payer,
    wallet,
    messageBytes: new Uint8Array(transaction.messageBytes),
    encodedMessage: bs58.encode(new Uint8Array(transaction.messageBytes)),
    /** Wire bytes with the co-signer's (payer's) signature applied and the wallet's slot empty. */
    partiallySignedWire: new Uint8Array(getTransactionEncoder().encode(partiallySigned)),
    payerSignature: partiallySigned.signatures[payer.address] as Uint8Array,
  };
}

describe('version 1 transactions', () => {
  const makeAccount = async (rpc: Record<string, unknown> = {}) => ({
    signer: await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(2), false),
    getReceiveAddress: () => testKeypair(2).publicKey.toBase58(),
    getRpc: () => rpc,
  });
  const rpcSendTransaction = () => vi.fn().mockReturnValue({ send: async () => 'sig' });
  const submittedWire = (sendTransaction: ReturnType<typeof vi.fn>) =>
    new Uint8Array(Buffer.from(sendTransaction.mock.calls[0][0] as string, 'base64'));

  it('reads the v1 resource settings from transactionConfig in the approval details', async () => {
    const fixture = await v1Fixture();

    const details = await loadSolanaTransactionApprovalDetails(
      (await makeAccount({
        getFeeForMessage: () => ({ send: async () => ({ value: 5000n }) }),
      })) as never,
      { id: 'v1-details', method: 'signTransaction', params: { message: fixture.encodedMessage } }
    );

    expect(details).toEqual({
      feeLamports: 5000,
      instructionCount: 2,
      feePayer: testKeypair(1).publicKey.toBase58(),
      recentBlockhash: '11111111111111111111111111111111',
      transactionConfig: {
        computeUnitLimit: 200_000,
        loadedAccountsDataSizeLimit: 65_536,
        priorityFeeLamports: 1_000n,
      },
    });
  });

  it('reports an empty transactionConfig for a v1 message that sets no limits', async () => {
    const fixture = await v1Fixture({ withConfig: false });

    const details = await loadSolanaTransactionApprovalDetails(
      (await makeAccount({
        getFeeForMessage: () => ({ send: async () => ({ value: 5000n }) }),
      })) as never,
      { id: 'v1-no-limits', method: 'signTransaction', params: { message: fixture.encodedMessage } }
    );

    // Zero compute units and zero loaded-account bytes, which the cluster will
    // reject; the wallet reports the truth instead of inventing defaults.
    expect(details.transactionConfig).toEqual({});
  });

  it('signs a v1 message and returns a signature that verifies against the exact bytes', async () => {
    const fixture = await v1Fixture();
    const account = await makeAccount();

    const result = await approveSolanaTransactionRequest(account as never, {
      id: 'v1-sign',
      method: 'signTransaction',
      params: { message: fixture.encodedMessage },
    });

    expect('publicKey' in result && 'signature' in result).toBe(true);
    if (!('publicKey' in result) || !('signature' in result)) return;
    expect(
      nacl.sign.detached.verify(
        fixture.messageBytes,
        bs58.decode(result.signature),
        bs58.decode(fixture.wallet.address)
      )
    ).toBe(true);
    expect(result.publicKey).toBe(fixture.wallet.address);
  });

  it('re-serializes a signed v1 transaction with the wallet signature in its own slot', async () => {
    const fixture = await v1Fixture();
    const account = await makeAccount();
    const result = await approveSolanaTransactionRequest(account as never, {
      id: 'v1-serialize',
      method: 'signTransaction',
      params: { message: fixture.encodedMessage },
    });
    if (!('signature' in result)) throw new Error('expected a signature');

    const wire = serializeSignedTransactionFromApproval(
      fixture.encodedMessage,
      fixture.wallet.address,
      result.signature
    );

    // v1 envelope: message first, signatures at the tail.
    expect(wire[0]).toBe(0x81);
    const decoded = getTransactionDecoder().decode(wire);
    expect(decoded.messageBytes).toEqual(fixture.messageBytes);
    expect(decoded.signatures[fixture.wallet.address]).toEqual(bs58.decode(result.signature));
    expect(decoded.signatures[fixture.payer.address]).toBeNull();
  });

  it('signs a batch of v1 messages, one verifiable signature per message', async () => {
    const [first, second] = await Promise.all([v1Fixture(), v1Fixture({ extraMemoBytes: 16 })]);
    const account = await makeAccount();

    const result = await approveSolanaTransactionRequest(account as never, {
      id: 'v1-sign-all',
      method: 'signAllTransactions',
      params: { messages: [first.encodedMessage, second.encodedMessage] },
    });

    expect('signatures' in result).toBe(true);
    if (!('signatures' in result)) return;
    expect(result.signatures).toHaveLength(2);
    for (const [index, fixture] of [first, second].entries()) {
      expect(
        nacl.sign.detached.verify(
          fixture.messageBytes,
          bs58.decode(result.signatures[index]),
          bs58.decode(fixture.wallet.address)
        )
      ).toBe(true);
    }
    expect(result.signatures[0]).not.toBe(result.signatures[1]);
  });

  it('preserves the co-signer signature byte-for-byte when signing and sending a v1 transaction', async () => {
    const fixture = await v1Fixture();
    const sendTransaction = rpcSendTransaction();
    const account = await makeAccount({ sendTransaction });

    await approveSolanaTransactionRequest(account as never, {
      id: 'v1-send',
      method: 'signAndSendTransaction',
      params: {
        message: fixture.encodedMessage,
        transaction: bs58.encode(fixture.partiallySignedWire),
      },
    });

    const [, sendConfig] = sendTransaction.mock.calls[0];
    expect(sendConfig).toMatchObject({ encoding: 'base64' });
    const submitted = getTransactionDecoder().decode(submittedWire(sendTransaction));
    expect(submitted.messageBytes).toEqual(fixture.messageBytes);
    expect(submitted.signatures[fixture.payer.address]).toEqual(fixture.payerSignature);
    expect(
      nacl.sign.detached.verify(
        fixture.messageBytes,
        submitted.signatures[fixture.wallet.address] as Uint8Array,
        bs58.decode(fixture.wallet.address)
      )
    ).toBe(true);
  });

  it('refuses to sign and send a v1 transaction whose bytes differ from the approved message', async () => {
    const approved = await v1Fixture();
    const other = await v1Fixture({ extraMemoBytes: 8 });
    const sendTransaction = rpcSendTransaction();
    const account = await makeAccount({ sendTransaction });

    await expect(
      approveSolanaTransactionRequest(account as never, {
        id: 'v1-wysiwys',
        method: 'signAndSendTransaction',
        params: {
          message: approved.encodedMessage,
          transaction: bs58.encode(other.partiallySignedWire),
        },
      })
    ).rejects.toThrow(/does not match the approved message/);
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it('refuses to sign a v1 message in which the wallet is not a required signer', async () => {
    const fixture = await v1Fixture();
    // Seed 9 is nobody in this transaction.
    const stranger = {
      signer: await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(9), false),
      getReceiveAddress: () => testKeypair(9).publicKey.toBase58(),
      getRpc: () => ({}),
    };

    await expect(
      approveSolanaTransactionRequest(stranger as never, {
        id: 'v1-stranger',
        method: 'signTransaction',
        params: { message: fixture.encodedMessage },
      })
    ).rejects.toThrow();
    expect(() =>
      serializeSignedTransactionFromApproval(
        fixture.encodedMessage,
        stranger.getReceiveAddress(),
        bs58.encode(new Uint8Array(64).fill(1))
      )
    ).toThrow('Signer public key not found in transaction message');
  });

  it('previews a v1 transaction larger than 1232 bytes over base64', async () => {
    const fixture = await v1Fixture({ extraMemoBytes: 2000 });
    const simulateTransaction = vi
      .fn()
      .mockReturnValue({ send: async () => ({ value: { err: null, logs: [], accounts: null } }) });
    const getMultipleAccounts = vi.fn().mockReturnValue({ send: async () => ({ value: [] }) });
    const account = await makeAccount({ simulateTransaction, getMultipleAccounts });

    await previewSolanaApprovalEffects(account as never, {
      id: 'v1-large',
      method: 'signTransaction',
      params: { message: fixture.encodedMessage },
    });

    const [wireTransaction, config] = simulateTransaction.mock.calls[0];
    const wire = new Uint8Array(Buffer.from(wireTransaction as string, 'base64'));
    expect(wire.length).toBeGreaterThan(1232);
    expect(wire.length).toBeLessThanOrEqual(4096);
    expect(config).toMatchObject({ encoding: 'base64', sigVerify: false });
    expect(getTransactionDecoder().decode(wire).messageBytes).toEqual(fixture.messageBytes);
  });

  it('rejects a v1 transaction that would exceed 4096 bytes before any key is used', async () => {
    const fixture = await v1Fixture({ extraMemoBytes: 4100 });
    const sendTransaction = rpcSendTransaction();
    const account = await makeAccount({ sendTransaction });

    // Still a transaction as far as `signMessage` is concerned.
    expect(isTransactionLookalike(fixture.messageBytes)).toBe(true);

    const effects = await previewSolanaApprovalEffects(account as never, {
      id: 'v1-oversized',
      method: 'signTransaction',
      params: { message: fixture.encodedMessage },
    });
    expect(effects.kind).toBe('undetermined');
    expect(effects.kind === 'undetermined' && effects.reason).toBe('malformed-transaction');

    await expect(
      approveSolanaTransactionRequest(account as never, {
        id: 'v1-oversized-sign',
        method: 'signTransaction',
        params: { message: fixture.encodedMessage },
      })
    ).rejects.toThrow();
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it('reports an unsupported transaction version as such, not as malformed', async () => {
    const fixture = await v1Fixture();
    const v2 = Uint8Array.from(fixture.messageBytes);
    v2[0] = 0x82;
    const encoded = bs58.encode(v2);
    const account = await makeAccount({
      getFeeForMessage: () => ({ send: async () => ({ value: 5000n }) }),
    });

    const effects = await previewSolanaApprovalEffects(account as never, {
      id: 'v2-preview',
      method: 'signTransaction',
      params: { message: encoded },
    });
    expect(effects.kind === 'undetermined' && effects.reason).toBe(
      'unsupported-transaction-version'
    );

    await expect(
      loadSolanaTransactionApprovalDetails(account as never, {
        id: 'v2-details',
        method: 'signTransaction',
        params: { message: encoded },
      })
    ).rejects.toThrow(UnsupportedTransactionVersionError);
    await expect(
      approveSolanaTransactionRequest(account as never, {
        id: 'v2-sign',
        method: 'signTransaction',
        params: { message: encoded },
      })
    ).rejects.toThrow(UnsupportedTransactionVersionError);
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
        account.signer.address as Address
      )
    ).resolves.toBe(true);
  });

  it('throws when a required signer is not a valid base58 address', async () => {
    const account = await signingAccount();
    const data = Array.from(new TextEncoder().encode('hello'));

    await expect(
      approveSolanaSignOffchainMessage(account as never, data, ['not-a-valid-address'])
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

describe('previewSolanaApprovalEffects', () => {
  const payer = testKeypair(7);
  const BLOCKHASH = '11111111111111111111111111111111';

  const encodedMessage = () => {
    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: testKeypair(8).publicKey,
          lamports: 1,
        }),
      ],
    }).compileToV0Message();
    return bs58.encode(message.serialize());
  };

  const account = (rpc: Record<string, unknown> = {}) =>
    ({
      getReceiveAddress: () => payer.publicKey.toBase58(),
      getRpc: () => rpc,
    }) as never;

  it('refuses to preview a batch instead of previewing only its first transaction', async () => {
    const simulateTransaction = vi.fn();

    const effects = await previewSolanaApprovalEffects(account({ simulateTransaction }), {
      id: 'req-batch',
      method: 'signAllTransactions',
      params: { messages: [encodedMessage(), encodedMessage()] },
    });

    expect(effects.kind).toBe('undetermined');
    expect(effects.kind === 'undetermined' && effects.reason).toBe('batch-not-previewable');
    expect(simulateTransaction).not.toHaveBeenCalled();
  });

  it('reports a request with no message as undetermined, never as no-effect', async () => {
    const effects = await previewSolanaApprovalEffects(account(), {
      id: 'req-empty',
      method: 'signTransaction',
      params: {},
    });

    expect(effects.kind).toBe('undetermined');
    expect(effects.kind === 'undetermined' && effects.reason).toBe('malformed-transaction');
  });

  it('simulates the dApp message unsigned, with signature verification off', async () => {
    const message = encodedMessage();
    const simulateTransaction = vi
      .fn()
      .mockReturnValue({ send: async () => ({ value: { err: null, logs: [], accounts: null } }) });
    const getMultipleAccounts = vi.fn().mockReturnValue({ send: async () => ({ value: [] }) });

    const effects = await previewSolanaApprovalEffects(
      account({ simulateTransaction, getMultipleAccounts }),
      { id: 'req-1', method: 'signTransaction', params: { message } }
    );

    const [wireTransaction, config] = simulateTransaction.mock.calls[0];
    const submitted = VersionedTransaction.deserialize(
      new Uint8Array(Buffer.from(wireTransaction as string, 'base64'))
    );

    expect(config).toMatchObject({ sigVerify: false, replaceRecentBlockhash: true });
    expect(bs58.encode(submitted.message.serialize())).toBe(message);
    expect(submitted.signatures.every((signature) => signature.every((byte) => byte === 0))).toBe(
      true
    );
    // The node returned no post-execution state, which is uncertainty and must
    // never collapse into "nothing happens".
    expect(effects.kind).toBe('undetermined');
  });
});
