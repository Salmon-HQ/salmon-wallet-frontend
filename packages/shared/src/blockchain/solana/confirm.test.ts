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
  SolanaError,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
} = await import('@solana/errors');

const SIGNATURE = 'a-signature' as never;
const clients = { rpc: {}, rpcSubscriptions: {} } as never;

/** The chain's own verdict that the blockhash expired, as the library throws it. */
function expired() {
  return new SolanaError(SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED, {
    currentBlockHeight: 1001n,
    lastValidBlockHeight: 1000n,
  });
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

  it("throws the chain's verdict when the blockhash expires first", async () => {
    recentSignature.mockReturnValue(new Promise(() => {}));
    blockHeightExceedence.mockRejectedValue(expired());

    await expect(confirmSolanaSignature(clients, SIGNATURE, 1000n)).rejects.toMatchObject({
      context: { __code: SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED },
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

      const waiting = confirmSolanaSignature(clients, SIGNATURE, 1000n, {
        resend,
        resendIntervalMs: 1000,
      });

      await vi.advanceTimersByTimeAsync(1000);
      expiry.reject(expired());
      await expect(waiting).rejects.toMatchObject({
        context: { __code: SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED },
      });

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
    /** An HTTP RPC whose answers the test scripts, one per poll. */
    function pollingRpc(
      statuses: Array<unknown | Error>,
      heights: bigint[] = [500n]
    ): { rpc: unknown; polls: () => number } {
      let polls = 0;
      const rpc = {
        getSignatureStatuses: () => ({
          send: async () => {
            const answer = statuses[Math.min(polls, statuses.length - 1)];
            polls += 1;
            if (answer instanceof Error) throw answer;
            return { value: [answer] };
          },
        }),
        getBlockHeight: () => ({
          send: async () => heights[Math.min(polls, heights.length) - 1] ?? heights[0],
        }),
      };
      return { rpc, polls: () => polls };
    }

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
      const verdict = expect(waiting).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof SolanaError &&
          error.context.__code === SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED
      );
      await vi.advanceTimersByTimeAsync(5000);
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

    it("passes the chain's verdict through without asking again", async () => {
      const failed = new SolanaError(SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED, {
        currentBlockHeight: 1001n,
        lastValidBlockHeight: 1000n,
      });
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

  it('rethrows a refusal the node answered (nothing was broadcast)', async () => {
    const refused = new SolanaError(-32002 as never, { __serverMessage: 'preflight' } as never);
    await expect(
      sendExpectingOutcome(async () => {
        throw refused;
      }, SIGNATURE)
    ).rejects.toBe(refused);
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
