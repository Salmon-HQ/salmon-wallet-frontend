import nacl from 'tweetnacl';
import { describe, expect, it, vi } from 'vitest';
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import {
  address,
  createKeyPairSignerFromPrivateKeyBytes,
  getBase64EncodedWireTransaction,
  getTransactionDecoder,
  partiallySignTransaction,
  signBytes,
  type MessagePartialSigner,
  type SignatureBytes,
  type TransactionPartialSigner,
} from '@solana/kit';
import { signBytesWith, signTransactionWith, signTransactionsWith } from './signing';

// TEST-ONLY keys: no funds, never used outside tests.
const coSigner = Keypair.fromSeed(new Uint8Array(32).fill(1));
const salmon = Keypair.fromSeed(new Uint8Array(32).fill(2));
const stranger = Keypair.fromSeed(new Uint8Array(32).fill(3));
const BLOCKHASH = Keypair.fromSeed(new Uint8Array(32).fill(4)).publicKey.toBase58();

const salmonSigner = () =>
  createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(2), false);

/** A transfer from Salmon's account, fee paid and already signed by a co-signer. */
function coSignedTransfer() {
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: coSigner.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: salmon.publicKey,
          toPubkey: coSigner.publicKey,
          lamports: 1000,
        }),
      ],
    }).compileToV0Message()
  );
  tx.sign([coSigner]);
  return getTransactionDecoder().decode(tx.serialize());
}

/**
 * A signer that holds no key in this process — the shape a Seed Vault account
 * has. It signs with tweetnacl so the result can be verified independently.
 */
function remoteSigner(secret: Keypair): TransactionPartialSigner & MessagePartialSigner {
  const sign = (bytes: Uint8Array) => nacl.sign.detached(bytes, secret.secretKey) as SignatureBytes;
  const self = address(secret.publicKey.toBase58());
  return {
    address: self,
    signTransactions: async (txs) =>
      txs.map((tx) => ({ [self]: sign(new Uint8Array(tx.messageBytes)) })),
    signMessages: async (messages) => messages.map((m) => ({ [self]: sign(m.content) })),
  };
}

describe('signTransactionWith', () => {
  it('signs exactly as partiallySignTransaction does for a key-holding account', async () => {
    const signer = await salmonSigner();
    const tx = coSignedTransfer();

    const viaHelper = await signTransactionWith(signer, tx);
    const viaKit = await partiallySignTransaction([signer.keyPair], tx);

    expect(getBase64EncodedWireTransaction(viaHelper)).toBe(
      getBase64EncodedWireTransaction(viaKit)
    );
  });

  it("adds a key-less signer's signature and keeps the co-signer's", async () => {
    const tx = coSignedTransfer();

    const signed = await signTransactionWith(remoteSigner(salmon), tx);

    const own = signed.signatures[address(salmon.publicKey.toBase58())];
    expect(
      own &&
        nacl.sign.detached.verify(
          new Uint8Array(signed.messageBytes),
          own,
          salmon.publicKey.toBytes()
        )
    ).toBe(true);
    expect(signed.signatures[address(coSigner.publicKey.toBase58())]).toEqual(
      tx.signatures[address(coSigner.publicKey.toBase58())]
    );
  });

  it('refuses a transaction the signer is not required to sign', async () => {
    await expect(signTransactionWith(remoteSigner(stranger), coSignedTransfer())).rejects.toThrow(
      /not a required signer/
    );
  });
});

describe('signBytesWith', () => {
  const bytes = new TextEncoder().encode('Sign in to jup.ag');

  it('signs exactly as signBytes does for a key-holding account', async () => {
    const signer = await salmonSigner();

    expect(await signBytesWith(signer, bytes)).toEqual(
      await signBytes(signer.keyPair.privateKey, bytes)
    );
  });

  it("returns a key-less signer's 64-byte signature over the bytes", async () => {
    const signature = await signBytesWith(remoteSigner(salmon), bytes);

    expect(signature).toHaveLength(64);
    expect(nacl.sign.detached.verify(bytes, signature, salmon.publicKey.toBytes())).toBe(true);
  });
});

describe('signTransactionsWith', () => {
  it('asks the signer once for the whole batch and signs each transaction', async () => {
    const signer = remoteSigner(salmon);
    const spy = vi.spyOn(signer, 'signTransactions');
    const txs = [coSignedTransfer(), coSignedTransfer()];

    const signed = await signTransactionsWith(signer, txs);

    expect(spy).toHaveBeenCalledTimes(1);
    signed.forEach((tx) => {
      const own = tx.signatures[address(salmon.publicKey.toBase58())];
      expect(
        own &&
          nacl.sign.detached.verify(
            new Uint8Array(tx.messageBytes),
            own,
            salmon.publicKey.toBytes()
          )
      ).toBe(true);
    });
  });

  it('refuses the batch when any transaction does not need the signer', async () => {
    await expect(
      signTransactionsWith(remoteSigner(stranger), [coSignedTransfer()])
    ).rejects.toThrow(/not a required signer/);
  });
});
