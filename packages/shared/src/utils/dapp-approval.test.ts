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
  parseSiwsMessage,
  serializeSignedTransactionFromApproval,
  TransactionLookalikeMessageError,
} from './dapp-approval';

vi.mock('../hooks/useAvailableNetworks', () => ({
  fetchAndMergeNetworkConfigs: vi.fn().mockResolvedValue(true),
}));

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

describe('parseSiwsMessage', () => {
  const fullMessage = [
    'phase.cc wants you to sign in with your Solana account:',
    '9mpJyg7iEse9rPMP1tdiSdSAYbLJX6nJyGbNkbT3SAd3',
    '',
    'Sign this message to authenticate.',
    '',
    'URI: https://phase.cc',
    'Version: 1',
    'Chain ID: mainnet',
    'Nonce: RMTMC6f5nv88C7bYwX1ddigk1vBp5sVR',
    'Issued At: 2026-06-18T22:06:06Z',
  ].join('\n');

  it('parses a complete SIWS message into fields', () => {
    const parsed = parseSiwsMessage(fullMessage);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      domain: 'phase.cc',
      address: '9mpJyg7iEse9rPMP1tdiSdSAYbLJX6nJyGbNkbT3SAd3',
      statement: 'Sign this message to authenticate.',
      uri: 'https://phase.cc',
      version: '1',
      chainId: 'mainnet',
      nonce: 'RMTMC6f5nv88C7bYwX1ddigk1vBp5sVR',
      issuedAt: '2026-06-18T22:06:06Z',
    });
  });

  it('returns null when the header line does not match SIWS', () => {
    expect(parseSiwsMessage('just a plain message to sign')).toBeNull();
    expect(parseSiwsMessage('')).toBeNull();
  });

  it('parses without an optional statement', () => {
    const message = [
      'phase.cc wants you to sign in with your Solana account:',
      '9mpJyg7iEse9rPMP1tdiSdSAYbLJX6nJyGbNkbT3SAd3',
      '',
      'Nonce: abc123',
    ].join('\n');
    const parsed = parseSiwsMessage(message);
    expect(parsed?.statement).toBeUndefined();
    expect(parsed?.nonce).toBe('abc123');
  });

  it('returns null when the account line is missing', () => {
    expect(
      parseSiwsMessage('phase.cc wants you to sign in with your Solana account:'),
    ).toBeNull();
  });

  it('collects resources entries', () => {
    const message = [
      'phase.cc wants you to sign in with your Solana account:',
      '9mpJyg7iEse9rPMP1tdiSdSAYbLJX6nJyGbNkbT3SAd3',
      '',
      'Resources:',
      '- https://phase.cc/tos',
      '- https://phase.cc/privacy',
    ].join('\n');
    expect(parseSiwsMessage(message)?.resources).toEqual([
      'https://phase.cc/tos',
      'https://phase.cc/privacy',
    ]);
  });

  it('exposes the message domain for cross-checking against the request origin', () => {
    const parsed = parseSiwsMessage(fullMessage);
    expect(parsed?.domain).toBe('phase.cc');
    expect(parsed?.domain).not.toBe('evil.example');
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
