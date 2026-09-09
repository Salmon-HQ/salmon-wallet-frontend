/**
 * "Check derivables" on the success screen: the scan the user asks for once
 * the wallet is recovered, answered over that screen.
 *
 * Nothing runs on its own here — the hook is mounted with the automatic pass
 * off, so the button is the only trigger and Home's silent pass still covers
 * a wallet that was never asked about. Both twins of the success screen
 * consume this; the sheet they mount reads `scanning` for the wait.
 */
import { useCallback } from 'react';

import { useAccountsContext } from '../contexts/AccountsContext';
import type { DerivedAccountsSheetPropsBase } from '../types/ui/derived-accounts-sheet';
import { useDerivedAccountsScan } from './useDerivedAccountsScan';

export interface UseCheckDerivablesResult {
  /** The user asked and the scan is running: the button waits with the sheet. */
  scanning: boolean;
  /** Runs the scan for the active wallet. A no-op without one. */
  check: () => void;
  /** Everything the sheet needs, ready to spread onto either twin. */
  sheet: Omit<DerivedAccountsSheetPropsBase, 'testID'>;
}

export function useCheckDerivables(): UseCheckDerivablesResult {
  const [{ activeAccount }] = useAccountsContext();
  const { rescanningAccountId, sheetVisible, finds, rescan, importFinds, dismiss } =
    useDerivedAccountsScan({ automatic: false });
  const scanning = rescanningAccountId !== null;

  const check = useCallback(() => {
    if (!activeAccount) return;
    void rescan(activeAccount.id);
  }, [activeAccount, rescan]);

  return {
    scanning,
    check,
    sheet: {
      visible: scanning || sheetVisible,
      scanning,
      finds,
      onImport: (indexes) => void importFinds(indexes),
      onDismiss: () => void dismiss(),
    },
  };
}
