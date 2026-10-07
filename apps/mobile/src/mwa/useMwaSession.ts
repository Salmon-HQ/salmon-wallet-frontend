import {
  initializeMobileWalletAdapterSession,
  initializeMWAEventListener,
  MWARequestFailReason,
  MWASessionEventType,
  resolve,
  type MobileWalletAdapterConfig,
  type MWARequest,
  type MWAResponse,
} from '@solana-mobile/mobile-wallet-adapter-walletlib';
import { useCallback, useEffect, useRef, useState } from 'react';

/** What Salmon tells dApps it accepts (spec 036 data-model). */
export const MWA_CONFIG: MobileWalletAdapterConfig = {
  maxTransactionsPerSigningRequest: 10,
  maxMessagesPerSigningRequest: 10,
  supportedTransactionVersions: [0, 'legacy'],
  noConnectionWarningTimeoutMs: 3000,
  // signTransactions is optional (and deprecated) in MWA 2.0, but dApps still call it.
  optionalFeatures: ['solana:signInWithSolana', 'solana:signTransactions'],
};

const DECLINED: MWAResponse = { failReason: MWARequestFailReason.UserDeclined };

const SESSION_ENDED = new Set<string>([
  MWASessionEventType.SessionTerminatedEvent,
  MWASessionEventType.SessionCompleteEvent,
]);

/**
 * One Mobile Wallet Adapter session: requests are shown one at a time, in
 * arrival order, and each is answered exactly once — by the screen, or with a
 * decline when the dApp leaves or the screen goes away.
 */
export function useMwaSession({ onEnd }: { onEnd: () => void }) {
  const queue = useRef<MWARequest[]>([]);
  const [current, setCurrent] = useState<MWARequest | null>(null);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const answerHead = useCallback((response: MWAResponse) => {
    const head = queue.current.shift();
    if (!head) return;
    try {
      // `resolve` is overloaded per request type; the screen picked the shape.
      resolve(head as never, response as never);
    } catch (error) {
      // A session the dApp already closed must not strand the requests behind it.
      console.warn('[mwa] could not answer a request', error);
    }
    setCurrent(queue.current[0] ?? null);
  }, []);

  const declineAll = useCallback(() => {
    while (queue.current.length) answerHead(DECLINED);
  }, [answerHead]);

  useEffect(() => {
    const listener = initializeMWAEventListener(
      (request) => {
        queue.current.push(request);
        setCurrent(queue.current[0]);
      },
      (event) => {
        if (!SESSION_ENDED.has(event.__type)) return;
        declineAll();
        onEndRef.current();
      }
    );
    initializeMobileWalletAdapterSession('Salmon', MWA_CONFIG).catch((error: unknown) => {
      console.warn('[mwa] session could not start', error);
      onEndRef.current();
    });
    return () => {
      listener.remove();
      declineAll();
    };
  }, [declineAll]);

  const respond = useCallback(
    (response: MWAResponse) => {
      // A screen that answers twice (double tap, effect re-run) must not
      // answer the next request with the previous one's response.
      if (queue.current[0] !== current) return;
      answerHead(response);
    },
    [answerHead, current]
  );

  return { current, respond };
}
