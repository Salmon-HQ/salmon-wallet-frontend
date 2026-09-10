/**
 * useExplorerLink — the whole of `ExplorerLinkButton`'s behavior, without the
 * platform-specific "open a URL" call.
 *
 * Opening a link is platform territory (`window.open` on the DOM,
 * `Linking.openURL` on native), so the caller passes `openUrl` in and this
 * hook does the rest: the explorer catalogue lookup, which one is selected,
 * whether a picker is warranted, the menu's own visibility, the button's
 * press routing, and the picker's rows — ready to spread onto `<ListRow>`,
 * with only the platform icon slots (`leading`/`trailing`) left to the twin.
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
  /** Opens a resolved URL — `window.open` on the DOM, `Linking.openURL` on native. */
  openUrl: (url: string) => void | Promise<void>;
  /** Reported once a row's URL has actually opened. */
  onPress?: (url: string, explorerName: string) => void;
}

/** One row of the picker sheet, ready to spread onto `<ListRow>`. */
export interface ExplorerLinkRow {
  key: string;
  testID: string;
  title: string;
  onPress: () => void;
}

export interface UseExplorerLinkResult {
  /** `null` when there is nothing to show — the caller renders nothing. */
  buttonText: string | null;
  /** True only when there is a real choice to offer. */
  hasMenu: boolean;
  /** The button's own press: opens the picker, or the selected explorer directly. */
  onPress: () => void;
  /** Whether the picker sheet is open. */
  menuVisible: boolean;
  closeMenu: () => void;
  /** The picker's rows, one per available explorer. */
  rows: ExplorerLinkRow[];
}

export function useExplorerLink({
  txHash,
  blockchain = 'SOLANA',
  environment = 'solana-mainnet',
  explorerKey,
  showMenu = false,
  t,
  openUrl,
  onPress: onExplorerOpened,
}: UseExplorerLinkParams): UseExplorerLinkResult {
  const [menuVisible, setMenuVisible] = useState(false);
  const closeMenu = useCallback(() => setMenuVisible(false), []);

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

  const buttonText = !selectedExplorer
    ? null
    : hasMenu
      ? t('transactions.detail.viewOnExplorer')
      : t('transactions.detail.viewOn', { name: selectedExplorer.name });

  const openExplorer = useCallback(
    async (explorer: ExplorerWithKey) => {
      const url = getTransactionUrl(blockchain, environment, explorer.key, txHash);
      if (url) {
        try {
          await openUrl(url);
          onExplorerOpened?.(url, explorer.name);
        } catch (error) {
          console.warn('Failed to open explorer URL:', error);
        }
      }
      setMenuVisible(false);
    },
    [blockchain, environment, txHash, openUrl, onExplorerOpened]
  );

  const handlePress = useCallback(() => {
    if (hasMenu) setMenuVisible(true);
    else if (selectedExplorer) openExplorer(selectedExplorer);
  }, [hasMenu, selectedExplorer, openExplorer]);

  const rows = useMemo(
    () =>
      availableExplorers.map((explorer) => ({
        key: explorer.key,
        testID: `tx-detail-explorer-${explorer.key}`,
        title: explorer.name,
        onPress: () => openExplorer(explorer),
      })),
    [availableExplorers, openExplorer]
  );

  return {
    buttonText,
    hasMenu,
    onPress: handlePress,
    menuVisible,
    closeMenu,
    rows,
  };
}
