import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const recentSignature = vi.fn();
const blockHeightExceedence = vi.fn();

vi.mock('@solana/transaction-confirmation', () => ({
  createRecentSignatureConfirmationPromiseFactory: () => recentSignature,
  createBlockHeightExceedencePromiseFactory: () => blockHeightExceedence,
}));

const { confirmSolanaSignature, sendExpectingOutcome, SolanaOutcomeUnknownError } =
  await import('./confirm');
const {
  getSolanaErrorFromTransactionError,
  SolanaError,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
} = await import('@solana/kit');

const SIGNATURE = 'a-signature' as never;
const clients = { rpc: {}, rpcSubscriptions: {} } as never;

/** The chain's own verdict that the blockhash expired, as the library throws it. */
function expired() {
  return new SolanaError(SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED, {
    currentBlockHeight: 1001n,
    lastValidBlockHeight: 1000n,
  });
}

/**
 * An HTTP RPC whose answers the test scripts, one per poll. `calls` records
 * the order of reads, and whether the status read searched the ledger.
 */
function pollingRpc(statuses: Array<unknown | Error>, heights: bigint[] = [500n]) {
  let polls = 0;
  let heightReads = 0;
  const calls: string[] = [];
  const rpc = {
    getBlockHeight: () => ({
      send: async () => {
        calls.push('height');
        const height = heights[Math.min(heightReads, heights.length - 1)];
        heightReads += 1;
        return height;
      },
    }),
    getSignatureStatuses: (
      _signatures: unknown,
      config?: { searchTransactionHistory?: boolean }
    ) => ({
      send: async () => {
        calls.push(config?.searchTransactionHistory ? 'ledger' : 'status');
        const answer = statuses[Math.min(polls, statuses.length - 1)];
        polls += 1;
        if (answer instanceof Error) throw answer;
        return { value: [answer] };
      },
    }),
  };
  return { rpc, polls: () => polls, calls };
}

function isExpiry(error: unknown) {
  return (
    error instanceof SolanaError && error.context.__code === SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED
  );
}

/** A promise that only settles when the test says so. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  blockHeightExceedence.mockReturnValue(new Promise(() => {}));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('confirmSolanaSignature', () => {
  it('resolves when the cluster confirms the signature', async () => {
    recentSignature.mockResolvedValue(undefined);

    await expect(confirmSolanaSignature(clients, SIGNATURE, 1000n)).resolves.toBeUndefined();
  });

  describe("behind kit's expiry", () => {
    // Kit reads the block height before the signature, so a transaction that
    // landed in the window's last block can lose its race. The user would see
    // "expired", press retry, and pay twice.
    it('searches the ledger and resolves when the transaction landed', async () => {
      recentSignature.mockReturnValue(new Promise(() => {}));
      blockHeightExceedence.mockRejectedValue(expired());
      const { rpc, calls } = pollingRpc([{ confirmationStatus: 'finalized', err: null }], [1001n]);

      await expect(
        confirmSolanaSignature({ rpc, rpcSubscriptions: {} } as never, SIGNATURE, 1000n)
      ).resolves.toBeUndefined();
      expect(calls).toEqual(['height', 'ledger']);
    });

    it('declares expiry once the ledger misses the signature twice', async () => {
      recentSignature.mockReturnValue(new Promise(() => {}));
      blockHeightExceedence.mockRejectedValue(expired());
      const { rpc, calls } = pollingRpc([null], [1001n]);

      const waiting = confirmSolanaSignature(
        { rpc, rpcSubscriptions: {} } as never,
        SIGNATURE,
        1000n
      );
      const verdict = expect(waiting).rejects.toSatisfy(isExpiry);
      await vi.advanceTimersByTimeAsync(5000);
      await verdict;
      expect(calls).toEqual(['height', 'ledger', 'height', 'ledger']);
    });
  });

  describe('re-broadcasting', () => {
    it('re-sends the same bytes while the wait lasts', async () => {
      const confirmation = deferred();
      recentSignature.mockReturnValue(confirmation.promise);
      const resend = vi.fn().mockResolvedValue(undefined);

      const waiting = confirmSolanaSignature(clients, SIGNATURE, 1000n, {
        resend,
        resendIntervalMs: 1000,
      });

      await vi.advanceTimersByTimeAsync(3000);
      expect(resend).toHaveBeenCalledTimes(3);

      confirmation.resolve();
      await waiting;
    });

    it('stops re-sending the moment the wait ends', async () => {
      const confirmation = deferred();
      recentSignature.mockReturnValue(confirmation.promise);
      const resend = vi.fn().mockResolvedValue(undefined);

      const waiting = confirmSolanaSignature(clients, SIGNATURE, 1000n, {
        resend,
        resendIntervalMs: 1000,
      });

      await vi.advanceTimersByTimeAsync(1000);
      confirmation.resolve();
      await waiting;

      const callsAtConfirmation = resend.mock.calls.length;
      await vi.advanceTimersByTimeAsync(10_000);
      expect(resend).toHaveBeenCalledTimes(callsAtConfirmation);
    });

    it('stops re-sending when the transaction dies too', async () => {
      recentSignature.mockReturnValue(new Promise(() => {}));
      const expiry = deferred();
      blockHeightExceedence.mockReturnValue(expiry.promise);
      const resend = vi.fn().mockResolvedValue(undefined);
      const { rpc } = pollingRpc([null], [1001n]);

      const waiting = confirmSolanaSignature(
        { rpc, rpcSubscriptions: {} } as never,
        SIGNATURE,
        1000n,
        {
          resend,
          resendIntervalMs: 1000,
        }
      );

      await vi.advanceTimersByTimeAsync(1000);
      expiry.reject(expired());
      const verdict = expect(waiting).rejects.toSatisfy(isExpiry);
      await vi.advanceTimersByTimeAsync(5000);
      await verdict;

      const callsAtDeath = resend.mock.calls.length;
      await vi.advanceTimersByTimeAsync(10_000);
      expect(resend).toHaveBeenCalledTimes(callsAtDeath);
    });

    it('keeps waiting when a re-send is refused', async () => {
      // The send already succeeded once; a node refusing the repeat is
      // usually saying it has the transaction. It must not fail the wait.
      const confirmation = deferred();
      recentSignature.mockReturnValue(confirmation.promise);
      const resend = vi.fn().mockRejectedValue(new Error('already processed'));

      const waiting = confirmSolanaSignature(clients, SIGNATURE, 1000n, {
        resend,
        resendIntervalMs: 1000,
      });

      await vi.advanceTimersByTimeAsync(2000);
      expect(resend).toHaveBeenCalled();

      confirmation.resolve();
      await expect(waiting).resolves.toBeUndefined();
    });

    it('never re-sends when the caller offered nothing to re-send', async () => {
      const confirmation = deferred();
      recentSignature.mockReturnValue(confirmation.promise);
      const setInterval = vi.spyOn(globalThis, 'setInterval');

      const waiting = confirmSolanaSignature(clients, SIGNATURE, 1000n);
      await vi.advanceTimersByTimeAsync(5000);
      confirmation.resolve();
      await waiting;

      expect(setInterval).not.toHaveBeenCalled();
      setInterval.mockRestore();
    });
  });

  describe('when the subscription breaks before the chain answers', () => {
    it('keeps asking over HTTP and resolves once the transaction is confirmed', async () => {
      recentSignature.mockRejectedValue(new Error('socket closed'));
      const { rpc } = pollingRpc([null, { confirmationStatus: 'confirmed', err: null }]);

      const waiting = confirmSolanaSignature(
        { rpc, rpcSubscriptions: {} } as never,
        SIGNATURE,
        1000n
      );
      await vi.advanceTimersByTimeAsync(5000);

      await expect(waiting).resolves.toBeUndefined();
    });

    it("throws the chain's failure verdict found while asking", async () => {
      recentSignature.mockRejectedValue(new Error('socket closed'));
      const { rpc } = pollingRpc([
        { confirmationStatus: 'confirmed', err: { InstructionError: [0, { Custom: 1 }] } },
      ]);

      const waiting = confirmSolanaSignature(
        { rpc, rpcSubscriptions: {} } as never,
        SIGNATURE,
        1000n
      );
      const verdict = expect(waiting).rejects.toBeInstanceOf(SolanaError);
      await vi.advanceTimersByTimeAsync(5000);
      await verdict;
    });

    it('throws BLOCK_HEIGHT_EXCEEDED once the network passes the last valid height', async () => {
      recentSignature.mockRejectedValue(new Error('socket closed'));
      const { rpc } = pollingRpc([null], [1001n]);

      const waiting = confirmSolanaSignature(
        { rpc, rpcSubscriptions: {} } as never,
        SIGNATURE,
        1000n
      );
      const verdict = expect(waiting).rejects.toSatisfy(isExpiry);
      await vi.advanceTimersByTimeAsync(5000);
      await verdict;
    });

    it('does not take one ledger miss from a lagging node as expiry', async () => {
      recentSignature.mockRejectedValue(new Error('socket closed'));
      const { rpc } = pollingRpc([null, { confirmationStatus: 'finalized', err: null }], [1001n]);

      const waiting = confirmSolanaSignature(
        { rpc, rpcSubscriptions: {} } as never,
        SIGNATURE,
        1000n
      );
      await vi.advanceTimersByTimeAsync(5000);

      await expect(waiting).resolves.toBeUndefined();
    });

    it('reads the block height before the status, every round', async () => {
      recentSignature.mockRejectedValue(new Error('socket closed'));
      const { rpc, calls } = pollingRpc([null, { confirmationStatus: 'confirmed', err: null }]);

      const waiting = confirmSolanaSignature(
        { rpc, rpcSubscriptions: {} } as never,
        SIGNATURE,
        1000n
      );
      await vi.advanceTimersByTimeAsync(5000);
      await waiting;

      expect(calls).toEqual(['height', 'status', 'height', 'status']);
    });

    it('gives up with an unknown outcome when every request hangs', async () => {
      recentSignature.mockRejectedValue(new Error('socket closed'));
      const hanging = {
        send: ({ abortSignal }: { abortSignal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            abortSignal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      };
      const rpc = { getBlockHeight: () => hanging, getSignatureStatuses: () => hanging };

      const waiting = confirmSolanaSignature(
        { rpc, rpcSubscriptions: {} } as never,
        SIGNATURE,
        1000n
      );
      const verdict = expect(waiting).rejects.toBeInstanceOf(SolanaOutcomeUnknownError);
      await vi.advanceTimersByTimeAsync(200_000);
      await verdict;
    });

    it('gives up with an unknown outcome when the block height stops moving', async () => {
      recentSignature.mockRejectedValue(new Error('socket closed'));
      const { rpc } = pollingRpc([null], [900n]);

      const waiting = confirmSolanaSignature(
        { rpc, rpcSubscriptions: {} } as never,
        SIGNATURE,
        1000n
      );
      const verdict = expect(waiting).rejects.toBeInstanceOf(SolanaOutcomeUnknownError);
      await vi.advanceTimersByTimeAsync(200_000);
      await verdict;
    });

    it('gives up with an unknown outcome when the network cannot be asked at all', async () => {
      recentSignature.mockRejectedValue(new Error('socket closed'));
      const { rpc } = pollingRpc([new Error('offline')]);

      const waiting = confirmSolanaSignature(
        { rpc, rpcSubscriptions: {} } as never,
        SIGNATURE,
        1000n
      );
      const verdict = expect(waiting).rejects.toBeInstanceOf(SolanaOutcomeUnknownError);
      await vi.advanceTimersByTimeAsync(120_000);
      await verdict;
      await expect(waiting).rejects.toMatchObject({
        message: 'transaction.errors.broadcastUnknown',
        signature: SIGNATURE,
      });
    });

    it('passes a failed transaction through without asking again', async () => {
      const failed = getSolanaErrorFromTransactionError('InsufficientFundsForFee');
      recentSignature.mockRejectedValue(failed);
      const { rpc, polls } = pollingRpc([null]);

      await expect(
        confirmSolanaSignature({ rpc, rpcSubscriptions: {} } as never, SIGNATURE, 1000n)
      ).rejects.toBe(failed);
      expect(polls()).toBe(0);
    });
  });
});

describe('sendExpectingOutcome', () => {
  it('returns the node signature when the send goes through', async () => {
    await expect(sendExpectingOutcome(async () => 'node-sig' as never, SIGNATURE)).resolves.toBe(
      'node-sig'
    );
  });

  it.each([
    [-32002, 'a failed preflight'],
    [-32003, 'a bad signature'],
    [-32602, 'malformed params'],
  ])('rethrows %i, %s: the node refused before broadcasting', async (code) => {
    const refused = new SolanaError(code as never, { __serverMessage: 'refused' } as never);
    await expect(
      sendExpectingOutcome(async () => {
        throw refused;
      }, SIGNATURE)
    ).rejects.toBe(refused);
  });

  it.each([
    [-32603, 'an internal error'],
    [-32004, 'a block not available'],
    [-32005, 'an unhealthy node'],
  ])('returns the signature on %i, %s: a gateway can say it after forwarding', async (code) => {
    const ambiguous = new SolanaError(code as never, { __serverMessage: 'upstream' } as never);
    await expect(
      sendExpectingOutcome(async () => {
        throw ambiguous;
      }, SIGNATURE)
    ).resolves.toBe(SIGNATURE);
  });

  it('rethrows an HTTP 429: the rate limiter refused before the node saw it', async () => {
    const limited = new SolanaError(SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR, {
      headers: {} as never,
      message: 'Too Many Requests',
      statusCode: 429,
    });
    await expect(
      sendExpectingOutcome(async () => {
        throw limited;
      }, SIGNATURE)
    ).rejects.toBe(limited);
  });

  it('returns the locally computed signature when the answer was lost', async () => {
    await expect(
      sendExpectingOutcome(async () => {
        throw new Error('fetch failed');
      }, SIGNATURE)
    ).resolves.toBe(SIGNATURE);
  });
});
