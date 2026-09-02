/**
 * DerivedAccountsContext — the automatic derived-account scan, mounted once.
 *
 * The scan itself is `packages/shared`'s: which wallet needs one, what it
 * imports and when it counts as done are cross-platform decisions. This is the
 * mobile wiring — one instance for the whole `(app)` stack, beside
 * `TaskChromeProvider`, so the scan starts on the first unlocked mount and
 * survives every screen the stack pushes over it. Mounting it per screen would
 * start a second scan every time the user opened Wallets.
 *
 * Wallets reads `status` to draw the skeleton under the wallet being scanned,
 * and calls `rescan` for the manual "Find derived accounts" action.
 */
import React, { createContext, useContext } from 'react';
import {
  useDerivedAccountsAutoImport,
  type UseDerivedAccountsAutoImportResult,
} from '@salmon/shared';

const DerivedAccountsContext = createContext<UseDerivedAccountsAutoImportResult>({
  status: { scanningAccountId: null },
  rescan: async () => {},
});

export function DerivedAccountsProvider({ children }: { children: React.ReactNode }) {
  const value = useDerivedAccountsAutoImport();
  return (
    <DerivedAccountsContext.Provider value={value}>{children}</DerivedAccountsContext.Provider>
  );
}

export function useDerivedAccounts(): UseDerivedAccountsAutoImportResult {
  return useContext(DerivedAccountsContext);
}

export default DerivedAccountsContext;
