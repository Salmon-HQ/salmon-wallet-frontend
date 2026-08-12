import { useCallback } from 'react';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import type { NetworkId } from '../types/blockchain';

export type InvalidationKind = 'balance' | 'nfts' | 'avatar-nfts' | 'transactions';

export interface InvalidationOptions {
  /** The account whose data should be invalidated. Pass undefined to invalidate all accounts (rare). */
  accountId?: string;
  /** Parent wallet account id for avatar-nfts caches, whose keys use Account.id rather than receive address. */
  avatarAccountId?: string;
  /** Optional network filter. If omitted, invalidates across networks for the account. */
  networkId?: NetworkId;
  /** Which query kinds to invalidate. */
  kinds: InvalidationKind[];
  /**
   * NFT mint addresses (`nft.mint.address`) that the just-confirmed
   * transaction has moved out of the user's wallet — typically the burned
   * or transferred NFT. They are filtered out of every cached
   * `solana-nfts` / `avatar-nfts` list and their `solana-nft-detail`
   * entries are dropped before invalidation runs, so the UI hides them
   * instantly even when the DAS provider (Helius/Triton) is still 30–60s
   * behind.
   */
  removedNftMintAddresses?: string[];
}

export interface SettlementOptions extends InvalidationOptions {
  /**
   * Follow-up refetches compensate for provider/indexer read-after-write lag.
   * The immediate invalidation still runs first; each delay schedules one
   * additional scoped invalidation/refetch.
   */
  settlementDelaysMs?: number[];
}

export interface SettleUntilChangedOptions extends InvalidationOptions {
  /** How often to re-poll the balance while waiting for the indexer. */
  pollIntervalMs?: number;
  /**
   * Hard ceiling on the wait. Reaching it resolves with `changed: false` after
   * a final refetch, so a screen gated on this never hangs if the indexer
   * stalls or the on-chain delta is below the dust threshold.
   */
  maxWaitMs?: number;
}

export interface SettleResult {
  /** True if the balance signature changed before the ceiling was hit. */
  changed: boolean;
  /** Total time waited, ms. */
  waitedMs: number;
}

const DEFAULT_POLL_INTERVAL_MS = 2_500;
const DEFAULT_MAX_WAIT_MS = 20_000;

const KIND_TO_PREFIX: Record<InvalidationKind, string> = {
  balance: 'balance',
  nfts: 'solana-nfts',
  'avatar-nfts': 'avatar-nfts',
  transactions: 'transactions',
};

// Measured read-after-write lag of the salmon-api balance endpoint (no-cache,
// backed by Blockdaemon's indexed balance) is ~12.3-12.7s on a quiet wallet —
// it consistently trails an on-chain `confirmed` change until roughly the
// confirmed->finalized boundary (~32 slots). A single 10s refetch fires ~2s
// BEFORE the indexer settles, so it reads stale and, with no refetchInterval,
// the balance stays stale until window-focus/manual refresh. The first delay
// lands just past the measured settle; the second is a safety net for slower
// indexer runs.
const DEFAULT_SETTLEMENT_DELAYS_MS = [13_000, 25_000];

function getRemovedMintAddress(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const mint = (item as { mint?: unknown }).mint;
  if (typeof mint === 'string') return mint;
  if (mint && typeof mint === 'object') {
    return (mint as { address?: string }).address;
  }
  return undefined;
}

function matchesInvalidation(opts: InvalidationOptions, kind: InvalidationKind) {
  const prefix = KIND_TO_PREFIX[kind];
  return (query: { queryKey: readonly unknown[] }): boolean => {
    const [head, params] = query.queryKey as [string, Record<string, unknown> | undefined];
    // 'nfts' kind also invalidates single-NFT detail caches
    const matchesHead = head === prefix || (kind === 'nfts' && head === 'solana-nft-detail');
    if (!matchesHead) return false;
    const accountId =
      kind === 'avatar-nfts' ? (opts.avatarAccountId ?? opts.accountId) : opts.accountId;
    if (accountId && params?.accountId !== accountId) return false;
    if (opts.networkId && params?.networkId && params.networkId !== opts.networkId) return false;
    return true;
  };
}

function removeOptimisticNfts(queryClient: QueryClient, opts: InvalidationOptions): void {
  if (!opts.removedNftMintAddresses?.length) return;

  const removed = new Set(opts.removedNftMintAddresses);
  queryClient.setQueriesData<unknown[]>(
    {
      predicate: (query) => {
        const [head, params] = query.queryKey as [string, Record<string, unknown> | undefined];
        if (head !== 'solana-nfts' && head !== 'avatar-nfts') return false;
        const accountId =
          head === 'avatar-nfts' ? (opts.avatarAccountId ?? opts.accountId) : opts.accountId;
        if (accountId && params?.accountId !== accountId) return false;
        if (
          head === 'solana-nfts' &&
          opts.networkId &&
          params?.networkId &&
          params.networkId !== opts.networkId
        ) {
          return false;
        }
        return true;
      },
    },
    (oldData) => {
      if (!Array.isArray(oldData)) return oldData;
      return oldData.filter((nft) => {
        const mintAddress = getRemovedMintAddress(nft);
        return !mintAddress || !removed.has(mintAddress);
      });
    }
  );
  queryClient.removeQueries({
    predicate: (query) => {
      const [head, params] = query.queryKey as [string, Record<string, unknown> | undefined];
      if (head !== 'solana-nft-detail') return false;
      if (opts.networkId && params?.networkId && params.networkId !== opts.networkId) {
        return false;
      }
      return removed.has(params?.mintAddress as string);
    },
  });
}

async function invalidateAfterTx(
  queryClient: QueryClient,
  opts: InvalidationOptions
): Promise<void> {
  // Optimistic NFT removal runs before invalidation so the UI updates
  // immediately while DAS providers catch up.
  removeOptimisticNfts(queryClient, opts);

  const tasks: Promise<void>[] = [];
  for (const kind of opts.kinds) {
    tasks.push(
      queryClient
        .invalidateQueries({
          predicate: matchesInvalidation(opts, kind),
          // Force refetch of inactive queries (e.g. TokenList on a tab
          // that's not currently focused). Without this, RQ marks the
          // cache stale but only refetches on next mount — and tab
          // navigators preserve instances, so the home screen never
          // remounts when the user returns from the swap success
          // modal. Result: stale balances until full page reload.
          refetchType: 'all',
        })
        .then(() => undefined)
    );
  }
  await Promise.all(tasks);
  removeOptimisticNfts(queryClient, opts);
}

async function refetchAfterTx(queryClient: QueryClient, opts: InvalidationOptions): Promise<void> {
  const tasks: Promise<void>[] = [];
  for (const kind of opts.kinds) {
    tasks.push(
      queryClient
        .refetchQueries({
          predicate: matchesInvalidation(opts, kind),
          type: 'all',
        })
        .then(() => undefined)
    );
  }
  await Promise.all(tasks);
}

export function useInvalidateAfterTx(): (opts: InvalidationOptions) => Promise<void> {
  const queryClient = useQueryClient();

  return useCallback(
    async (opts) => {
      await invalidateAfterTx(queryClient, opts);
    },
    [queryClient]
  );
}

export function useSettleAfterTx(): (opts: SettlementOptions) => Promise<void> {
  const queryClient = useQueryClient();

  return useCallback(
    async (opts) => {
      const { settlementDelaysMs = DEFAULT_SETTLEMENT_DELAYS_MS, ...invalidationOpts } = opts;

      await invalidateAfterTx(queryClient, invalidationOpts);

      for (const delay of settlementDelaysMs) {
        setTimeout(async () => {
          try {
            await refetchAfterTx(queryClient, invalidationOpts);
            removeOptimisticNfts(queryClient, invalidationOpts);
          } catch (err) {
            console.warn('[useSettleAfterTx] delayed invalidation failed:', err);
          }
        }, delay);
      }
    },
    [queryClient]
  );
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Stable on-chain signature of the matching balance queries. Keys only on
 * per-token `amount`, so price/usd fields (which tick independently of any tx)
 * never register as a "change". Empty string when no balance query is cached.
 */
function balanceSignature(queryClient: QueryClient, opts: InvalidationOptions): string {
  const matches = queryClient.getQueriesData<{
    items?: Array<{ address?: string; amount?: string }>;
  }>({ predicate: matchesInvalidation(opts, 'balance') });

  return matches
    .map(([key, data]) => {
      const items = data?.items ?? [];
      const sig = items
        .map((i) => `${i.address}:${i.amount}`)
        .sort()
        .join('|');
      return `${JSON.stringify(key)}=>${sig}`;
    })
    .sort()
    .join('||');
}

/**
 * Event-driven settlement for same-chain actions (send, Jupiter swap, NFT
 * burn/send). Snapshots the balance, then refetches on an interval until the
 * indexer reflects the change — resolving the moment the balance signature
 * differs, or after `maxWaitMs`. A success screen can `await` this so it dwells
 * exactly as long as the indexer needs (typically ~12-14s) and no longer,
 * guaranteeing the user returns to a fresh balance instead of a stale one.
 *
 * NOT for the StealthEX bridge: cross-chain settlement takes minutes, so the
 * destination balance is settled by the background exchange-status poller
 * instead of by blocking a screen.
 */
export function useSettleUntilChanged(): (
  opts: SettleUntilChangedOptions
) => Promise<SettleResult> {
  const queryClient = useQueryClient();

  return useCallback(
    async (opts) => {
      const {
        pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
        maxWaitMs = DEFAULT_MAX_WAIT_MS,
        ...inv
      } = opts;

      // Snapshot the pre-settle (stale) balance before any refetch.
      const before = balanceSignature(queryClient, inv);

      // Immediate invalidation + refetch (also handles optimistic NFT removal).
      await invalidateAfterTx(queryClient, inv);

      // The immediate refetch may already be fresh on a fast indexer run.
      if (balanceSignature(queryClient, inv) !== before) {
        return { changed: true, waitedMs: 0 };
      }

      const start = Date.now();
      while (Date.now() - start < maxWaitMs) {
        await sleep(pollIntervalMs);
        try {
          await refetchAfterTx(queryClient, { ...inv, kinds: ['balance'] });
        } catch (err) {
          console.warn('[useSettleUntilChanged] poll refetch failed:', err);
        }
        if (balanceSignature(queryClient, inv) !== before) {
          // Indexer moved — refetch the remaining kinds and re-hide optimistic
          // NFT removals that the server refetch may have resurrected.
          await refetchAfterTx(queryClient, inv).catch(() => undefined);
          removeOptimisticNfts(queryClient, inv);
          return { changed: true, waitedMs: Date.now() - start };
        }
      }

      // Ceiling hit: do a final full refetch so the cache is at least as fresh
      // as the provider allows, then let the screen proceed.
      await refetchAfterTx(queryClient, inv).catch(() => undefined);
      removeOptimisticNfts(queryClient, inv);
      return { changed: false, waitedMs: Date.now() - start };
    },
    [queryClient]
  );
}
