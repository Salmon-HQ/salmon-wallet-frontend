/**
 * Core sends a transaction someone else built and signed (spec 043,
 * contracts/received-proposal.md). Kept out of `solana.test.ts`, which stays
 * byte-identical (owner's before/after condition).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateKeyPairSigner,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  type KeyPairSigner,
} from '@solana/kit';
import { sendReceivedSolanaTransaction } from './solana';
import { SolanaOutcomeUnknownError } from '../../blockchain/solana/confirm';
import { TransactionRequestError } from '../../blockchain/solana/transaction-request';
import {
  MERCHANT_BLOCKHASH,
  sponsoredMerchantTransaction,
} from '../../test-utils/solana-pay-merchant';

const { confirmMock } = vi.hoisted(() => ({ confirmMock: vi.fn(async () => undefined) }));
vi.mock('../../blockchain/solana/confirm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../blockchain/solana/confirm')>()),
  confirmSolanaSignature: confirmMock,
}));

let sponsor: KeyPairSigner;
let user: KeyPairSigner;
let merchant: KeyPairSigner;

beforeAll(async () => {
  [sponsor, user, merchant] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);
});

beforeEach(() => {
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(undefined);
});

function createRpc({ blockhashValid = true } = {}) {
  return {
    isBlockhashValid: vi.fn().mockReturnValue({ send: async () => ({ value: blockhashValid }) }),
    getBlockHeight: vi.fn().mockReturnValue({ send: async () => 1000n }),
    getLatestBlockhash: vi.fn(() => {
      throw new Error('a received transaction keeps its own blockhash');
    }),
    sendTransaction: vi.fn((wire: string) => ({
      send: async () => {
        const sent = getTransactionDecoder().decode(new Uint8Array(Buffer.from(wire, 'base64')));
        return Object.keys(sent.signatures).length ? 'sig-sent' : 'never';
      },
    })),
  };
}

function account(rpc: ReturnType<typeof createRpc>, signer: KeyPairSigner = user) {
  return { signer, getRpc: () => rpc as never, getRpcSubscriptions: () => ({}) as never };
}

const decode = (base64: string) =>
  getTransactionDecoder().decode(new Uint8Array(Buffer.from(base64, 'base64')));

describe('sendReceivedSolanaTransaction', () => {
  it.each(['legacy', 0] as const)(
    'adds only the user signature to a %s transaction and keeps the sponsor one',
    async (version) => {
      const wire = await sponsoredMerchantTransaction({
        version,
        sponsor,
        user: user.address,
        merchant: merchant.address,
      });
      const rpc = createRpc();

      await sendReceivedSolanaTransaction(account(rpc), wire, user.address);

      expect(rpc.sendTransaction).toHaveBeenCalledTimes(1);
      const received = decode(wire);
      const sent = decode(rpc.sendTransaction.mock.calls[0][0]);
      expect(new Uint8Array(sent.messageBytes)).toEqual(new Uint8Array(received.messageBytes));
      expect(sent.signatures[sponsor.address]).toEqual(received.signatures[sponsor.address]);
      expect(received.signatures[user.address]).toBeNull();
      expect(sent.signatures[user.address]).toBeInstanceOf(Uint8Array);
      expect(Object.keys(sent.signatures).sort()).toEqual(Object.keys(received.signatures).sort());
      const message = getCompiledTransactionMessageDecoder().decode(sent.messageBytes);
      expect(message.lifetimeToken).toBe(MERCHANT_BLOCKHASH);
      expect(rpc.getLatestBlockhash).not.toHaveBeenCalled();
    }
  );

  it('waits for the verdict with a window of 150 blocks from now', async () => {
    const wire = await sponsoredMerchantTransaction({
      version: 0,
      sponsor,
      user: user.address,
      merchant: merchant.address,
    });
    const rpc = createRpc();

    await sendReceivedSolanaTransaction(account(rpc), wire, user.address);

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({ rpc }),
      expect.any(String),
      1150n,
      expect.objectContaining({ commitment: 'confirmed' })
    );
  });

  it('refuses when the active account is not the one the merchant was given', async () => {
    const wire = await sponsoredMerchantTransaction({
      version: 0,
      sponsor,
      user: user.address,
      merchant: merchant.address,
    });
    const rpc = createRpc();

    const sending = sendReceivedSolanaTransaction(account(rpc, merchant), wire, user.address);

    await expect(sending).rejects.toBeInstanceOf(TransactionRequestError);
    await expect(sending).rejects.toThrow('solanaPay.errors.accountChanged');
    expect(rpc.sendTransaction).not.toHaveBeenCalled();
  });

  it('refuses an expired blockhash before signing', async () => {
    const wire = await sponsoredMerchantTransaction({
      version: 0,
      sponsor,
      user: user.address,
      merchant: merchant.address,
    });
    const rpc = createRpc({ blockhashValid: false });
    const signTransactions = vi.fn(user.signTransactions);
    const watched = { ...user, signTransactions } as KeyPairSigner;

    await expect(
      sendReceivedSolanaTransaction(account(rpc, watched), wire, user.address)
    ).rejects.toThrow('solanaPay.errors.expired');
    expect(signTransactions).not.toHaveBeenCalled();
    expect(rpc.sendTransaction).not.toHaveBeenCalled();
  });

  it('refuses a sponsor signature that does not verify, signing nothing', async () => {
    const bytes = Buffer.from(
      await sponsoredMerchantTransaction({
        version: 0,
        sponsor,
        user: user.address,
        merchant: merchant.address,
      }),
      'base64'
    );
    // The fee payer's signature is the first after the count byte.
    bytes[1] ^= 0xff;
    const rpc = createRpc();
    const signTransactions = vi.fn(user.signTransactions);
    const watched = { ...user, signTransactions } as KeyPairSigner;

    await expect(
      sendReceivedSolanaTransaction(account(rpc, watched), bytes.toString('base64'), user.address)
    ).rejects.toThrow('solanaPay.errors.invalidSignature');
    expect(signTransactions).not.toHaveBeenCalled();
    expect(rpc.sendTransaction).not.toHaveBeenCalled();
  });

  it('lets an unknown outcome through, so nothing offers a second send', async () => {
    const wire = await sponsoredMerchantTransaction({
      version: 0,
      sponsor,
      user: user.address,
      merchant: merchant.address,
    });
    confirmMock.mockRejectedValueOnce(new SolanaOutcomeUnknownError('sig-sent' as never));

    await expect(
      sendReceivedSolanaTransaction(account(createRpc()), wire, user.address)
    ).rejects.toBeInstanceOf(SolanaOutcomeUnknownError);
  });
});
