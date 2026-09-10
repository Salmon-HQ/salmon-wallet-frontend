/**
 * useExplorerLink — the computed state behind `ExplorerLinkButton`, without
 * the platform-specific "open a URL" call.
 *
 * Opening a link is platform territory (`window.open` on the DOM,
 * `Linking.openURL` on native), so this hook does not open anything — it
 * owns the explorer catalogue lookup, which one is selected, whether a
 * picker is warranted, and the menu's own visibility. Each twin calls
 * `getExplorerUrl(explorer)` and opens the result itself.
 *
 * @module hooks/useExplorerLink
 */

import { useCallback, useMemo, useState } from 'react';
import {
  getAvailableExplorers,
  getDefaultExplorer,
  getTransactionUrl,
  type Blockchain,
  type ExplorerWithKey,
  type NetworkEnvironment,
} from '../config/explorers';

/** The subset of `useTranslation()`'s `t` this hook needs. */
export type ExplorerLinkTranslate = (key: string, options?: Record<string, unknown>) => string;

export interface UseExplorerLinkParams {
  txHash: string;
  blockchain?: Blockchain;
  environment?: NetworkEnvironment;
  /** Which explorer to use when there is no picker. */
  explorerKey?: string;
  /** Whether a choice among several explorers is offered. */
  showMenu?: boolean;
  /** `useTranslation()`'s `t`, for the button's own label. */
  t: ExplorerLinkTranslate;
}

export interface UseExplorerLinkResult {
  /** Whether the picker sheet is open. */
  menuVisible: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  availableExplorers: ExplorerWithKey[];
  selectedExplorer: ExplorerWithKey | undefined;
  /** True only when there is a real choice to offer. */
  hasMenu: boolean;
  /** The transaction's URL on the given explorer, or `null` if none applies. */
  getExplorerUrl: (explorer: ExplorerWithKey) => string | null;
  /** `null` when there is nothing to show — the caller renders nothing. */
  buttonText: string | null;
  /**
   * The button's own press: opens the picker when there is a choice,
   * otherwise hands the selected explorer to the caller's platform opener
   * (`window.open` on the DOM, `Linking.openURL` on native).
   */
  resolvePress: (openExplorer: (explorer: ExplorerWithKey) => void) => void;
}

export function useExplorerLink({
  txHash,
  blockchain = 'SOLANA',
  environment = 'solana-mainnet',
  explorerKey,
  showMenu = false,
  t,
}: UseExplorerLinkParams): UseExplorerLinkResult {
  const [menuVisible, setMenuVisible] = useState(false);

  const availableExplorers = useMemo(
    () => getAvailableExplorers(blockchain, environment),
    [blockchain, environment]
  );

  const selectedExplorerKey = explorerKey || getDefaultExplorer(blockchain);
  const selectedExplorer = useMemo(
    () => availableExplorers.find((e) => e.key === selectedExplorerKey),
    [availableExplorers, selectedExplorerKey]
  );

  const hasMenu = showMenu && availableExplorers.length > 1;

  const getExplorerUrl = useCallback(
    (explorer: ExplorerWithKey) => getTransactionUrl(blockchain, environment, explorer.key, txHash),
    [blockchain, environment, txHash]
  );

  const openMenu = useCallback(() => setMenuVisible(true), []);
  const closeMenu = useCallback(() => setMenuVisible(false), []);

  const buttonText = !selectedExplorer
    ? null
    : hasMenu
      ? t('transactions.detail.viewOnExplorer')
      : t('transactions.detail.viewOn', { name: selectedExplorer.name });

  const resolvePress = useCallback(
    (openExplorer: (explorer: ExplorerWithKey) => void) => {
      if (hasMenu) openMenu();
      else if (selectedExplorer) openExplorer(selectedExplorer);
    },
    [hasMenu, selectedExplorer, openMenu]
  );

  return {
    menuVisible,
    openMenu,
    closeMenu,
    availableExplorers,
    selectedExplorer,
    hasMenu,
    getExplorerUrl,
    buttonText,
    resolvePress,
  };
}
