/**
 * @vitest-environment node
 *
 * Runs in node rather than the suite's default jsdom because @solana/web3.js
 * instruction builders need the real Node `Buffer`, and this test overrides
 * `sendMessage` so no DOM event plumbing is exercised.
 */
import bs58 from 'bs58';
import { describe, expect, it, vi } from 'vitest';
import {
  Keypair,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { SolanaProvider } from './SolanaProvider';

// TEST-ONLY deterministic keypairs. Seeds are constants so the fixtures are
// reproducible; these keys hold no funds and must never be used outside tests.
const testKeypair = (seed: number) => Keypair.fromSeed(new Uint8Array(32).fill(seed));

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

/** Captures the params the provider would send to the content script. */
function createProvider() {
  const provider = new SolanaProvider();
  const sendMessage = vi.fn().mockResolvedValue({
    jsonrpc: '2.0',
    id: '1',
    method: 'signedAndSent',
    params: { signature: 'sig' },
  });
  provider.sendMessage = sendMessage;
  return { provider, sendMessage };
}

describe('SolanaProvider.signAndSendTransaction', () => {
  it('forwards a versioned transaction with the co-signer signature intact', async () => {
    const message = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();
    const transaction = new VersionedTransaction(message);
    transaction.sign([coSigner]);

    const { provider, sendMessage } = createProvider();
    await provider.signAndSendTransaction(transaction);

    const params = sendMessage.mock.calls[0][0].params as Record<string, string>;
    const forwarded = VersionedTransaction.deserialize(bs58.decode(params.transaction));
    expect(forwarded.signatures[0].some((byte) => byte !== 0)).toBe(true);
    // `message` is still sent unchanged for the approval-details preview.
    expect(params.message).toBe(bs58.encode(message.serialize()));
  });

  it('forwards a legacy transaction with the co-signer signature intact', async () => {
    const transaction = new Transaction({
      feePayer: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
    }).add(...transferInstructions());
    const encodedMessage = bs58.encode(transaction.serializeMessage());
    transaction.partialSign(coSigner);

    const { provider, sendMessage } = createProvider();
    await provider.signAndSendTransaction(transaction);

    const params = sendMessage.mock.calls[0][0].params as Record<string, string>;
    const forwarded = Transaction.from(bs58.decode(params.transaction));
    const coSignerEntry = forwarded.signatures.find((entry) =>
      entry.publicKey.equals(coSigner.publicKey)
    );
    expect(coSignerEntry?.signature).not.toBeNull();
    expect(params.message).toBe(encodedMessage);
  });
});

describe('SolanaProvider.signTransaction — signature write-back', () => {
  /** Signs with web3.js itself and returns the wallet's own signature bytes. */
  const referenceV0 = (message: ReturnType<TransactionMessage['compileToV0Message']>) => {
    const reference = new VersionedTransaction(message);
    reference.sign([coSigner, salmon]);
    const index = message.staticAccountKeys.findIndex((key) => key.equals(salmon.publicKey));
    return { reference, signature: reference.signatures[index] };
  };

  const v0Message = () =>
    new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();

  it('writes into a versioned transaction byte-identically to web3.js signing', async () => {
    const message = v0Message();
    const { reference, signature } = referenceV0(message);

    const subject = new VersionedTransaction(message);
    subject.sign([coSigner]);

    const { provider, sendMessage } = createProvider();
    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      method: 'signed',
      result: { signature: bs58.encode(signature), publicKey: salmon.publicKey.toBase58() },
    });

    const signed = await provider.signTransaction(subject);

    // The dApp gets back the very object it passed in, mutated in place.
    expect(signed).toBe(subject);
    expect(signed.serialize()).toEqual(reference.serialize());
  });

  it('writes into a legacy transaction byte-identically to web3.js signing', async () => {
    const build = () =>
      new Transaction({ feePayer: coSigner.publicKey, recentBlockhash: BLOCKHASH }).add(
        ...transferInstructions()
      );

    const reference = build();
    reference.partialSign(coSigner);
    reference.partialSign(salmon);
    const signature = reference.signatures.find((entry) =>
      entry.publicKey.equals(salmon.publicKey)
    )!.signature!;

    const subject = build();
    subject.partialSign(coSigner);

    const { provider, sendMessage } = createProvider();
    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      method: 'signed',
      result: { signature: bs58.encode(signature), publicKey: salmon.publicKey.toBase58() },
    });

    const signed = await provider.signTransaction(subject);

    expect(signed).toBe(subject);
    expect(signed.serialize()).toEqual(reference.serialize());
  });

  it('rejects a signature for a key the transaction does not require', async () => {
    const subject = new VersionedTransaction(v0Message());
    const stranger = testKeypair(8).publicKey.toBase58();

    const { provider, sendMessage } = createProvider();
    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      method: 'signed',
      result: { signature: bs58.encode(new Uint8Array(64).fill(1)), publicKey: stranger },
    });

    await expect(provider.signTransaction(subject)).rejects.toThrow(/does not require a signature/);
  });

  it('rejects a malformed signature length', async () => {
    const subject = new VersionedTransaction(v0Message());

    const { provider, sendMessage } = createProvider();
    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      method: 'signed',
      result: {
        signature: bs58.encode(new Uint8Array(32).fill(1)),
        publicKey: salmon.publicKey.toBase58(),
      },
    });

    await expect(provider.signTransaction(subject)).rejects.toThrow('Invalid signature length');
  });

  it('signAllTransactions writes each signature into its own transaction', async () => {
    const messages = [v0Message(), v0Message()];
    const references = messages.map(referenceV0);
    const subjects = messages.map((message) => {
      const tx = new VersionedTransaction(message);
      tx.sign([coSigner]);
      return tx;
    });

    const { provider, sendMessage } = createProvider();
    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      method: 'signed',
      result: {
        signatures: references.map(({ signature }) => bs58.encode(signature)),
        publicKey: salmon.publicKey.toBase58(),
      },
    });

    const signed = await provider.signAllTransactions(subjects);

    expect(signed[0]).toBe(subjects[0]);
    expect(signed[1]).toBe(subjects[1]);
    expect(signed[0].serialize()).toEqual(references[0].reference.serialize());
    expect(signed[1].serialize()).toEqual(references[1].reference.serialize());
  });
});

describe('SolanaProvider request payloads', () => {
  const address = testKeypair(2).publicKey.toBase58();

  it('keeps the method names and param keys the extension side parses', async () => {
    const { provider, sendMessage } = createProvider();
    const captured = () => {
      const call = sendMessage.mock.calls.at(-1)![0];
      return { method: call.method, keys: Object.keys(call.params).sort() };
    };

    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      method: 'connected',
      params: { publicKey: address },
    });
    await provider.connect();
    expect(captured()).toEqual({ method: 'connect', keys: ['options'] });

    sendMessage.mockResolvedValue({ jsonrpc: '2.0', id: '1', method: 'disconnected' });
    await provider.disconnect();
    expect(captured()).toEqual({ method: 'disconnect', keys: [] });

    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      result: { signature: bs58.encode(new Uint8Array(64).fill(1)) },
    });
    await provider.signMessage(new Uint8Array([1, 2, 3]));
    expect(captured()).toEqual({ method: 'sign', keys: ['data'] });

    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      result: {
        signedOffchainMessage: bs58.encode(new Uint8Array(8).fill(1)),
        signature: bs58.encode(new Uint8Array(64).fill(1)),
        signatureType: 'ed25519',
      },
    });
    await provider.signOffchainMessage({
      messageVersion: 1,
      message: 'hello',
      requiredSigners: [salmon.publicKey.toBytes()],
    });
    expect(captured()).toEqual({ method: 'signOffchain', keys: ['data', 'requiredSigners'] });

    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      result: {
        address,
        signedMessage: bs58.encode(new Uint8Array(8).fill(1)),
        signature: bs58.encode(new Uint8Array(64).fill(1)),
        signatureType: 'ed25519',
      },
    });
    await provider.signIn();
    expect(captured()).toEqual({ method: 'signIn', keys: ['input'] });

    const message = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();
    const wire = new VersionedTransaction(message).serialize();

    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      result: { signature: 'sig' },
    });
    await provider.signAndSendTransactionBytes(wire);
    expect(captured()).toEqual({
      method: 'signAndSendTransaction',
      keys: ['message', 'network', 'options', 'transaction'],
    });

    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      result: {
        signature: bs58.encode(new Uint8Array(64).fill(1)),
        publicKey: salmon.publicKey.toBase58(),
      },
    });
    await provider.signTransactionBytes(wire);
    expect(captured()).toEqual({ method: 'signTransaction', keys: ['message', 'network'] });

    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      result: {
        signatures: [bs58.encode(new Uint8Array(64).fill(1))],
        publicKey: salmon.publicKey.toBase58(),
      },
    });
    await provider.signAllTransactionsBytes([wire]);
    expect(captured()).toEqual({ method: 'signAllTransactions', keys: ['messages', 'network'] });
  });

  it('exposes the connected address as the injected address object', async () => {
    const { provider, sendMessage } = createProvider();
    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      method: 'connected',
      params: { publicKey: address },
    });

    const { publicKey } = await provider.connect();

    expect(publicKey.toBase58()).toBe(address);
    expect(publicKey.toBytes()).toEqual(testKeypair(2).publicKey.toBytes());
    expect(provider.publicKey).toBe(publicKey);
    expect(provider.isConnected).toBe(true);
  });
});

describe('SolanaProvider bytes-native surface', () => {
  it('signTransactionBytes fills the wallet slot and leaves the message and co-signer slot untouched', async () => {
    const message = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();
    const transaction = new VersionedTransaction(message);
    transaction.sign([coSigner]);
    const wire = transaction.serialize();

    const salmonSignature = new Uint8Array(64).fill(9);
    const { provider, sendMessage } = createProvider();
    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      method: 'signed',
      result: { signature: bs58.encode(salmonSignature), publicKey: salmon.publicKey.toBase58() },
    });

    const signedWire = await provider.signTransactionBytes(wire, 'solana-mainnet');

    const params = sendMessage.mock.calls[0][0].params as Record<string, string>;
    expect(params.message).toBe(bs58.encode(message.serialize()));
    expect(params.network).toBe('solana-mainnet');

    const decoded = VersionedTransaction.deserialize(signedWire);
    expect(decoded.message.serialize()).toEqual(message.serialize());
    const salmonIndex = decoded.message.staticAccountKeys.findIndex((key) =>
      key.equals(salmon.publicKey)
    );
    expect(decoded.signatures[salmonIndex]).toEqual(salmonSignature);
    const coSignerIndex = decoded.message.staticAccountKeys.findIndex((key) =>
      key.equals(coSigner.publicKey)
    );
    expect(decoded.signatures[coSignerIndex].some((byte) => byte !== 0)).toBe(true);
  });

  it('signAllTransactionsBytes signs every transaction with the shared signature and preserves co-signer slots', async () => {
    const buildV0 = (lamports: number) => {
      const message = new TransactionMessage({
        payerKey: coSigner.publicKey,
        recentBlockhash: BLOCKHASH,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: coSigner.publicKey,
            toPubkey: testKeypair(3).publicKey,
            lamports,
          }),
          SystemProgram.transfer({
            fromPubkey: salmon.publicKey,
            toPubkey: testKeypair(3).publicKey,
            lamports,
          }),
        ],
      }).compileToV0Message();
      const tx = new VersionedTransaction(message);
      tx.sign([coSigner]);
      return { message, wire: tx.serialize() };
    };
    const first = buildV0(1);
    const second = buildV0(2);
    const salmonSignatures = [new Uint8Array(64).fill(11), new Uint8Array(64).fill(12)];

    const { provider, sendMessage } = createProvider();
    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      method: 'signed',
      result: {
        signatures: salmonSignatures.map((sig) => bs58.encode(sig)),
        publicKey: salmon.publicKey.toBase58(),
      },
    });

    const [signedFirst, signedSecond] = await provider.signAllTransactionsBytes(
      [first.wire, second.wire],
      'solana-mainnet'
    );

    const params = sendMessage.mock.calls[0][0].params as Record<string, unknown>;
    expect(params.messages).toEqual([
      bs58.encode(first.message.serialize()),
      bs58.encode(second.message.serialize()),
    ]);

    const decodedFirst = VersionedTransaction.deserialize(signedFirst);
    expect(decodedFirst.message.serialize()).toEqual(first.message.serialize());
    const firstSalmonIndex = decodedFirst.message.staticAccountKeys.findIndex((key) =>
      key.equals(salmon.publicKey)
    );
    expect(decodedFirst.signatures[firstSalmonIndex]).toEqual(salmonSignatures[0]);

    const decodedSecond = VersionedTransaction.deserialize(signedSecond);
    expect(decodedSecond.message.serialize()).toEqual(second.message.serialize());
    const secondSalmonIndex = decodedSecond.message.staticAccountKeys.findIndex((key) =>
      key.equals(salmon.publicKey)
    );
    expect(decodedSecond.signatures[secondSalmonIndex]).toEqual(salmonSignatures[1]);
  });

  it('signTransactionBytes rejects a wrong-length signature', async () => {
    const message = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();
    const wire = new VersionedTransaction(message).serialize();

    const { provider, sendMessage } = createProvider();
    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      method: 'signed',
      result: {
        signature: bs58.encode(new Uint8Array(32).fill(9)),
        publicKey: salmon.publicKey.toBase58(),
      },
    });

    // Kit's fixed-size encoder would pad this into a plausible transaction.
    await expect(provider.signTransactionBytes(wire)).rejects.toThrow('Invalid signature length');
  });

  it('signAllTransactionsBytes rejects a wrong-length signature', async () => {
    const message = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();
    const wire = new VersionedTransaction(message).serialize();

    const { provider, sendMessage } = createProvider();
    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      method: 'signed',
      result: {
        signatures: [bs58.encode(new Uint8Array(65).fill(9))],
        publicKey: salmon.publicKey.toBase58(),
      },
    });

    await expect(provider.signAllTransactionsBytes([wire])).rejects.toThrow(
      'Invalid signature length'
    );
  });

  it('signAndSendTransactionBytes forwards the input wire bytes verbatim', async () => {
    const message = new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: transferInstructions(),
    }).compileToV0Message();
    const transaction = new VersionedTransaction(message);
    transaction.sign([coSigner]);
    const wire = transaction.serialize();

    const { provider, sendMessage } = createProvider();
    sendMessage.mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      method: 'signedAndSent',
      result: { signature: 'sig' },
    });

    await provider.signAndSendTransactionBytes(wire, 'solana-mainnet');

    const params = sendMessage.mock.calls[0][0].params as Record<string, string>;
    expect(bs58.decode(params.transaction)).toEqual(wire);
    expect(params.message).toBe(bs58.encode(message.serialize()));
    expect(params.network).toBe('solana-mainnet');
  });
});
