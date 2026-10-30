/**
 * Co-signers at broadcast (spec 043 FR-043, FR-045).
 *
 * The first test pins the exact bytes the existing path sends for a
 * two-signer transaction without `coSigners`, recorded before the option
 * existed: it is the proof that path is unchanged. The rest prove that core's
 * co-signers sign the message carrying the fresh blockhash, before the user,
 * and that nothing signs before the swap.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createKeyPairSignerFromPrivateKeyBytes,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageDecoder,
  getPublicKeyFromAddress,
  getTransactionDecoder,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  verifySignature,
  type Address,
  type Blockhash,
  type SignatureBytes,
  type TransactionPartialSigner,
} from '@solana/kit';

import { signAndSendSolanaTransaction } from './solana';
import { SYSTEM_PROGRAM, UNVERIFIED } from '../verify';
import type { SolanaSigner } from '../../blockchain/solana/signing';

const STALE_BLOCKHASH = 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N' as Blockhash;
const FRESH_BLOCKHASH = 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi';
/** A fixed public address standing in for the co-signer slot in the byte-identical test. */
const FIXED_COSIGNER = address('HXkHFMCRQP6pw66QEGBqVsduqUQdSyrrrq82S7Rffsms');

/* eslint-disable require-yield -- completes without yielding: the confirmation resolves */
const noNotifications = async function* () {
  return;
};
/* eslint-enable require-yield */
const noSlots = async function* () {
  await new Promise(() => undefined);
  yield { slot: 0n };
};

function createRpc() {
  return {
    getLatestBlockhash: vi.fn().mockReturnValue({
      send: async () => ({ value: { blockhash: FRESH_BLOCKHASH, lastValidBlockHeight: 1n } }),
    }),
    sendTransaction: vi.fn().mockReturnValue({ send: async () => 'signature-1' }),
    getSignatureStatuses: vi
      .fn()
      .mockReturnValue({ send: async () => ({ context: { slot: 5n }, value: [null] }) }),
    getEpochInfo: vi.fn().mockReturnValue({
      send: async () => ({ absoluteSlot: 0n, blockHeight: 0n }),
    }),
  };
}

function createRpcSubscriptions() {
  return {
    signatureNotifications: vi.fn().mockReturnValue({ subscribe: async () => noNotifications() }),
    slotNotifications: vi.fn().mockReturnValue({ subscribe: async () => noSlots() }),
  };
}

/** The user's fixed test signer (the same public vector as `solana.test.ts`). */
function userSigner() {
  return createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(1), false);
}

/** An unsigned transaction paid by `payer` with `coSigner` as a second, read-only signer. */
function twoSignerTransaction(version: 0 | 'legacy', payer: Address, coSigner: Address): string {
  let message = setTransactionMessageLifetimeUsingBlockhash(
    { blockhash: STALE_BLOCKHASH, lastValidBlockHeight: 1n },
    setTransactionMessageFeePayer(payer, createTransactionMessage({ version }))
  );
  message = appendTransactionMessageInstruction(
    {
      programAddress: address(SYSTEM_PROGRAM),
      accounts: [{ address: coSigner, role: AccountRole.READONLY_SIGNER }],
      data: new Uint8Array([9]),
    } as never,
    message
  ) as never;
  return getBase64EncodedWireTransaction(compileTransaction(message as never));
}

function sentTransaction(rpc: ReturnType<typeof createRpc>) {
  const [wire] = rpc.sendTransaction.mock.calls[0];
  return { wire: wire as string, ...decode(wire as string) };
}

function decode(wire: string) {
  const transaction = getTransactionDecoder().decode(new Uint8Array(Buffer.from(wire, 'base64')));
  const message = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
  return { transaction, message };
}

/** A signer that records what it signed, and when, into `log`. */
function recording<T extends TransactionPartialSigner>(signer: T, name: string, log: string[]): T {
  return {
    ...signer,
    signTransactions: vi.fn(async (transactions) => {
      const { lifetimeToken } = getCompiledTransactionMessageDecoder().decode(
        transactions[0].messageBytes
      );
      log.push(`${name}:${lifetimeToken}`);
      return signer.signTransactions(transactions);
    }),
  } as T;
}

describe('signAndSendSolanaTransaction without coSigners (unchanged path)', () => {
  it('sends exactly the bytes it sent before the co-signer option existed', async () => {
    const rpc = createRpc();
    const signer = await userSigner();
    const account = {
      signer,
      getRpc: () => rpc as never,
      getRpcSubscriptions: () => createRpcSubscriptions() as never,
    };

    await signAndSendSolanaTransaction(
      account,
      twoSignerTransaction(0, signer.address, FIXED_COSIGNER),
      UNVERIFIED
    );

    const { wire, transaction } = sentTransaction(rpc);
    expect(transaction.signatures[FIXED_COSIGNER]).toBeNull();
    expect(wire).toMatchInlineSnapshot(
      `"AqeQXeObuAubGogKv0OULmklNW10boQJ6S0ABN73nUJRDheCoirtsZ30MWgGW7BieCV2zjfOYPW3cOkvXhyiBQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAIBAQOKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXPWbWiKPO3PI8LrTvEJY9RNpJ0lghs8sOM2fp1Ht44+CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADjMtr5L6vs6LY/96RABeX9/Zr6FYdWthxalfkEs7jQgQECAQEBCQA="`
    );
  });
});

describe.each<0 | 'legacy'>([0, 'legacy'])(
  'signAndSendSolanaTransaction with coSigners, %s message',
  (version) => {
    it('signs the fresh-blockhash message with every co-signer, then the user', async () => {
      const log: string[] = [];
      const rpc = createRpc();
      const user = recording((await userSigner()) as SolanaSigner, 'user', log);
      const coSigner = recording(await generateKeyPairSigner(), 'co', log);
      const account = {
        signer: user,
        getRpc: () => rpc as never,
        getRpcSubscriptions: () => createRpcSubscriptions() as never,
      };

      await signAndSendSolanaTransaction(
        account,
        twoSignerTransaction(version, user.address, coSigner.address),
        UNVERIFIED,
        { coSigners: [coSigner] }
      );

      expect(log).toEqual([`co:${FRESH_BLOCKHASH}`, `user:${FRESH_BLOCKHASH}`]);
      expect(rpc.getLatestBlockhash.mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(user.signTransactions).mock.invocationCallOrder[0]
      );

      const { transaction, message } = sentTransaction(rpc);
      expect(message.lifetimeToken).toBe(FRESH_BLOCKHASH);
      for (const signer of [user.address, coSigner.address]) {
        const signature = transaction.signatures[signer] as SignatureBytes;
        expect(signature).not.toBeNull();
        expect(
          await verifySignature(
            await getPublicKeyFromAddress(signer),
            signature,
            transaction.messageBytes
          )
        ).toBe(true);
      }
    });
  }
);
