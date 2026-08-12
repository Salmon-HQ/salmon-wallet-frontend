import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createKeyPairSignerFromPrivateKeyBytes,
  getBase64Decoder,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
} from '@solana/kit';
import {
  ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS,
  getAddressLookupTableEncoder,
} from '@solana-program/address-lookup-table';
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
const LOOKUP_TABLE_ENTRY = 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';

/**
 * A base64 lookup-table account as the RPC would return it, built with the
 * program's own encoder so the real decoder is exercised end to end.
 */
function encodeLookupTableAccount(addressCount: number, lastExtendedSlot: bigint) {
  const data = getAddressLookupTableEncoder().encode({
    // u64::MAX — the sentinel for "not deactivated".
    deactivationSlot: 2n ** 64n - 1n,
    lastExtendedSlot,
    lastExtendedSlotStartIndex: 0,
    authority: null,
    addresses: new Array(addressCount).fill(LOOKUP_TABLE_ENTRY),
  });

  return {
    context: { slot: 1n },
    value: {
      data: [getBase64Decoder().decode(data), 'base64'],
      executable: false,
      lamports: 0n,
      owner: ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS,
      rentEpoch: 0n,
      space: BigInt(data.length),
    },
  };
}

type SignatureNotifications = () => AsyncGenerator<{ value: { err: unknown } }>;

/** Async iterable that completes without yielding — the confirmation resolves. */
/* eslint-disable require-yield -- generator that completes without yielding; block form survives reformatting */
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
} = {}) {
  return {
    signer: await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(1), false),
    getRpc: () => options.rpc ?? createRpc(),
    getRpcSubscriptions: () => options.rpcSubscriptions ?? createRpcSubscriptions(),
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
    const lookupTableAccount = encodeLookupTableAccount(20, 80n);
    const getAccountInfo = vi.fn().mockReturnValue({
      send: async () => lookupTableAccount,
    });
    // The table is still warming up on the first read: current slot == the slot
    // it was last extended in. It becomes usable one slot later.
    const getSlot = vi
      .fn()
      .mockReturnValueOnce({ send: async () => 80n })
      .mockReturnValueOnce({ send: async () => 81n });
    const rpc = createRpc({
      getAccountInfo,
      getSlot,
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
    const account = await createAccount({ rpc });

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
    // Two polls: the first sees the warm-up slot, the second clears it.
    expect(getAccountInfo).toHaveBeenCalledTimes(2);
    expect(getAccountInfo).toHaveBeenCalledWith(LOOKUP_TABLE_ADDRESS, {
      commitment: 'confirmed',
      encoding: 'base64',
    });
    expect(getSlot).toHaveBeenCalledTimes(2);
    expect(getSlot).toHaveBeenCalledWith({ commitment: 'confirmed' });
    expect(decodeSent(rpc.sendTransaction.mock.calls[1][0] as string).message.lifetimeToken).toBe(
      BURN_BLOCKHASH
    );
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

  it('keeps the original error as the cause', async () => {
    const cause = new Error('rpc boom');
    const rpc = createRpc({
      sendTransaction: () => ({
        send: async () => {
          throw cause;
        },
      }),
    });
    const account = await createAccount({ rpc });

    await expect(
      signAndSendPreparedSolanaTransactions(account as never, {
        transactions: [{ transaction: FIXTURE_B64, step: 'burn' }],
      })
    ).rejects.toMatchObject({ cause });
  });
});
