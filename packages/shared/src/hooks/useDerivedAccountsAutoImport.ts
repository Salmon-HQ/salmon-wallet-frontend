/**
 * Derived accounts import themselves.
 *
 * A seed brought in from another wallet already owns every account its
 * derivation tree ever produced; the wallet only has to look. That used to be
 * an onboarding detour the user could decline ("Check derivables"), which
 * meant a recovered wallet could sit there missing most of its money until
 * someone found the screen again. There is no screen now: whenever the app is
 * unlocked and the active wallet is a mnemonic wallet nobody has scanned yet,
 * the BIP-44 gap scan runs on its own and imports everything it finds.
 *
 * Key material: none of this is new handling. The mnemonic is already in
 * memory on the unlocked account (`getAccountMnemonic`), the import is the
 * same `editAccount(id, { newDerivedAccounts })` the add-account panel makes,
 * and nothing here logs, persists or sends the phrase. The scan runs only
 * while unlocked and cancels on lock.
 *
 * @module hooks/useDerivedAccountsAutoImport
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAccountsContext } from '../contexts/AccountsContext';
import { useUserConfig } from './useUserConfig';
import { deriveBlockchainAccount } from '../factories/account-factory';
import { getAccountMnemonic } from '../utils/account-secret';
import {
  getMirrorNetworkId,
  getScanNetworks,
  scanDerivedAccounts,
} from '../utils/derived-accounts';
import type { Account, EditAccountParams } from '../types/account';
import type { BlockchainAccount } from '../types/blockchain';

// ============================================================================
// Types
// ============================================================================

/** What the wallets screen needs to know about the scan. */
export interface DerivedScanStatus {
  /** The wallet being scanned right now, or null when nothing is running. */
  scanningAccountId: string | null;
}

export interface UseDerivedAccountsAutoImportResult {
  status: DerivedScanStatus;
  /** Scans one wallet on demand — the "Find derived accounts" action. */
  rescan: (accountId: string) => Promise<void>;
}

/**
 * `useUserConfig` is shaped around the explorer preference and wants an active
 * account to pick one for. Nothing here reads an explorer, so a constant
 * standing account keeps the config load stable instead of re-running it every
 * time the user changes network.
 */
const CONFIG_ACCOUNT = {
  network: { environment: 'solana-mainnet' as const, blockchain: 'solana' },
};

// ============================================================================
// The scan
// ============================================================================

/**
 * Scans one wallet's derivation tree and imports everything it finds.
 *
 * @param account     - The wallet to scan; its mnemonic is read from memory.
 * @param editAccount - The accounts action that writes the found accounts in.
 * @param isCancelled - Checked throughout; true aborts without importing.
 * @returns `true` when the scan completed and may be recorded as done,
 *          `false` when it was cancelled or could not see every network — a
 *          partial result must never be marked as a finished scan.
 */
export async function importDerivedAccounts(
  account: Account,
  editAccount: (targetId: string, params: EditAccountParams) => Promise<void>,
  isCancelled: () => boolean
): Promise<boolean> {
  const mnemonic = getAccountMnemonic(account);
  // A watch-only or private-key wallet has no derivation tree. There is
  // nothing to look for and nothing to look again for, so it counts as done.
  if (!mnemonic) return true;

  const scanNetworks = await getScanNetworks();
  const networkIds = Object.keys(account.networksAccounts).filter((id) =>
    scanNetworks.includes(id)
  );

  const { accounts: found, failedNetworks } = await scanDerivedAccounts(
    mnemonic,
    networkIds,
    undefined,
    isCancelled
  );

  if (isCancelled()) return false;
  // A network the scan could not reach may be hiding funded accounts, so the
  // wallet is left unmarked and looks again next launch.
  if (failedNetworks.length > 0) return false;

  const newDerivedAccounts: BlockchainAccount[] = [];

  const isAlreadyHeld = (networkId: string, index: number): boolean =>
    !!account.networksAccounts[networkId]?.[index];

  for (const derived of found) {
    if (isCancelled()) return false;
    // Only funded paths are imported. The scan always reports index 1 so the
    // add-account panel can offer it as a fresh account to create by hand, but
    // an empty path is indistinguishable from an unused one, and importing it
    // would hand every recovered wallet a row that means nothing (owner,
    // 2026-09-02). The scan's own contract is untouched — the rule lives here.
    if (derived.balance <= 0) continue;
    if (!isAlreadyHeld(derived.networkId, derived.index)) {
      newDerivedAccounts.push(derived.account);
    }

    // The mirror network (devnet / testnet / sepolia) shares the keypair, so
    // an account found on mainnet exists there too — but only for a wallet
    // that actually holds that network.
    const mirrorNetworkId = await getMirrorNetworkId(derived.networkId);
    if (
      mirrorNetworkId &&
      account.networksAccounts[mirrorNetworkId] &&
      !isAlreadyHeld(mirrorNetworkId, derived.index)
    ) {
      try {
        newDerivedAccounts.push(
          await deriveBlockchainAccount(mnemonic, mirrorNetworkId, derived.index)
        );
      } catch {
        // The mirror is a convenience, not the find — skip it silently.
      }
    }
  }

  if (isCancelled()) return false;
  if (newDerivedAccounts.length > 0) {
    await editAccount(account.id, { newDerivedAccounts });
  }

  return true;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Runs {@link importDerivedAccounts} for the active wallet once, and exposes a
 * manual rescan for a seed that gains accounts later.
 *
 * One scan at a time: switching wallets mid-scan does not start a second one,
 * it just leaves the other wallet unmarked for the next mount.
 */
export function useDerivedAccountsAutoImport(): UseDerivedAccountsAutoImportResult {
  const [{ accounts, activeAccount, locked, ready }, accountActions] = useAccountsContext();
  const { derivedScannedAccountIds, markDerivedScanned, isLoading } = useUserConfig({
    activeBlockchainAccount: CONFIG_ACCOUNT,
  });

  const [scanningAccountId, setScanningAccountId] = useState<string | null>(null);
  const runningRef = useRef(false);
  const cancelledRef = useRef(false);
  // Wallets the automatic pass has already tried in this unlocked session. A
  // failed scan stays unmarked on purpose, and `activeAccount` is a new object
  // after every edit — without this the effect would re-fire the same failing
  // scan on every account change instead of waiting for the next unlock.
  const attemptedRef = useRef<Set<string>>(new Set());

  // The cancel token. Locking, and unmounting, abort a scan in flight — the
  // wallet stays unmarked and is scanned again the next time it is unlocked.
  useEffect(() => {
    if (locked) cancelledRef.current = true;
    else attemptedRef.current.clear();
  }, [locked]);
  useEffect(
    () => () => {
      cancelledRef.current = true;
    },
    []
  );

  const run = useCallback(
    async (account: Account): Promise<void> => {
      if (runningRef.current) return;
      runningRef.current = true;
      cancelledRef.current = false;
      setScanningAccountId(account.id);

      try {
        const completed = await importDerivedAccounts(
          account,
          accountActions.editAccount,
          () => cancelledRef.current
        );
        if (completed) await markDerivedScanned(account.id);
      } catch (error) {
        // Left unmarked on purpose: the next launch tries again. There is no
        // error surface on Home for this — Wallets shows the state.
        console.warn('Derived-account scan failed:', error);
      } finally {
        runningRef.current = false;
        setScanningAccountId(null);
      }
    },
    [accountActions.editAccount, markDerivedScanned]
  );

  useEffect(() => {
    if (!ready || locked || isLoading || !activeAccount) return;
    if (derivedScannedAccountIds.includes(activeAccount.id)) return;
    if (attemptedRef.current.has(activeAccount.id)) return;
    attemptedRef.current.add(activeAccount.id);
    void run(activeAccount);
  }, [ready, locked, isLoading, activeAccount, derivedScannedAccountIds, run]);

  const rescan = useCallback(
    async (accountId: string): Promise<void> => {
      const account = accounts.find(({ id }) => id === accountId);
      if (!account) return;
      await run(account);
    },
    [accounts, run]
  );

  return { status: { scanningAccountId }, rescan };
}
