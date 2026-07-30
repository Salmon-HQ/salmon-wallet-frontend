import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createKeyPairSignerFromPrivateKeyBytes,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
} from '@solana/kit';
import {
  getPreparedSolanaTransactions,
  signAndSendPreparedSolanaTransactions,
} from './prepared-transactions';
import type { PreparedNftTransactionResponse } from '../../types/nft';

// ============================================================================
// Test Constants
// ============================================================================

/** Unsigned v0 transaction carrying one address-table lookup. */
const FIXTURE_B64 =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQABAoqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAgACDAIAAAABAAAAAAAAAAHtSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QEAAA==';

const FRESH_BLOCKHASH = 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi';
const BURN_BLOCKHASH = 'DzfXchZJoLMG3cNftcf2sw7qatkkuwQf4xH15N5wkKAB';
const LOOKUP_TABLE_ADDRESS = 'GyGKxMyg1p9SsHfm15MkNUu1u9TN2JtTspcdmrtGUdse';

type SignatureNotifications = () => AsyncGenerator<{ value: { err: unknown } }>;

/** Async iterable that completes without yielding — the confirmation resolves. */
// eslint-disable-next-line require-yield
const noNotifications: SignatureNotifications = async function* () {
  return;
};

const failedNotification: SignatureNotifications = async function* () {
  yield { value: { err: { InstructionError: [0, 'InvalidAccountData'] } } };
};

function createRpc(overrides: Record<string, unknown> = {}) {
  return {
    getLatestBlockhash: vi.fn().mockReturnValue({
      send: async () => ({ value: { blockhash: FRESH_BLOCKHASH, lastValidBlockHeight: 1n } }),
    }),
    sendTransaction: vi.fn().mockReturnValue({ send: async () => 'signature-1' }),
    getSignatureStatuses: vi.fn().mockReturnValue({
      send: async () => ({ value: [{ confirmationStatus: 'confirmed', err: null }] }),
    }),
    ...overrides,
  };
}

function createRpcSubscriptions(notifications: SignatureNotifications = noNotifications) {
  return {
    signatureNotifications: vi.fn().mockReturnValue({
      subscribe: async () => notifications(),
    }),
  };
}

async function createAccount(options: {
  rpc?: ReturnType<typeof createRpc>;
  rpcSubscriptions?: ReturnType<typeof createRpcSubscriptions>;
  connection?: unknown;
} = {}) {
  return {
    signer: await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(1), false),
    getRpc: () => options.rpc ?? createRpc(),
    getRpcSubscriptions: () => options.rpcSubscriptions ?? createRpcSubscriptions(),
    getConnection: vi.fn().mockResolvedValue(options.connection),
  };
}

/** Decodes what the flow handed to `rpc.sendTransaction`. */
function decodeSent(wire: string) {
  const transaction = getTransactionDecoder().decode(new Uint8Array(Buffer.from(wire, 'base64')));
  const message = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
  if (message.version !== 0) {
    throw new Error(`expected a v0 message, got ${message.version}`);
  }
  return { transaction, message };
}

describe('prepared-transactions', () => {
  const originalSetTimeout = global.setTimeout;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, 'setTimeout').mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === 'function') {
        callback();
      }

      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.setTimeout = originalSetTimeout;
  });

  it('returns prepared transactions from multi-step and single-step responses', () => {
    const multiStep: PreparedNftTransactionResponse = {
      transactions: [
        { transaction: 'step-1', step: 'lookup_table_create' },
        { transaction: 'step-2', step: 'burn' },
      ],
    };
    const singleStep: PreparedNftTransactionResponse = {
      transaction: 'single-step',
    };

    expect(getPreparedSolanaTransactions(multiStep)).toEqual(multiStep.transactions);
    expect(getPreparedSolanaTransactions(singleStep)).toEqual([
      { transaction: 'single-step', step: 'transaction' },
    ]);
  });

  it('refreshes the blockhash and signs before submitting a transaction', async () => {
    const rpc = createRpc();
    const account = await createAccount({ rpc });

    const signatures = await signAndSendPreparedSolanaTransactions(account as never, {
      transaction: FIXTURE_B64,
    });

    expect(signatures).toEqual(['signature-1']);
    expect(rpc.getLatestBlockhash).toHaveBeenCalledWith({ commitment: 'confirmed' });
    expect(rpc.sendTransaction).toHaveBeenCalledWith(expect.any(String), {
      encoding: 'base64',
      preflightCommitment: 'confirmed',
    });

    const { transaction, message } = decodeSent(rpc.sendTransaction.mock.calls[0][0] as string);
    expect(message.lifetimeToken).toBe(FRESH_BLOCKHASH);
    // Lookup tables survive the decode/patch/re-encode round trip.
    expect(message.addressTableLookups).toHaveLength(1);
    // The wallet's signature slot is filled in.
    expect(transaction.signatures[account.signer.address]).not.toBeNull();
  });

  it('propagates a confirmation failure instead of falling back to polling', async () => {
    const account = await createAccount({
      rpcSubscriptions: createRpcSubscriptions(failedNotification),
      rpc: createRpc({
        // No status yet, so the subscription is the only source of truth.
        getSignatureStatuses: vi.fn().mockReturnValue({ send: async () => ({ value: [null] }) }),
      }),
    });

    await expect(
      signAndSendPreparedSolanaTransactions(account as never, { transaction: FIXTURE_B64 })
    ).rejects.toThrow(/Failed during transaction:/);
  });

  it('waits for lookup table addresses to warm up before moving to the burn step', async () => {
    const lookupTable = {
      state: {
        addresses: new Array(20).fill('address'),
        lastExtendedSlot: 80,
      },
    };
    const connection = {
      getAddressLookupTable: vi.fn().mockResolvedValue({ value: lookupTable }),
      getSlot: vi.fn().mockResolvedValueOnce(80).mockResolvedValueOnce(81),
    };
    const rpc = createRpc({
      getLatestBlockhash: vi
        .fn()
        .mockReturnValueOnce({
          send: async () => ({ value: { blockhash: FRESH_BLOCKHASH, lastValidBlockHeight: 1n } }),
        })
        .mockReturnValueOnce({
          send: async () => ({ value: { blockhash: BURN_BLOCKHASH, lastValidBlockHeight: 2n } }),
        }),
      sendTransaction: vi
        .fn()
        .mockReturnValueOnce({ send: async () => 'signature-extend' })
        .mockReturnValueOnce({ send: async () => 'signature-burn' }),
    });
    const account = await createAccount({ rpc, connection });

    const response: PreparedNftTransactionResponse = {
      transactions: [
        {
          transaction: FIXTURE_B64,
          step: 'lookup_table_extend',
          lookupTableAddress: LOOKUP_TABLE_ADDRESS,
          expectedLookupTableAddressCount: 20,
        },
        { transaction: FIXTURE_B64, step: 'burn' },
      ],
    };

    const signatures = await signAndSendPreparedSolanaTransactions(account as never, response, {
      commitment: 'confirmed',
    });

    expect(signatures).toEqual(['signature-extend', 'signature-burn']);
    // The subscription path is unavailable on this stub, so polling takes over.
    expect(connection.getAddressLookupTable).toHaveBeenCalledTimes(2);
    expect(connection.getSlot).toHaveBeenCalledTimes(2);
    expect(decodeSent(rpc.sendTransaction.mock.calls[1][0] as string).message.lifetimeToken).toBe(
      BURN_BLOCKHASH
    );
  });

  it('prefers websocket subscriptions for LUT warmup when the connection supports them', async () => {
    const originalClearTimeout = global.clearTimeout;
    global.setTimeout = vi.fn(() => 0 as unknown as ReturnType<typeof setTimeout>) as unknown as typeof setTimeout;
    global.clearTimeout = vi.fn() as typeof clearTimeout;

    const lookupTable = {
      state: {
        addresses: new Array(20).fill('address'),
        lastExtendedSlot: 80,
      },
    };
    const connection = {
      getAddressLookupTable: vi.fn().mockResolvedValue({ value: lookupTable }),
      getSlot: vi.fn().mockResolvedValue(80),
      onAccountChange: vi.fn().mockReturnValue(1),
      removeAccountChangeListener: vi.fn().mockResolvedValue(undefined),
      onSlotChange: vi.fn().mockImplementation((callback) => {
        queueMicrotask(() => {
          callback({ slot: 81 });
        });
        return 2;
      }),
      removeSlotChangeListener: vi.fn().mockResolvedValue(undefined),
    };
    const rpc = createRpc({
      sendTransaction: vi
        .fn()
        .mockReturnValueOnce({ send: async () => 'signature-extend' })
        .mockReturnValueOnce({ send: async () => 'signature-burn' }),
    });
    const account = await createAccount({ rpc, connection });

    const response: PreparedNftTransactionResponse = {
      transactions: [
        {
          transaction: FIXTURE_B64,
          step: 'lookup_table_extend',
          lookupTableAddress: LOOKUP_TABLE_ADDRESS,
          expectedLookupTableAddressCount: 20,
        },
        { transaction: FIXTURE_B64, step: 'burn' },
      ],
    };

    const signatures = await signAndSendPreparedSolanaTransactions(account as never, response, {
      commitment: 'confirmed',
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(signatures).toEqual(['signature-extend', 'signature-burn']);
    expect(connection.onAccountChange).toHaveBeenCalledTimes(1);
    expect(connection.onSlotChange).toHaveBeenCalledTimes(1);
    expect(connection.getAddressLookupTable).toHaveBeenCalledTimes(1);
    expect(connection.getSlot).toHaveBeenCalledTimes(1);
    expect(connection.removeAccountChangeListener).toHaveBeenCalledWith(1);
    expect(connection.removeSlotChangeListener).toHaveBeenCalledWith(2);

    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  });

  it('surfaces the failing step in the thrown error message', async () => {
    const rpc = createRpc({
      sendTransaction: vi.fn().mockReturnValue({
        send: async () => {
          throw new Error('rpc boom');
        },
      }),
    });
    const account = await createAccount({ rpc });

    await expect(
      signAndSendPreparedSolanaTransactions(account as never, {
        transactions: [{ transaction: FIXTURE_B64, step: 'burn' }],
      })
    ).rejects.toThrow('Failed during burn: rpc boom');
  });
});
