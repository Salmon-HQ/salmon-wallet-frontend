/**
 * DerivedAccountsContext — the derived-account scan, mounted once.
 *
 * The scan itself is `packages/shared`'s: which wallet needs one, what counts
 * as a find and what an answer does are cross-platform decisions. This is the
 * mobile wiring — one instance for the whole `(app)` stack, beside
 * `TaskChromeProvider`, so the scan starts on the first unlocked mount and
 * survives every screen the stack pushes over it. Mounting it per screen would
 * start a second scan every time the user opened Wallets.
 *
 * It owns the sheet as well as the scan: Home renders `DerivedAccountsSheet`
 * from this state, and Wallets reads `scanningAccountId` for the skeleton and
 * calls `rescan` for the manual action.
 */
import React, { createContext, useContext } from 'react';
import { useDerivedAccountsScan, type UseDerivedAccountsScanResult } from '@salmon/shared';

const DerivedAccountsContext = createContext<UseDerivedAccountsScanResult>({
  scanningAccountId: null,
  sheetVisible: false,
  finds: [],
  rescan: async () => {},
  importFinds: async () => {},
  dismiss: async () => {},
});

export function DerivedAccountsProvider({ children }: { children: React.ReactNode }) {
  const value = useDerivedAccountsScan();
  return (
    <DerivedAccountsContext.Provider value={value}>{children}</DerivedAccountsContext.Provider>
  );
}

export function useDerivedAccounts(): UseDerivedAccountsScanResult {
  return useContext(DerivedAccountsContext);
}

export default DerivedAccountsContext;
