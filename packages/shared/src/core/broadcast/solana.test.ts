import { describe, expect, it, vi } from 'vitest';
import {
  createKeyPairSignerFromPrivateKeyBytes,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  isSolanaError,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
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
    getEpochInfo: vi.fn().mockReturnValue({
      send: async () => ({ absoluteSlot: 0n, blockHeight: 0n }),
    }),
    ...overrides,
  };
}

type SlotNotifications = () => AsyncGenerator<{ slot: bigint }>;

/** Slots that never arrive: the block-height verdict stays open until the signature's wins. */
const noSlots: SlotNotifications = async function* () {
  await new Promise(() => undefined);
  yield { slot: 0n }; // unreachable: the promise above never settles
};

function createRpcSubscriptions(
  notifications: SignatureNotifications = noNotifications,
  slots: SlotNotifications = noSlots
) {
  return {
    signatureNotifications: vi.fn().mockReturnValue({ subscribe: async () => notifications() }),
    slotNotifications: vi.fn().mockReturnValue({ subscribe: async () => slots() }),
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

  it('reports the transaction expired once the network passes its last valid block height', async () => {
    // The signature never confirms; the network moves past `lastValidBlockHeight` (1n).
    const pending: SignatureNotifications = async function* () {
      await new Promise(() => undefined);
      yield { value: { err: null } }; // unreachable: the promise above never settles
    };
    const pastTheWindow: SlotNotifications = async function* () {
      yield { slot: 5n };
    };
    const rpc = createRpc({
      getEpochInfo: vi
        .fn()
        .mockReturnValueOnce({ send: async () => ({ absoluteSlot: 0n, blockHeight: 0n }) })
        .mockReturnValue({ send: async () => ({ absoluteSlot: 5n, blockHeight: 5n }) }),
    });
    const account = await createAccount(rpc, createRpcSubscriptions(pending, pastTheWindow));

    const outcome = await signAndSendSolanaTransaction(account, FIXTURE_B64).catch((e) => e);
    // The verdict the error decoder maps to `transaction.errors.expired`.
    expect(isSolanaError(outcome, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED)).toBe(true);
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
