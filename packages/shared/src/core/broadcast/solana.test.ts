import { describe, expect, it, vi } from 'vitest';
import {
  createKeyPairSignerFromPrivateKeyBytes,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
} from '@solana/kit';
import { signAndSendSolanaTransaction } from './solana';

/** Unsigned v0 transaction carrying one address-table lookup (shared with prepared-transactions). */
const FIXTURE_B64 =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQABAoqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAgACDAIAAAABAAAAAAAAAAHtSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QEAAA==';

const FRESH_BLOCKHASH = 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi';

type SignatureNotifications = () => AsyncGenerator<{ value: { err: unknown } }>;

/* eslint-disable require-yield -- completes without yielding: the confirmation resolves */
const noNotifications: SignatureNotifications = async function* () {
  return;
};
/* eslint-enable require-yield */

const failedNotification: SignatureNotifications = async function* () {
  yield { value: { err: { InstructionError: [0, 'InvalidAccountData'] } } };
};

function createRpc(overrides: Record<string, unknown> = {}) {
  return {
    getLatestBlockhash: vi.fn().mockReturnValue({
      send: async () => ({ value: { blockhash: FRESH_BLOCKHASH, lastValidBlockHeight: 1n } }),
    }),
    sendTransaction: vi.fn().mockReturnValue({ send: async () => 'signature-1' }),
    getSignatureStatuses: vi.fn().mockReturnValue({ send: async () => ({ value: [null] }) }),
    ...overrides,
  };
}

function createRpcSubscriptions(notifications: SignatureNotifications = noNotifications) {
  return {
    signatureNotifications: vi.fn().mockReturnValue({ subscribe: async () => notifications() }),
  };
}

async function createAccount(rpc = createRpc(), rpcSubscriptions = createRpcSubscriptions()) {
  return {
    signer: await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(1), false),
    getRpc: () => rpc as never,
    getRpcSubscriptions: () => rpcSubscriptions as never,
  };
}

describe('signAndSendSolanaTransaction', () => {
  it('refreshes the blockhash, signs the wallet slot and sends with preflight on', async () => {
    const rpc = createRpc();
    const account = await createAccount(rpc);

    const signature = await signAndSendSolanaTransaction(account, FIXTURE_B64);

    expect(signature).toBe('signature-1');
    const [wire, config] = rpc.sendTransaction.mock.calls[0];
    expect(config).toMatchObject({
      encoding: 'base64',
      preflightCommitment: 'confirmed',
      skipPreflight: false,
    });
    const transaction = getTransactionDecoder().decode(new Uint8Array(Buffer.from(wire, 'base64')));
    const message = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
    expect(message.lifetimeToken).toBe(FRESH_BLOCKHASH);
    expect(transaction.signatures[account.signer.address]).not.toBeNull();
  });

  it('propagates a confirmation failure instead of returning the signature', async () => {
    const account = await createAccount(createRpc(), createRpcSubscriptions(failedNotification));

    await expect(signAndSendSolanaTransaction(account, FIXTURE_B64)).rejects.toThrow();
  });

  it('honours skipPreflight and the commitment it is given', async () => {
    const rpc = createRpc();
    const account = await createAccount(rpc);

    await signAndSendSolanaTransaction(account, FIXTURE_B64, {
      commitment: 'processed',
      skipPreflight: true,
    });

    expect(rpc.getLatestBlockhash).toHaveBeenCalledWith({ commitment: 'processed' });
    expect(rpc.sendTransaction.mock.calls[0][1]).toMatchObject({
      preflightCommitment: 'processed',
      skipPreflight: true,
    });
  });
});
