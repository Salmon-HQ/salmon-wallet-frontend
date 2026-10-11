import nacl from 'tweetnacl';
import { describe, expect, it, vi } from 'vitest';
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { address, createSignableMessage, getTransactionDecoder } from '@solana/kit';
import { createSeedVaultSigner, SeedVaultError, type SeedVaultBridge } from './seed-vault-signer';
import { signBytesWith, signTransactionWith } from './signing';

// TEST-ONLY key standing in for the one Seed Vault holds; no funds.
const vaultKey = Keypair.fromSeed(new Uint8Array(32).fill(5));
const ADDRESS = address(vaultKey.publicKey.toBase58());
const AUTH = '4001';
const PATH = "m/44'/501'/0'/0'";
const BLOCKHASH = Keypair.fromSeed(new Uint8Array(32).fill(4)).publicKey.toBase58();

/** A Seed Vault that signs with the test key and records what it was asked. */
function fakeVault() {
  const sign = (payloads: Uint8Array[]) =>
    Promise.resolve(payloads.map((p) => nacl.sign.detached(p, vaultKey.secretKey)));
  return {
    signTransactions: vi.fn((_auth: string, _path: string, payloads: Uint8Array[]) =>
      sign(payloads)
    ),
    signMessages: vi.fn((_auth: string, _path: string, payloads: Uint8Array[]) => sign(payloads)),
  } satisfies SeedVaultBridge;
}

const signerWith = (bridge: SeedVaultBridge, maxPerRequest = 3) =>
  createSeedVaultSigner({
    address: ADDRESS,
    authToken: AUTH,
    derivationPath: PATH,
    bridge,
    maxPerRequest,
  });

function transfer(lamports: number) {
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: vaultKey.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: vaultKey.publicKey,
          toPubkey: vaultKey.publicKey,
          lamports,
        }),
      ],
    }).compileToV0Message()
  );
  return getTransactionDecoder().decode(tx.serialize());
}

describe('Seed Vault signer', () => {
  it('asks Seed Vault to sign the transaction message, and the result verifies', async () => {
    const vault = fakeVault();
    const tx = transfer(1);

    const signed = await signTransactionWith(signerWith(vault), tx);

    expect(vault.signTransactions).toHaveBeenCalledWith(AUTH, PATH, [
      new Uint8Array(tx.messageBytes),
    ]);
    const signature = signed.signatures[ADDRESS];
    expect(
      signature &&
        nacl.sign.detached.verify(
          new Uint8Array(tx.messageBytes),
          signature,
          vaultKey.publicKey.toBytes()
        )
    ).toBe(true);
  });

  it('signs raw bytes through Seed Vault', async () => {
    const vault = fakeVault();
    const bytes = new TextEncoder().encode('Sign in to jup.ag');

    const signature = await signBytesWith(signerWith(vault), bytes);

    expect(vault.signMessages).toHaveBeenCalledWith(AUTH, PATH, [bytes]);
    expect(nacl.sign.detached.verify(bytes, signature, vaultKey.publicKey.toBytes())).toBe(true);
  });

  it("splits a batch above Seed Vault's limit into requests and keeps the order", async () => {
    const vault = fakeVault();
    const txs = [1, 2, 3, 4, 5].map(transfer);

    const result = await signerWith(vault, 3).signTransactions(txs as never);

    expect(vault.signTransactions.mock.calls.map(([, , payloads]) => payloads.length)).toEqual([
      3, 2,
    ]);
    result.forEach((dictionary, i) => {
      const signature = dictionary[ADDRESS];
      expect(
        signature &&
          nacl.sign.detached.verify(
            new Uint8Array(txs[i]!.messageBytes),
            signature,
            vaultKey.publicKey.toBytes()
          )
      ).toBe(true);
    });
  });

  it("refuses a signature made by a key other than the account's", async () => {
    const vault = fakeVault();
    const otherKey = Keypair.fromSeed(new Uint8Array(32).fill(9));
    vault.signMessages.mockImplementationOnce(async (_a, _p, payloads) =>
      payloads.map((p) => nacl.sign.detached(p, otherKey.secretKey))
    );

    await expect(
      signerWith(vault).signMessages([createSignableMessage('x')])
    ).rejects.toMatchObject({
      reason: 'failed',
    });
  });

  it('refuses a signature that is not 64 bytes', async () => {
    const vault = fakeVault();
    vault.signMessages.mockResolvedValueOnce([new Uint8Array(63)]);

    await expect(signerWith(vault).signMessages([createSignableMessage('x')])).rejects.toThrow(
      /signature/
    );
  });

  it('refuses an answer with fewer signatures than requested', async () => {
    const vault = fakeVault();
    vault.signTransactions.mockResolvedValueOnce([]);

    await expect(signerWith(vault).signTransactions([transfer(1)] as never)).rejects.toThrow(
      /signature/
    );
  });

  it('passes a cancelled confirmation through as such, with nothing signed', async () => {
    const vault = fakeVault();
    vault.signTransactions.mockRejectedValueOnce(new SeedVaultError('cancelled'));

    await expect(signTransactionWith(signerWith(vault), transfer(1))).rejects.toMatchObject({
      reason: 'cancelled',
    });
  });
});
