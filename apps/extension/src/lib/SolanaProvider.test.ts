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
