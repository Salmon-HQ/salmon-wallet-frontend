/**
 * useWalletsScreen — the Wallets switcher's state, held once for both
 * platforms (`apps/mobile/app/(app)/wallets.tsx`,
 * `packages/ui/src/components/WalletsScreen/WalletsScreen.tsx`).
 *
 * Aggregated total, the "include in total" set, and the families
 * (`groupWalletFamilies`) the screen lists — a wallet and the wallets
 * derived from it. Each platform still owns its own navigation
 * (select/rename/add-wallet routing) and how it tells the user a toggle was
 * refused (`toggleInclude` returns `true` on refusal; mobile shows an Alert,
 * the DOM twin shows a `ConfirmDialog`).
 *
 * `useWalletCardDerived` is the per-card twin: the derived-path chips a
 * wallet holds on the network being read, and whether it is even eligible
 * for a rescan (a seed with no `derivedFrom`) — each platform still ANDs its
 * own `onRescan` availability on top.
 *
 * Readers: both Wallets screens.
 */
import { useCallback, useMemo } from 'react';

import { getAccountMnemonic } from '../utils/account-secret';
import { groupWalletFamilies, type WalletFamily } from '../utils/walletCards';
import type { Account, ActiveBlockchainAccount } from '../types/account';
import type { NetworkId } from '../types/blockchain';
import { useBalance } from './useBalance';
import { useUserConfig } from './useUserConfig';
import { sumIncludedTotals, useWalletTotals } from './useWalletTotals';

export interface UseWalletsScreenParams {
  accounts: Account[];
  /** Accepted loosely, as both platforms' account state carries it — narrowed internally. */
  networkId: string | null | undefined;
  /** Only its presence matters — it decides which environment `useUserConfig` reads. */
  activeBlockchainAccount: unknown;
  includeSpam: boolean;
}

export interface UseWalletsScreenResult {
  hiddenBalance: boolean;
  toggleHidden: () => void;
  totals: Record<string, number | undefined>;
  excludedFromTotal: string[];
  isIncluded: (walletId: string) => boolean;
  includedCount: number;
  families: WalletFamily<Account>[];
  aggregated: number;
  /**
   * Toggles a wallet's inclusion, unless it is the last included one — the
   * total can never be empty. Returns `true` when refused, so the caller
   * knows to show its own "keep one included" notice.
   */
  toggleInclude: (walletId: string) => boolean;
}

export function useWalletsScreen({
  accounts,
  networkId,
  activeBlockchainAccount,
  includeSpam,
}: UseWalletsScreenParams): UseWalletsScreenResult {
  const userConfigAccount = useMemo<ActiveBlockchainAccount>(
    () => ({
      network: {
        environment: (activeBlockchainAccount
          ? networkId || 'solana-mainnet'
          : 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: 'solana',
      },
    }),
    [activeBlockchainAccount, networkId]
  );
  const { excludedFromTotal, setIncludedInTotal } = useUserConfig({
    activeBlockchainAccount: userConfigAccount,
  });

  // The eye is the app's one balance-visibility preference, not a second one
  // for this screen: `useBalance` owns it and persists it. Skipped, so
  // mounting this screen costs no request — only the preference comes back.
  const { hiddenBalance, toggleHidden } = useBalance({
    account: activeBlockchainAccount as never,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
    skip: true,
  });

  const { totals } = useWalletTotals({
    accounts,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
    includeSpam,
  });

  const isIncluded = useCallback(
    (walletId: string) => !excludedFromTotal.includes(walletId),
    [excludedFromTotal]
  );

  const includedCount = accounts.filter((a) => isIncluded(a.id)).length;

  const families = useMemo(() => groupWalletFamilies(accounts), [accounts]);

  const aggregated = useMemo(
    () =>
      sumIncludedTotals(
        accounts.map((a) => a.id),
        excludedFromTotal,
        totals
      ),
    [accounts, excludedFromTotal, totals]
  );

  const toggleInclude = useCallback(
    (walletId: string): boolean => {
      const included = isIncluded(walletId);
      if (included && includedCount <= 1) return true;
      void setIncludedInTotal(walletId, !included);
      return false;
    },
    [includedCount, isIncluded, setIncludedInTotal]
  );

  return {
    hiddenBalance,
    toggleHidden,
    totals,
    excludedFromTotal,
    isIncluded,
    includedCount,
    families,
    aggregated,
    toggleInclude,
  };
}

export interface UseWalletCardDerivedParams {
  account: Account;
  networkId: NetworkId | undefined;
}

export interface WalletDerivedPath {
  index: number;
  address: string;
}

export interface UseWalletCardDerivedResult {
  /** In derivation order; empty when the wallet holds only its own path. */
  derived: WalletDerivedPath[];
  /**
   * Whether this wallet HAS a tree to rescan — a seed with no `derivedFrom`.
   * A derived wallet shares its parent's seed and would walk the same tree,
   * so only the parent is eligible. Callers still AND their own `onRescan`
   * availability on top of this.
   */
  canRescanEligible: boolean;
}

/** The derived-path chips one wallet card draws, and its rescan eligibility. */
export function useWalletCardDerived({
  account,
  networkId,
}: UseWalletCardDerivedParams): UseWalletCardDerivedResult {
  const derived = useMemo(() => {
    const list = networkId ? account.networksAccounts?.[networkId] : undefined;
    // Null slots are holes in the derivation tree, not accounts: a wallet
    // created at a derived path sits at that position with empty ones before it.
    const held = (list ?? []).flatMap((blockchainAccount, index) =>
      blockchainAccount ? [{ index, address: blockchainAccount.getReceiveAddress?.() ?? '' }] : []
    );
    return held.length < 2 ? [] : held;
  }, [account.networksAccounts, networkId]);

  const canRescanEligible = !!getAccountMnemonic(account) && !account.derivedFrom;

  return { derived, canRescanEligible };
}
