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
      entry.publicKey.equals(coSigner.publicKey),
    );
    expect(coSignerEntry?.signature).not.toBeNull();
    expect(params.message).toBe(encodedMessage);
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
    const salmonIndex = decoded.message.staticAccountKeys.findIndex((key) => key.equals(salmon.publicKey));
    expect(decoded.signatures[salmonIndex]).toEqual(salmonSignature);
    const coSignerIndex = decoded.message.staticAccountKeys.findIndex((key) => key.equals(coSigner.publicKey));
    expect(decoded.signatures[coSignerIndex].some((byte) => byte !== 0)).toBe(true);
  });

  it('signAllTransactionsBytes signs every transaction with the shared signature and preserves co-signer slots', async () => {
    const buildV0 = (lamports: number) => {
      const message = new TransactionMessage({
        payerKey: coSigner.publicKey,
        recentBlockhash: BLOCKHASH,
        instructions: [
          SystemProgram.transfer({ fromPubkey: coSigner.publicKey, toPubkey: testKeypair(3).publicKey, lamports }),
          SystemProgram.transfer({ fromPubkey: salmon.publicKey, toPubkey: testKeypair(3).publicKey, lamports }),
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
      'solana-mainnet',
    );

    const params = sendMessage.mock.calls[0][0].params as Record<string, unknown>;
    expect(params.messages).toEqual([
      bs58.encode(first.message.serialize()),
      bs58.encode(second.message.serialize()),
    ]);

    const decodedFirst = VersionedTransaction.deserialize(signedFirst);
    expect(decodedFirst.message.serialize()).toEqual(first.message.serialize());
    const firstSalmonIndex = decodedFirst.message.staticAccountKeys.findIndex((key) => key.equals(salmon.publicKey));
    expect(decodedFirst.signatures[firstSalmonIndex]).toEqual(salmonSignatures[0]);

    const decodedSecond = VersionedTransaction.deserialize(signedSecond);
    expect(decodedSecond.message.serialize()).toEqual(second.message.serialize());
    const secondSalmonIndex = decodedSecond.message.staticAccountKeys.findIndex((key) => key.equals(salmon.publicKey));
    expect(decodedSecond.signatures[secondSalmonIndex]).toEqual(salmonSignatures[1]);
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
