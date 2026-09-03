/**
 * The derived-account scan, and the question it leads to.
 *
 * A seed brought in from another wallet already owns every account its
 * derivation tree ever produced, and the money on those paths is invisible
 * until somebody looks. So the wallet looks, once, on the first unlocked Home
 * after a mnemonic wallet arrives — and then it *asks*. A derived path is a
 * wallet of its own here (its own card, name, avatar, "include in total"),
 * exactly what "add account → derive" already creates and what every other
 * wallet in this category does, so nothing is added behind the user's back
 * (spec 025, owner 2026-09-02).
 *
 * Key material: none of this is new handling. The mnemonic is already in
 * memory on the unlocked account (`getAccountMnemonic`), the import is the
 * same `createAccount` + `addAccount` pair the add-account panel makes, and
 * nothing here logs, persists or sends the phrase. The scan runs only while
 * unlocked and cancels on lock.
 *
 * @module hooks/useDerivedAccountsScan
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import i18n from 'i18next';

import { useAccountsContext } from '../contexts/AccountsContext';
import { useUserConfig } from './useUserConfig';
import { createAccount } from '../factories/account-factory';
import { getAccountMnemonic } from '../utils/account-secret';
import {
  getScanNetworks,
  getScanNetworksWithMirrors,
  scanDerivedAccounts,
} from '../utils/derived-accounts';
import type { Account } from '../types/account';

// ============================================================================
// Types
// ============================================================================

/**
 * One path the scan found funded and nobody holds yet.
 *
 * The derivation index is carried because the import needs it; it is never
 * shown — a user reads wallets by name, not by position in a tree.
 */
export interface DerivedAccountFind {
  /** Derivation index the wallet would be created at. Never rendered. */
  index: number;
  /** Receive address on the network the find was made on. */
  address: string;
  /** Native balance already formatted for that network, e.g. "0.0500 SOL". */
  balanceFormatted: string;
}

export interface UseDerivedAccountsScanResult {
  /** The wallet being scanned right now, or null when nothing is running. */
  scanningAccountId: string | null;
  /** Whether the sheet asking about the finds should be on screen. */
  sheetVisible: boolean;
  /** The finds the sheet is asking about — empty after a rescan found nothing. */
  finds: DerivedAccountFind[];
  /** Scans one wallet on demand — the rescan action on a mnemonic card. */
  rescan: (accountId: string) => Promise<void>;
  /** Creates one wallet per chosen index, then closes and marks scanned. */
  importFinds: (indexes: number[]) => Promise<void>;
  /** "Not now" — closes and marks scanned, importing nothing. */
  dismiss: () => Promise<void>;
}

/** A find plus the wallet it descends from, queued for import. */
interface QueuedImport extends DerivedAccountFind {
  parentId: string;
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

/** Every receive address the user already holds, across every wallet. */
function heldAddresses(accounts: Account[]): Set<string> {
  const held = new Set<string>();
  for (const account of accounts) {
    for (const networkAccounts of Object.values(account.networksAccounts ?? {})) {
      for (const blockchainAccount of networkAccounts ?? []) {
        const address = blockchainAccount?.getReceiveAddress?.();
        if (address) held.add(address);
      }
    }
  }
  return held;
}

/**
 * Looks through one wallet's derivation tree for paths worth offering.
 *
 * A path is offered when it holds money and the user does not already hold it
 * as a wallet — a path imported through "add account → derive" must never be
 * offered a second time. One row per path, not per network: a wallet is
 * created across every scanned network at one index, so two funded chains on
 * the same path are one wallet, not two.
 *
 * @param account     - The wallet to scan; its mnemonic is read from memory.
 * @param accounts    - Every wallet the user holds, for the exclusion above.
 * @param isCancelled - Checked throughout; true aborts the scan.
 * @returns The finds, or `null` when the scan could not be trusted — cancelled
 *          or blind on a network — which must leave the wallet unmarked.
 */
export async function findDerivedAccounts(
  account: Account,
  accounts: Account[],
  isCancelled: () => boolean
): Promise<DerivedAccountFind[] | null> {
  const mnemonic = getAccountMnemonic(account);
  // A watch-only or private-key wallet has no derivation tree. There is
  // nothing to look for and nothing to look again for, so it counts as done.
  if (!mnemonic) return [];

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

  if (isCancelled()) return null;
  // A network the scan could not reach may be hiding funded paths, so the
  // wallet is left unmarked and looks again next launch.
  if (failedNetworks.length > 0) return null;

  const held = heldAddresses(accounts);
  // A path is already the user's if *any* of its addresses is: the wallet that
  // holds it holds the whole path, on every network it carries.
  const alreadyHeld = new Set(
    found.filter(({ address }) => held.has(address)).map(({ index }) => index)
  );

  const offered = new Map<number, DerivedAccountFind>();
  for (const { index, address, balance, balanceFormatted } of found) {
    // The scan always reports index 1 so the add-account panel can offer it as
    // a fresh account to create by hand; an empty path is indistinguishable
    // from an unused one and means nothing to a user (owner, 2026-09-02).
    if (balance <= 0) continue;
    if (alreadyHeld.has(index) || offered.has(index)) continue;
    offered.set(index, { index, address, balanceFormatted });
  }

  return [...offered.values()].sort((a, b) => a.index - b.index);
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Runs the scan for the active wallet once, holds the question it raises, and
 * imports the paths the user chose.
 *
 * One scan at a time: switching wallets mid-scan does not start a second one,
 * it just leaves the other wallet unmarked for the next mount. Imports run one
 * wallet per render pass on purpose — `addAccount` writes the whole account
 * list it can see, so a loop in one tick would persist only its last wallet.
 */
export function useDerivedAccountsScan(): UseDerivedAccountsScanResult {
  const [{ accounts, activeAccount, locked, ready }, accountActions] = useAccountsContext();
  const { derivedScannedAccountIds, markDerivedScanned, isLoading } = useUserConfig({
    activeBlockchainAccount: CONFIG_ACCOUNT,
  });

  const [scanningAccountId, setScanningAccountId] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ accountId: string; finds: DerivedAccountFind[] } | null>(null);
  const [queue, setQueue] = useState<QueuedImport[]>([]);

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

  /**
   * Scans one wallet.
   *
   * `askWhenEmpty` is the difference between the two triggers: the automatic
   * pass says nothing when it finds nothing, while a rescan the user asked for
   * owes them an answer either way.
   */
  const run = useCallback(
    async (account: Account, askWhenEmpty: boolean): Promise<void> => {
      if (runningRef.current) return;
      runningRef.current = true;
      cancelledRef.current = false;
      setScanningAccountId(account.id);

      try {
        const finds = await findDerivedAccounts(account, accounts, () => cancelledRef.current);
        if (finds === null) return;
        if (finds.length === 0 && !askWhenEmpty) {
          await markDerivedScanned(account.id);
          return;
        }
        setAsk({ accountId: account.id, finds });
      } catch (error) {
        // Left unmarked on purpose: the next launch tries again. There is no
        // error surface on Home for this — the user can ask again from Wallets.
        console.warn('Derived-account scan failed:', error);
      } finally {
        runningRef.current = false;
        setScanningAccountId(null);
      }
    },
    [accounts, markDerivedScanned]
  );

  useEffect(() => {
    if (!ready || locked || isLoading || !activeAccount) return;
    if (derivedScannedAccountIds.includes(activeAccount.id)) return;
    if (attemptedRef.current.has(activeAccount.id)) return;
    attemptedRef.current.add(activeAccount.id);
    void run(activeAccount, false);
  }, [ready, locked, isLoading, activeAccount, derivedScannedAccountIds, run]);

  const rescan = useCallback(
    async (accountId: string): Promise<void> => {
      const account = accounts.find(({ id }) => id === accountId);
      if (!account) return;
      await run(account, true);
    },
    [accounts, run]
  );

  /**
   * The answer to the question, whichever button gave it.
   *
   * Both buttons close the sheet and mark the wallet scanned: the wallet was
   * asked about, and it is never asked again on its own — only a rescan brings
   * the question back.
   */
  const answer = useCallback(
    async (indexes: number[]): Promise<void> => {
      if (!ask) return;
      const { accountId, finds } = ask;
      const chosen = finds.filter(({ index }) => indexes.includes(index));
      setAsk(null);
      await markDerivedScanned(accountId);
      if (chosen.length > 0) {
        setQueue(chosen.map((find) => ({ ...find, parentId: accountId })));
      }
    },
    [ask, markDerivedScanned]
  );

  const importFinds = useCallback((indexes: number[]) => answer(indexes), [answer]);
  const dismiss = useCallback(() => answer([]), [answer]);

  // One import, built from the wallet list as it stands right now. Kept in a
  // ref so the queue effect below depends on the queue alone: re-running it
  // because a render produced a new closure would import the same path twice.
  const importOneRef = useRef<(item: QueuedImport) => Promise<void>>(async () => {});
  importOneRef.current = async ({ parentId, index }: QueuedImport): Promise<void> => {
    const parent = accounts.find(({ id }) => id === parentId);
    const mnemonic = parent ? getAccountMnemonic(parent) : undefined;
    if (!parent || !mnemonic) return;

    const { account } = await createAccount({
      // The name a new account gets by hand today; the user renames it later.
      name: i18n.t('settings.account_add.default_name', { number: accounts.length + 1 }),
      mnemonic,
      networkIds: await getScanNetworksWithMirrors(),
      startIndex: index,
      derivedFrom: parent.id,
    });
    await accountActions.addAccount(account);
  };

  useEffect(() => {
    if (queue.length === 0) return;
    let dropped = false;
    void (async () => {
      try {
        await importOneRef.current(queue[0]);
      } catch (error) {
        // One path that could not be written does not cancel the rest, and the
        // phrase is not in the message — only that the write failed.
        console.warn('Derived-account import failed:', error);
      }
      if (!dropped) setQueue((pending) => pending.slice(1));
    })();
    return () => {
      dropped = true;
    };
  }, [queue]);

  const finds = useMemo(() => ask?.finds ?? [], [ask]);

  return {
    scanningAccountId,
    sheetVisible: ask !== null,
    finds,
    rescan,
    importFinds,
    dismiss,
  };
}
