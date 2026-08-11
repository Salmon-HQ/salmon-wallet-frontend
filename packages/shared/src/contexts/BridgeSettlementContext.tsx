/**
 * BridgeSettlementContext - background settlement for cross-chain (StealthEX)
 * bridge exchanges.
 *
 * Unlike same-chain actions (send, Jupiter swap, NFT) — which settle in ~12-14s
 * and can dwell behind a success screen via `useSettleUntilChanged` — a bridge
 * exchange settles in MINUTES: StealthEX waits for source confirmations, runs
 * the swap, and pays out on the destination chain. Blocking a screen for that
 * long is unacceptable, so the success screen returns the user immediately and
 * this provider polls the exchange status in the background (surviving
 * navigation, since it mounts at the app root). When StealthEX reports
 * completion it settles the destination balance; on failure/refund it settles
 * the source.
 *
 * In-memory only: a bridge that outlives the session is not resumed after an
 * app restart (a persistence layer would be a follow-up). The user can still
 * see the result via refetch-on-focus / manual refresh once they reopen.
 *
 * @module contexts/BridgeSettlementContext
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { NetworkId } from '../types/blockchain';
import type { BridgeTransaction } from '../types/bridge';
import { getBridgeTransaction } from '../api/services/bridge';
import { trackEvent, trackFirstTime } from '../analytics';
import { useSettleAfterTx } from '../query/invalidation';
import {
  getStorageItem,
  setStorageItem,
  isStorageInitialized,
  STORAGE_KEYS,
} from '../storage';

export interface PendingBridgeExchange {
  /** StealthEX exchange id — used to poll status. */
  id: string;
  /** Chain the deposit left from (settled when the exchange completes/refunds). */
  sourceNetworkId?: NetworkId;
  sourceAccountId?: string;
  /** Chain the payout arrives on (settled when the exchange completes). */
  destNetworkId?: NetworkId;
  destAccountId?: string;
}

interface BridgeSettlementContextValue {
  /**
   * Start tracking a freshly created exchange. Its balances are settled in the
   * background when StealthEX reports completion (destination) or failure/
   * refund (source). Idempotent per exchange id.
   */
  trackBridgeExchange: (exchange: PendingBridgeExchange) => void;
  /** Exchanges currently being polled. */
  pendingExchanges: PendingBridgeExchange[];
  /**
   * True after several consecutive status-poll failures — the settlement
   * watcher is blind, not the exchange failed. Reset on any successful poll.
   */
  isStalled: boolean;
  /** Forces an immediate poll (retry UI hook); cadence is unchanged. */
  retryNow: () => void;
}

const BridgeSettlementContext = createContext<BridgeSettlementContextValue | null>(null);

/**
 * Coarse chain family for analytics, from a `NetworkId` like `solana-mainnet`.
 * Returns undefined for an absent or unrecognised network so the prop is simply
 * dropped (never an exact address, and never an out-of-allow-list value). The
 * bridge only moves funds between the wallet's own chains, so in practice this
 * is always solana / bitcoin / ethereum.
 */
function toChainFamily(networkId?: NetworkId): 'solana' | 'bitcoin' | 'ethereum' | undefined {
  const family = networkId?.split('-')[0];
  return family === 'solana' || family === 'bitcoin' || family === 'ethereum' ? family : undefined;
}

/**
 * Allow-listed swap props for a bridge exchange. `from_chain` / `to_chain` are
 * only included when the network resolved to a known family, so an unknown or
 * absent chain is simply omitted rather than sent as an invalid value.
 */
function bridgeSwapProps(ex: PendingBridgeExchange, success: boolean) {
  const fromChain = toChainFamily(ex.sourceNetworkId);
  const toChain = toChainFamily(ex.destNetworkId);
  return {
    ...(fromChain ? { from_chain: fromChain } : {}),
    ...(toChain ? { to_chain: toChain } : {}),
    success,
  };
}

// StealthEX exchanges take minutes; a coarse cadence is plenty and keeps the
// status endpoint from being hammered.
const DEFAULT_BRIDGE_POLL_INTERVAL_MS = 20_000;

/** Consecutive failed status polls before the provider reports `isStalled`. */
const STALLED_AFTER_CONSECUTIVE_POLL_FAILURES = 3;

export interface BridgeSettlementProviderProps {
  children: React.ReactNode;
  /** Injectable for tests; defaults to the salmon-api bridge status endpoint. */
  getStatus?: (id: string) => Promise<BridgeTransaction | null>;
  /** Poll cadence in ms. */
  pollIntervalMs?: number;
}

export function BridgeSettlementProvider({
  children,
  getStatus = getBridgeTransaction,
  pollIntervalMs = DEFAULT_BRIDGE_POLL_INTERVAL_MS,
}: BridgeSettlementProviderProps): React.ReactElement {
  const [pendingExchanges, setPendingExchanges] = useState<PendingBridgeExchange[]>([]);
  const [isStalled, setIsStalled] = useState(false);
  const settleAfterTx = useSettleAfterTx();
  const pendingRef = useRef<PendingBridgeExchange[]>([]);
  const consecutiveFailuresRef = useRef(0);
  // Latest poll function, so retryNow() can fire it from outside the effect.
  const pollRef = useRef<(() => Promise<void>) | null>(null);
  // Persistence must not run until the initial hydrate from storage completes,
  // otherwise the empty initial state would clobber a stored list.
  const hydratedRef = useRef(false);

  useEffect(() => {
    pendingRef.current = pendingExchanges;
  }, [pendingExchanges]);

  const trackBridgeExchange = useCallback((exchange: PendingBridgeExchange) => {
    setPendingExchanges((prev) =>
      prev.some((p) => p.id === exchange.id) ? prev : [...prev, exchange],
    );
  }, []);

  const remove = useCallback((id: string) => {
    setPendingExchanges((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Hydrate persisted pending exchanges once on mount so a bridge that was
  // created in a previous session (or before the extension popup closed)
  // resumes being polled and settles when it eventually finishes.
  useEffect(() => {
    let active = true;
    (async () => {
      if (isStorageInitialized()) {
        try {
          const stored = await getStorageItem<PendingBridgeExchange[]>(
            STORAGE_KEYS.PENDING_BRIDGES,
          );
          if (active && Array.isArray(stored) && stored.length > 0) {
            setPendingExchanges(stored);
          }
        } catch (err) {
          console.warn('[BridgeSettlement] hydrate failed:', err);
        }
      }
      hydratedRef.current = true;
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist the pending list whenever it changes (after hydration).
  useEffect(() => {
    if (!hydratedRef.current || !isStorageInitialized()) return;
    setStorageItem(STORAGE_KEYS.PENDING_BRIDGES, pendingExchanges).catch((err) => {
      console.warn('[BridgeSettlement] persist failed:', err);
    });
  }, [pendingExchanges]);

  useEffect(() => {
    if (pendingExchanges.length === 0) return undefined;
    let cancelled = false;

    const poll = async () => {
      // Snapshot so removals mid-loop don't skip entries.
      for (const ex of [...pendingRef.current]) {
        let tx: BridgeTransaction | null = null;
        try {
          tx = await getStatus(ex.id);
          consecutiveFailuresRef.current = 0;
          setIsStalled(false);
        } catch (err) {
          console.warn('[BridgeSettlement] status poll failed:', err);
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= STALLED_AFTER_CONSECUTIVE_POLL_FAILURES) {
            setIsStalled(true);
          }
          continue;
        }
        if (cancelled || !tx) continue;

        if (tx.status === 'success') {
          // Anonymous funnel event: a cross-chain (bridge) swap settled. This is
          // the ONLY place bridge swaps are tracked — the Jupiter path lives in
          // useSwap. Emitting on the polled settlement outcome (not on exchange
          // creation) means the chains and the success flag are the real result,
          // and the poll survives navigation/restart so it is still observed.
          trackEvent('swap_completed', bridgeSwapProps(ex, true));
          // A bridge can be a user's first swap of any kind.
          void trackFirstTime('first_swap_completed', STORAGE_KEYS.ANALYTICS_FIRST_SWAP);
          // Payout landed on the destination chain, whose indexer still lags —
          // use the delayed settle schedule there. The source deposit is long
          // since spent, so settle it immediately (no delays).
          await settleAfterTx({
            networkId: ex.destNetworkId,
            accountId: ex.destAccountId,
            kinds: ['balance', 'transactions'],
          }).catch(() => undefined);
          if (ex.sourceNetworkId || ex.sourceAccountId) {
            await settleAfterTx({
              networkId: ex.sourceNetworkId,
              accountId: ex.sourceAccountId,
              kinds: ['balance', 'transactions'],
              settlementDelaysMs: [],
            }).catch(() => undefined);
          }
          remove(ex.id);
        } else if (tx.status === 'fail' || tx.status === 'refunded') {
          // The bridge swap failed (or was refunded). Emitting success:false here
          // is what makes the swap success/failure rate real for cross-chain too.
          trackEvent('swap_completed', bridgeSwapProps(ex, false));
          // Funds returned on the source side.
          await settleAfterTx({
            networkId: ex.sourceNetworkId,
            accountId: ex.sourceAccountId,
            kinds: ['balance', 'transactions'],
          }).catch(() => undefined);
          remove(ex.id);
        }
        // 'inProgress' / 'unknown' -> keep polling.
      }
    };

    // Poll once immediately so a resumed (rehydrated) exchange that already
    // finished while the app was closed settles right away instead of waiting a
    // full interval.
    pollRef.current = poll;
    void poll();
    const interval = setInterval(poll, pollIntervalMs);
    return () => {
      cancelled = true;
      pollRef.current = null;
      clearInterval(interval);
    };
  }, [pendingExchanges.length, pollIntervalMs, getStatus, settleAfterTx, remove]);

  const retryNow = useCallback(() => {
    void pollRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ trackBridgeExchange, pendingExchanges, isStalled, retryNow }),
    [trackBridgeExchange, pendingExchanges, isStalled, retryNow],
  );

  return (
    <BridgeSettlementContext.Provider value={value}>{children}</BridgeSettlementContext.Provider>
  );
}

export function useBridgeSettlement(): BridgeSettlementContextValue {
  const ctx = useContext(BridgeSettlementContext);
  if (!ctx) {
    throw new Error('useBridgeSettlement must be used within a BridgeSettlementProvider');
  }
  return ctx;
}
