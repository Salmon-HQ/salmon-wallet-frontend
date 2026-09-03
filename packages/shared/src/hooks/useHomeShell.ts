/**
 * useHomeShell — the state both Homes carry, once.
 *
 * Home is the same screen on mobile (`apps/mobile/app/(app)/(tabs)/index.tsx`)
 * and on the side panel (`apps/extension/src/pages/home/HomePage.tsx`): the
 * balance block paging through the wallet's networks, the Portfolio | NFTs
 * row in the user's order, a content region that swaps with the sink/float
 * verb. This hook holds what is not platform-bound in that — the page index,
 * the balances per page, which network the screen stands on, which sub-tabs
 * are offered there, and WHICH wrapper owns the current swap so the verb
 * never nests (DESIGN.md §The balance block's motion, rule five). Each
 * platform keeps its own rendering, its own fade reset, haptics and routing.
 *
 * Readers: both Homes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getBlockchainFromNetworkId } from '../config/blockchains';
import type { BlockchainType } from '../types/blockchain';
import type { CoinInfo } from '../types/price';
import type { Token } from '../types/ui';
import type { BlockchainBalance, BlockchainId } from '../types/ui/balance-card';
import { useHomeTabOrder } from './useHomeTabOrder';

/** The two in-page sub-tabs. NFTs only exist on Solana — see `nftsOffered`. */
export type HomeSubTabKey = 'portfolio' | 'nfts';

/**
 * The sub-tabs Home offers, in the order it draws them before the user has
 * arranged anything. A powerup that adds a surface to Home adds its key here;
 * `useHomeTabOrder` reconciles the stored arrangement against this list.
 */
export const HOME_TAB_KEYS: HomeSubTabKey[] = ['portfolio', 'nfts'];

/** What can swap Home's content, and therefore which wrapper plays the verb. */
export type HomeSwapCause = 'none' | 'chain' | 'subtab' | 'task';

export interface UseHomeShellParams {
  /** The networks the balance block offers, in page order. */
  allNetworks: ReadonlyArray<{ id: string; name: string }>;
  /** The persisted active network. */
  networkId: string | null | undefined;
  /** The active wallet — the index sync is keyed on account AND network. */
  activeAccountId: string | undefined;
  /** The wallet's derivations per network; a page it lacks cannot be selected. */
  networksAccounts: Record<string, unknown> | undefined;
  /** The active network's balance, as `useBalance` reports it. */
  balance: {
    usdTotal: number | undefined;
    nativeAmount: number | undefined;
    changePercent: number | undefined;
    changeAmount: number | undefined;
    hasData: boolean;
  };
  /** From `useTaskChrome`. */
  isTaskEngaged: boolean;
  surfaceKey: number;
  /** Persists the network change; the index is written optimistically first. */
  changeNetwork: (networkId: string) => Promise<unknown> | unknown;
}

export interface UseHomeShellResult {
  activeBlockchainIndex: number;
  /** One entry per offered network; only the active one carries figures. */
  blockchainBalances: BlockchainBalance[];
  /** The network the screen stands on — every surface follows it (spec 026). */
  currentNetworkId: string;
  currentChain: BlockchainType;
  /** NFTs are a Solana surface: elsewhere the tab is not offered. */
  nftsOffered: boolean;
  activeSubTab: HomeSubTabKey;
  /** `activeSubTab`, or Portfolio when the active tab is not offered here. */
  effectiveSubTab: HomeSubTabKey;
  setActiveSubTab: (key: HomeSubTabKey) => void;
  subTabOrder: string[];
  setSubTabOrder: (order: string[]) => void;
  /** The tabs to draw, labelled, in the user's order, minus what is not offered. */
  subTabs: { key: HomeSubTabKey; label: string }[];
  /** The rendered set — the row plays the verb when THIS changes, not on a switch. */
  subTabsKey: string;
  /** False on first mount and after a surfacing; true when the tab set changed. */
  tabsHasPrior: boolean;
  /** Who owns the current swap; exactly one wrapper animates. */
  swapCause: HomeSwapCause;
  taskHasPrior: boolean;
  subTabHasPrior: boolean;
  chainHasPrior: boolean;
  /**
   * Turn the balance block to `index`. Returns false — and does nothing — when
   * the wallet has no derivation for that page: `changeNetwork` would return
   * silently and an optimistic index left the dots pointing at a chain the
   * wallet never switched to.
   */
  selectBlockchain: (index: number) => boolean;
}

/** `solana-mainnet` → `solana`, `solana-devnet` → `solana-devnet` — the carousel's theming id. */
export function blockchainIdOf(networkId: string): BlockchainId {
  return networkId.replace('-mainnet', '') as BlockchainId;
}

export function useHomeShell({
  allNetworks,
  networkId,
  activeAccountId,
  networksAccounts,
  balance,
  isTaskEngaged,
  surfaceKey,
  changeNetwork,
}: UseHomeShellParams): UseHomeShellResult {
  const { t } = useTranslation();
  const [activeBlockchainIndex, setActiveBlockchainIndex] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<HomeSubTabKey>('portfolio');

  // Sync the page index with the persisted networkId — but only when that id
  // actually changes. `changeNetwork` is async, so a chain switch sets the
  // index optimistically and the persisted id catches up a beat later;
  // re-running inside that beat re-derived the index from the OLD id and
  // pulled the balance straight back to the chain just left. Keyed on account
  // AND network: two accounts can sit on the same network id, so keying on the
  // network alone made a wallet switch look like "already synced".
  const syncedNetworkIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!networkId || allNetworks.length === 0) return;
    const syncKey = `${activeAccountId ?? ''}:${networkId}`;
    if (syncedNetworkIdRef.current === syncKey) return;
    const idx = allNetworks.findIndex((n) => n.id === networkId);
    if (idx < 0) return;
    syncedNetworkIdRef.current = syncKey;
    setActiveBlockchainIndex(idx);
  }, [networkId, allNetworks, activeAccountId]);

  const { usdTotal, nativeAmount, changePercent, changeAmount, hasData } = balance;
  const blockchainBalances = useMemo<BlockchainBalance[]>(
    () =>
      allNetworks.map((network) => {
        const info = { id: network.id, name: network.name, blockchain: blockchainIdOf(network.id) };
        if (network.id !== networkId) {
          return {
            network: info,
            usdTotal: undefined,
            nativeAmount: undefined,
            changePercent: undefined,
            changeAmount: undefined,
            loading: false,
          };
        }
        // A skeleton means "there is nothing to show", never "a request is in
        // flight". `hasData` is true for cached data too, so returning to a
        // chain visited earlier in the session paints its last-known balance
        // immediately.
        const showSkeleton = !hasData;
        return {
          network: info,
          usdTotal: showSkeleton ? undefined : usdTotal,
          // Off mainnet there is no USD figure at all, so this is what the
          // block prints as the total.
          nativeAmount: showSkeleton ? undefined : nativeAmount,
          changePercent: showSkeleton ? undefined : changePercent,
          changeAmount: showSkeleton ? undefined : changeAmount,
          loading: showSkeleton,
        };
      }),
    [allNetworks, networkId, usdTotal, nativeAmount, changePercent, changeAmount, hasData]
  );

  // The network the screen stands on, and its chain family. `blockchain` is
  // the id minus `-mainnet`, so it reads `solana-devnet` off mainnet and an
  // equality test against `'bitcoin'` silently missed `bitcoin-testnet`.
  const currentNetworkId =
    blockchainBalances[activeBlockchainIndex]?.network.id ?? networkId ?? 'solana-mainnet';
  const currentChain = getBlockchainFromNetworkId(currentNetworkId);

  // On Bitcoin the NFTs tab is not offered at all — it sinks out of the row —
  // and a session sitting on it falls back to Portfolio (spec 026, ruling 3).
  // The stored arrangement is untouched, so the tab returns to its own place
  // when the block comes back to Solana.
  const nftsOffered = currentChain === 'solana';
  const effectiveSubTab: HomeSubTabKey =
    activeSubTab === 'nfts' && !nftsOffered ? 'portfolio' : activeSubTab;

  const { order: subTabOrder, setOrder: setSubTabOrder } = useHomeTabOrder(HOME_TAB_KEYS);
  const subTabs = useMemo(() => {
    const labels: Record<string, string> = {
      portfolio: t('tabs.portfolio', 'Portfolio'),
      nfts: t('tabs.nfts', 'NFTs'),
    };
    return subTabOrder.flatMap((key) => {
      if (key === 'nfts' && !nftsOffered) return [];
      const label = labels[key];
      return label ? [{ key: key as HomeSubTabKey, label }] : [];
    });
  }, [subTabOrder, nftsOffered, t]);
  const subTabsKey = subTabs.map((tab) => tab.key).join('|');

  // The row plays the verb whenever the SET of tabs changes — a reorder, NFTs
  // leaving on Bitcoin, floating back on Solana — never on a switch within the
  // same set, so the underline keeps sliding. First mount owes no verb, and a
  // surfacing silences the row like it silences the content wrappers.
  // Render-time setState: refs cannot be read during render.
  const [tabsSwap, setTabsSwap] = useState({
    key: subTabsKey,
    surface: surfaceKey,
    hasPrior: false,
  });
  if (tabsSwap.surface !== surfaceKey) {
    setTabsSwap({ key: subTabsKey, surface: surfaceKey, hasPrior: false });
  } else if (tabsSwap.key !== subTabsKey) {
    setTabsSwap({ key: subTabsKey, surface: surfaceKey, hasPrior: true });
  }

  // Three causes can swap the content and they must never speak at once: a
  // task taking or releasing the screen owns the screen wrapper, a sub-tab
  // change owns the content region, a chain change owns the chain wrapper
  // inside it. The cause of the current swap is recorded and only the wrapper
  // that owns it animates. A SURFACING is not a swap: Home is never unmounted
  // while the wait is up, so the last gesture is still recorded when the
  // water clears — the surfacing wins, the cause goes back to 'none', and only
  // the screen wrapper speaks, with no beat.
  const [contentSwap, setContentSwap] = useState<{
    chain: string;
    subTab: HomeSubTabKey;
    engaged: boolean;
    surface: number;
    cause: HomeSwapCause;
  }>({
    chain: currentNetworkId,
    subTab: effectiveSubTab,
    engaged: isTaskEngaged,
    surface: surfaceKey,
    cause: 'none',
  });
  if (contentSwap.surface !== surfaceKey) {
    setContentSwap({
      chain: currentNetworkId,
      subTab: effectiveSubTab,
      engaged: isTaskEngaged,
      surface: surfaceKey,
      cause: 'none',
    });
  } else if (
    contentSwap.chain !== currentNetworkId ||
    contentSwap.subTab !== effectiveSubTab ||
    contentSwap.engaged !== isTaskEngaged
  ) {
    setContentSwap({
      chain: currentNetworkId,
      subTab: effectiveSubTab,
      engaged: isTaskEngaged,
      surface: surfaceKey,
      // Leaving Solana can change the chain AND drop NFTs in the same render.
      // The sub-tab wins: the content region is the one wrapper that speaks.
      cause:
        contentSwap.engaged !== isTaskEngaged
          ? 'task'
          : contentSwap.subTab !== effectiveSubTab
            ? 'subtab'
            : 'chain',
    });
  }

  const selectBlockchain = useCallback(
    (index: number): boolean => {
      const selected = blockchainBalances[index];
      if (!selected) return false;
      const nextNetworkId = selected.network.id;
      if (!networksAccounts?.[nextNetworkId]) return false;
      setActiveBlockchainIndex(index);
      void Promise.resolve(changeNetwork(nextNetworkId)).catch((error) =>
        console.warn('[home] changeNetwork failed:', error)
      );
      return true;
    },
    [blockchainBalances, networksAccounts, changeNetwork]
  );

  return {
    activeBlockchainIndex,
    blockchainBalances,
    currentNetworkId,
    currentChain,
    nftsOffered,
    activeSubTab,
    effectiveSubTab,
    setActiveSubTab,
    subTabOrder,
    setSubTabOrder,
    subTabs,
    subTabsKey,
    tabsHasPrior: tabsSwap.hasPrior,
    swapCause: contentSwap.cause,
    taskHasPrior: contentSwap.cause === 'task',
    subTabHasPrior: contentSwap.cause === 'subtab',
    chainHasPrior: contentSwap.cause === 'chain',
    selectBlockchain,
  };
}

/** A balance-list row as `useBalance` reports it, mapped to the `Token` the lists draw. */
export function mapBalanceToToken(item: {
  address: string;
  symbol: string;
  name: string;
  logo?: string;
  uiAmount: number;
  usdBalance?: number;
  price?: number;
  priceChange24h?: number;
  tags?: string[];
  coingeckoId?: string;
  decimals?: number;
}): Token & { decimals?: number } {
  const isVerified = item.tags?.includes('verified') ?? false;
  // The absolute USD change follows from the percentage and the current
  // balance: previous = current / (1 + pct/100).
  let absoluteChange: number | undefined;
  if (item.priceChange24h !== undefined && item.usdBalance !== undefined && item.usdBalance > 0) {
    absoluteChange = item.usdBalance - item.usdBalance / (1 + item.priceChange24h / 100);
  }
  return {
    address: item.address,
    symbol: item.symbol,
    name: item.name,
    logo: item.logo || undefined,
    price: item.price,
    uiAmount: item.uiAmount,
    usdBalance: item.usdBalance ?? null,
    last24HoursChange:
      item.priceChange24h !== undefined ? { perc: item.priceChange24h, abs: absoluteChange } : null,
    tags: item.tags,
    isVerified,
    coingeckoId: item.coingeckoId,
    decimals: item.decimals,
  };
}

/**
 * The Bitcoin column's token: the market from CoinGecko, the holding from the
 * same balance the header reads. `undefined` until the market has answered.
 */
export function buildBitcoinToken(
  coinInfo: CoinInfo | null | undefined,
  nativeAmount: number | undefined,
  usdTotal: number | undefined
): Token | undefined {
  const md = coinInfo?.marketData;
  if (!md) return undefined;
  return {
    address: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
    price: md.currentPrice,
    uiAmount: nativeAmount ?? 0,
    usdBalance: usdTotal ?? 0,
    last24HoursChange: md.priceChangePercentage24h
      ? { perc: md.priceChangePercentage24h, abs: md.priceChange24h }
      : null,
    isVerified: true,
  };
}
