import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const recentSignature = vi.fn();
const blockHeightExceedence = vi.fn();

vi.mock('@solana/transaction-confirmation', () => ({
  createRecentSignatureConfirmationPromiseFactory: () => recentSignature,
  createBlockHeightExceedencePromiseFactory: () => blockHeightExceedence,
}));

const { confirmSolanaSignature } = await import('./confirm');

const SIGNATURE = 'a-signature' as never;
const clients = { rpc: {}, rpcSubscriptions: {} } as never;

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
    blockHeightExceedence.mockRejectedValue(new Error('BLOCK_HEIGHT_EXCEEDED'));

    await expect(confirmSolanaSignature(clients, SIGNATURE, 1000n)).rejects.toThrow(
      'BLOCK_HEIGHT_EXCEEDED'
    );
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
      expiry.reject(new Error('BLOCK_HEIGHT_EXCEEDED'));
      await expect(waiting).rejects.toThrow('BLOCK_HEIGHT_EXCEEDED');

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
});
