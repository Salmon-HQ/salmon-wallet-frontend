/**
 * PendingTransactionsContext — global in-flight state for on-chain transactions
 * the wallet submitted itself (send and same-chain swap).
 *
 * The problem it solves: before this existed, the only surface that ever
 * reported whether a swap or a send landed was the screen the user happened to
 * be on when they signed. `step` is local state and the settle await is owned by
 * the screen, so a tab tap, a lock, a closed side panel or an app restart
 * orphaned the outcome. Leaving a screen cost the user the answer to "did my
 * money move".
 *
 * Mounted at the app root, persisted to storage, polled in the background,
 * rehydrated on restart. `usePendingActivity` is the surface: it is what the
 * one pending banner the user sees renders from.
 *
 * ## What "done" means, once, for the whole app
 *
 * Two different signals used to both claim to mean "finished", and they
 * disagreed for up to twenty seconds:
 *
 * 1. **Chain confirmation** — `getSignatureStatuses`, polled here, typically
 *    1–3s. This is the **verdict**: the transaction either landed or it did
 *    not, and nothing after this can change that answer.
 * 2. **Indexer settlement** — `settleUntilChanged`, polled by the screen that
 *    signed, ceiling 20s. This is *not* a verdict; it is how long the balance
 *    the user is about to look at takes to catch up.
 *
 * **The chain is the answer. The indexer is a stage.** So `status` here flips
 * on the chain's word, and a screen that is still waiting on the indexer is
 * showing the *last stage of the same report*, not a competing one.
 *
 * Which leaves the coherence rule, and it is a rule about *surfaces*, not about
 * either signal: **one signature is reported by one surface at a time.** While
 * a screen in the foreground is reporting a signature, it claims it through
 * `claimForegroundReport`, and `usePendingActivity` withholds that row from the
 * banner. When the screen releases — because it settled, or because the user
 * left — the banner takes the report over. It is never possible for the app to
 * say "processing" and "confirmed" about one signature at the same time.
 *
 * The claim lives here, and the guard lives in `usePendingActivity`, because
 * the same split produced the same bug on three flows (swap, send, NFT send).
 * A guard inside any one screen's hook fixes one of them.
 *
 * Scope: Solana only. Bitcoin and Ethereum sends are not tracked here because
 * there is no cross-chain status lookup in this package yet, and a pending row
 * that can never resolve is worse than no row. Non-Solana entries are dropped
 * at `trackPendingTransaction` rather than silently stuck.
 *
 * @module contexts/PendingTransactionsContext
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
import {
  getSolanaSignatureOutcomes,
  type SignatureOutcome,
  type SignatureOutcomeLookup,
} from '../blockchain/solana/signature-status';
import { useSettleAfterTx } from '../query/invalidation';
import { getStorageItem, setStorageItem, isStorageInitialized, STORAGE_KEYS } from '../storage';

/** What the user was doing. Drives the banner's label, not its behaviour. */
export type PendingTransactionKind = 'send' | 'swap';

export type PendingTransactionStatus = SignatureOutcome;

export interface PendingTransaction {
  /** Transaction signature — the identity of the entry. */
  signature: string;
  kind: PendingTransactionKind;
  networkId: NetworkId;
  /** Receive address whose balance settles when this resolves. */
  accountId?: string;
  /** Epoch ms of submission. Drives the expiry verdict. */
  submittedAt: number;
  /**
   * Amounts and symbols only (e.g. `1.5 SOL → 210 USDC`). Never prose: this is
   * rendered verbatim next to translated copy, so it must carry no language.
   */
  summary?: string;
  status: PendingTransactionStatus;
}

interface PendingTransactionsContextValue {
  /** Everything in flight plus recently resolved entries still being shown. */
  pendingTransactions: PendingTransaction[];
  /**
   * Start tracking a freshly submitted signature. Idempotent per signature;
   * ignores non-Solana networks (see module doc).
   */
  trackPendingTransaction: (tx: Omit<PendingTransaction, 'status'>) => void;
  /** Remove an entry the user acknowledged. */
  dismissPendingTransaction: (signature: string) => void;
  /**
   * Signatures a foreground screen is currently reporting itself. The banner
   * withholds these rows so the app never reports one signature twice, in two
   * states, at once. See the module doc.
   */
  foregroundReported: readonly string[];
  /**
   * Claim a signature for the screen in the foreground. Returns the release —
   * call it when the screen stops reporting (settled, errored, or unmounted).
   * Idempotent per signature; releasing twice is safe.
   */
  claimForegroundReport: (signature: string) => () => void;
}

const PendingTransactionsContext = createContext<PendingTransactionsContextValue | null>(null);

/**
 * Poll cadence. RPC nodes forward transactions to leaders every ~2s and a
 * signature's whole life is ~60-90s, so anything coarser than this spends a
 * meaningful share of the window not knowing.
 */
const DEFAULT_POLL_INTERVAL_MS = 3_000;

/**
 * How long a resolved entry stays on screen before it removes itself. Long
 * enough to be read on return from another app, short enough not to become
 * furniture.
 */
const RESOLVED_DWELL_MS = 12_000;

function isSolanaNetwork(networkId: string): boolean {
  return networkId.startsWith('solana');
}

function isResolved(tx: PendingTransaction): boolean {
  return tx.status !== 'pending';
}

export interface PendingTransactionsProviderProps {
  children: React.ReactNode;
  /** Injectable for tests; defaults to the batched `getSignatureStatuses` read. */
  getOutcomes?: SignatureOutcomeLookup;
  pollIntervalMs?: number;
}

export function PendingTransactionsProvider({
  children,
  getOutcomes = getSolanaSignatureOutcomes,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: PendingTransactionsProviderProps): React.ReactElement {
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const settleAfterTx = useSettleAfterTx();
  const pendingRef = useRef<PendingTransaction[]>([]);
  // Persistence must not run before the hydrate completes, or the empty initial
  // state clobbers a stored list. State rather than a ref so the persist effect
  // re-runs the moment hydration finishes — a transaction signed while the
  // hydrate was still in flight would otherwise never be written at all.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    pendingRef.current = pendingTransactions;
  }, [pendingTransactions]);

  const trackPendingTransaction = useCallback((tx: Omit<PendingTransaction, 'status'>) => {
    if (!tx.signature || !isSolanaNetwork(tx.networkId)) return;
    setPendingTransactions((prev) =>
      prev.some((p) => p.signature === tx.signature)
        ? prev
        : [...prev, { ...tx, status: 'pending' }]
    );
  }, []);

  const [foregroundReported, setForegroundReported] = useState<string[]>([]);

  const claimForegroundReport = useCallback((signature: string) => {
    if (!signature) return () => undefined;
    setForegroundReported((prev) => (prev.includes(signature) ? prev : [...prev, signature]));
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setForegroundReported((prev) => prev.filter((s) => s !== signature));
    };
  }, []);

  const dismissPendingTransaction = useCallback((signature: string) => {
    setPendingTransactions((prev) => prev.filter((p) => p.signature !== signature));
  }, []);

  // Hydrate once on mount so a transaction signed in a previous session — or
  // before the side panel closed, or before the wallet locked — is still
  // reported when the user comes back.
  useEffect(() => {
    let active = true;
    (async () => {
      if (isStorageInitialized()) {
        try {
          const stored = await getStorageItem<PendingTransaction[]>(
            STORAGE_KEYS.PENDING_TRANSACTIONS
          );
          if (active && Array.isArray(stored) && stored.length > 0) {
            setPendingTransactions(stored.filter((tx) => tx && tx.status === 'pending'));
          }
        } catch (err) {
          console.warn('[PendingTransactions] hydrate failed:', err);
        }
      }
      if (active) setHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist only what is still in flight. A resolved entry is a UI dwell, not
  // durable state — restoring one after a restart would report an outcome the
  // user already saw, or worse, one they never saw a beginning for.
  useEffect(() => {
    if (!hydrated || !isStorageInitialized()) return;
    const inFlight = pendingTransactions.filter((tx) => !isResolved(tx));
    setStorageItem(STORAGE_KEYS.PENDING_TRANSACTIONS, inFlight).catch((err) => {
      console.warn('[PendingTransactions] persist failed:', err);
    });
  }, [pendingTransactions, hydrated]);

  const inFlightCount = pendingTransactions.filter((tx) => !isResolved(tx)).length;

  useEffect(() => {
    if (inFlightCount === 0) return undefined;
    let cancelled = false;

    const poll = async () => {
      const inFlight = pendingRef.current.filter((tx) => !isResolved(tx));
      const byNetwork = new Map<NetworkId, PendingTransaction[]>();
      for (const tx of inFlight) {
        byNetwork.set(tx.networkId, [...(byNetwork.get(tx.networkId) ?? []), tx]);
      }

      for (const [networkId, group] of byNetwork) {
        let outcomes: Record<string, SignatureOutcome>;
        try {
          outcomes = await getOutcomes(
            networkId,
            group.map((tx) => ({ signature: tx.signature, submittedAt: tx.submittedAt }))
          );
        } catch (err) {
          // An unreachable node says nothing about whether the transaction
          // landed. Keep waiting rather than inventing a verdict.
          console.warn('[PendingTransactions] status poll failed:', err);
          continue;
        }
        if (cancelled) return;

        for (const tx of group) {
          const outcome = outcomes[tx.signature];
          if (!outcome || outcome === 'pending') continue;

          setPendingTransactions((prev) =>
            prev.map((p) => (p.signature === tx.signature ? { ...p, status: outcome } : p))
          );

          // `expired` never touched the chain, so there is nothing to settle.
          // `failed` did land and did spend the fee, so the balance moved.
          if (outcome === 'confirmed' || outcome === 'failed') {
            await settleAfterTx({
              networkId: tx.networkId,
              accountId: tx.accountId,
              kinds: ['balance', 'transactions'],
            }).catch(() => undefined);
          }
        }
      }
    };

    // Poll immediately so a rehydrated entry that resolved while the app was
    // closed reports its outcome now instead of one interval from now.
    void poll();
    const interval = setInterval(() => void poll(), pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [inFlightCount, pollIntervalMs, getOutcomes, settleAfterTx]);

  // Retire resolved entries after their dwell.
  const resolvedKey = pendingTransactions
    .filter(isResolved)
    .map((tx) => tx.signature)
    .join(',');
  useEffect(() => {
    if (!resolvedKey) return undefined;
    const signatures = resolvedKey.split(',');
    const timer = setTimeout(() => {
      setPendingTransactions((prev) => prev.filter((p) => !signatures.includes(p.signature)));
    }, RESOLVED_DWELL_MS);
    return () => clearTimeout(timer);
  }, [resolvedKey]);

  const value = useMemo(
    () => ({
      pendingTransactions,
      trackPendingTransaction,
      dismissPendingTransaction,
      foregroundReported,
      claimForegroundReport,
    }),
    [
      pendingTransactions,
      trackPendingTransaction,
      dismissPendingTransaction,
      foregroundReported,
      claimForegroundReport,
    ]
  );

  return (
    <PendingTransactionsContext.Provider value={value}>
      {children}
    </PendingTransactionsContext.Provider>
  );
}

export function usePendingTransactions(): PendingTransactionsContextValue {
  const ctx = useContext(PendingTransactionsContext);
  if (!ctx) {
    throw new Error('usePendingTransactions must be used within a PendingTransactionsProvider');
  }
  return ctx;
}

/**
 * Non-throwing accessor for call sites that legitimately run outside the
 * provider — the shared send/swap hooks are exercised in app tests that mount
 * neither app root, and failing to record a pending entry must never break a
 * transaction that already succeeded.
 */
export function usePendingTransactionsOptional(): PendingTransactionsContextValue | null {
  return useContext(PendingTransactionsContext);
}

export { PendingTransactionsContext };
