import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { describe, expect, it, vi } from 'vitest';
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { createKeyPairSignerFromPrivateKeyBytes } from '@solana/kit';
import { TransactionLookalikeMessageError } from './dapp-approval';
import { mwaSignAndSend, mwaSignIn, mwaSignMessages, mwaSignTransactions } from './mwa-sign';

vi.mock('../hooks/useAvailableNetworks', () => ({
  fetchAndMergeNetworkConfigs: vi.fn().mockResolvedValue(true),
}));

// TEST-ONLY keys: no funds, never used outside tests. Salmon's kit signer and
// web3.js keypair are the same key (seed 2).
const coSigner = Keypair.fromSeed(new Uint8Array(32).fill(1));
const salmon = Keypair.fromSeed(new Uint8Array(32).fill(2));
const BLOCKHASH = Keypair.fromSeed(new Uint8Array(32).fill(4)).publicKey.toBase58();
const ORIGIN = 'https://jup.ag';

const makeAccount = async (rpc: Record<string, unknown> = {}) => ({
  signer: await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(2), false),
  getReceiveAddress: () => salmon.publicKey.toBase58(),
  getRpc: () => rpc,
});

function coSignedTransfer(lamports: number) {
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: salmon.publicKey,
          toPubkey: coSigner.publicKey,
          lamports,
        }),
      ],
    }).compileToV0Message()
  );
  tx.sign([coSigner]);
  return tx;
}

describe('mwaSignMessages', () => {
  it("returns each message with Salmon's signature appended, as MWA expects", async () => {
    const account = await makeAccount();
    const message = new TextEncoder().encode('Sign in to Jupiter');

    const [signed] = await mwaSignMessages(account as never, [message], ORIGIN);

    expect(signed.slice(0, message.length)).toEqual(message);
    const signature = signed.slice(message.length);
    expect(signature).toHaveLength(64);
    expect(nacl.sign.detached.verify(message, signature, salmon.publicKey.toBytes())).toBe(true);
  });

  it('refuses a transaction disguised as a message', async () => {
    const account = await makeAccount();
    const disguised = coSignedTransfer(1).message.serialize();

    await expect(mwaSignMessages(account as never, [disguised], ORIGIN)).rejects.toBeInstanceOf(
      TransactionLookalikeMessageError
    );
  });
});

describe('mwaSignTransactions', () => {
  it('returns full transactions signed by Salmon, keeping the co-signer', async () => {
    const account = await makeAccount();
    const tx = coSignedTransfer(5);

    const [signed] = await mwaSignTransactions(account as never, [tx.serialize()]);

    const expected = coSignedTransfer(5);
    expected.sign([salmon]);
    expect(Buffer.from(signed).equals(Buffer.from(expected.serialize()))).toBe(true);
  });
});

describe('mwaSignAndSend', () => {
  const sig = (n: number) => bs58.encode(new Uint8Array(64).fill(n));

  it('sends each transaction and returns its signature bytes', async () => {
    const sendTransaction = vi
      .fn()
      .mockReturnValueOnce({ send: async () => sig(1) })
      .mockReturnValueOnce({ send: async () => sig(2) });
    const account = await makeAccount({ sendTransaction });

    const result = await mwaSignAndSend(
      account as never,
      [coSignedTransfer(1).serialize(), coSignedTransfer(2).serialize()],
      {}
    );

    expect(result).toEqual({
      signatures: [new Uint8Array(64).fill(1), new Uint8Array(64).fill(2)],
    });
  });

  it('stops at the first failure and reports which ones went out', async () => {
    const sendTransaction = vi
      .fn()
      .mockReturnValueOnce({ send: async () => sig(1) })
      .mockReturnValueOnce({
        send: async () => {
          throw new Error('blockhash not found');
        },
      });
    const account = await makeAccount({ sendTransaction });

    const result = await mwaSignAndSend(
      account as never,
      [coSignedTransfer(1).serialize(), coSignedTransfer(2).serialize(), coSignedTransfer(3).serialize()],
      {}
    );

    expect(result).toEqual({ valid: [true, false, false] });
    expect(sendTransaction).toHaveBeenCalledTimes(2);
  });
});

describe('mwaSignIn', () => {
  it("signs the sign-in message for the real origin and returns it in MWA's base64 form", async () => {
    const account = await makeAccount();

    const result = await mwaSignIn(account as never, { domain: 'jup.ag', statement: 'Hi' }, ORIGIN);

    const signedMessage = Buffer.from(result.signed_message, 'base64');
    const signature = Buffer.from(result.signature, 'base64');
    expect(Buffer.from(result.address, 'base64')).toEqual(Buffer.from(salmon.publicKey.toBytes()));
    expect(signedMessage.toString()).toContain('jup.ag wants you to sign in');
    expect(nacl.sign.detached.verify(signedMessage, signature, salmon.publicKey.toBytes())).toBe(true);
    expect(result.signature_type).toBe('ed25519');
  });
});
