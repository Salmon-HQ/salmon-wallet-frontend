/**
 * useAccountAddFlow — the add-account flow's state machine, once.
 *
 * Both `AccountAddPanel` twins (mobile and the DOM) drive this: which step is
 * showing, the derived-account scan, the seed grid, the private-key and
 * watch-only imports, the name, the re-auth password when the vault key has
 * lapsed, and the two confirms. Each platform renders the steps and owns its
 * wait (mobile mounts a `LoadingScreen`; the DOM raises it on the settings
 * stack), which is why the write reports through callbacks rather than state.
 *
 * Security: signing material never lives here longer than the flow needs it.
 * The seed stays in `seedWords` until the panel unmounts (the platform covers
 * the screen); the private key stays inside `useImportPrivateKey` and is
 * dropped the moment the account is stored; the re-auth password is cleared
 * on back and after a successful write. Errors are i18n *keys* — the platform
 * translates at render — so this hook stays free of `react-i18next`.
 */

import { useCallback, useMemo, useRef, useState } from 'react';

import { useAccountsContext } from '../contexts/AccountsContext';
import { isVaultKeyCached, EncryptionMaterialMissingError } from '../crypto/encrypt-mnemonics';
import { normalizeMnemonic, validateMnemonic } from '../crypto/mnemonic';
import {
  createAccount,
  importAccountFromPrivateKey,
  importWatchOnlyAccount,
} from '../factories/account-factory';
import { trackEvent } from '../analytics/client';
import { getAccountMnemonic } from '../utils/account-secret';
import {
  getScanNetworks,
  getScanNetworksWithMirrors,
  scanDerivedAccounts,
  type DerivedAccountInfo,
} from '../utils/derived-accounts';
import { SHORT_PHRASE } from '../utils/seed-phrase';
import type { Account } from '../types';
import type { AccountAddStep } from '../types/ui/account-add';
import { useImportPrivateKey, type UseImportPrivateKeyResult } from './useImportPrivateKey';
import { useImportWatchOnly, type UseImportWatchOnlyResult } from './useImportWatchOnly';

/** The seed step's one error, as an i18n key. */
export type SeedErrorKey = 'wallet.create.invalidSeed' | '';

/** The re-auth step's errors, as i18n keys. */
export type ReauthErrorKey =
  'errors.password_required' | 'errors.password_check_failed' | 'errors.invalid_password' | '';

export interface UseAccountAddFlowOptions {
  /** The name a blank name field falls back to; the platform owns the counter and the copy. */
  defaultName: string;
  /** Leaving the first step. */
  onBack: () => void;
  /** The write is about to start: show the wait. */
  onWaitStart: () => void;
  /** The write failed: take the wait down. Not called on success — see `onPersisted`. */
  onWaitEnd: () => void;
  /**
   * The account is stored. The platform ends its wait and hands off however it
   * does — mobile parks the completion behind the wait's exit, the DOM lowers
   * the wait and closes settings under it.
   */
  onPersisted: () => void;
  /** The write failed for a reason other than a lapsed vault key. */
  onFailure: (error: unknown) => void;
}

export interface AccountAddFlow {
  step: AccountAddStep;
  /** Deriving needs a seed to derive from; an imported key or a watched address has none. */
  canDerive: boolean;

  derivedAccounts: DerivedAccountInfo[];
  /** Networks whose scan threw — an outage, not "no accounts". `['all']` when nothing answered. */
  failedNetworks: string[];
  scanning: boolean;
  selectedDerived: DerivedAccountInfo | null;

  seedWords: string[];
  /** What was actually pasted when a paste did not fit. `null` = no rejection. */
  pastedCount: number | null;
  seedError: SeedErrorKey;

  accountName: string;
  setAccountName: (name: string) => void;

  reauthPassword: string;
  /** Typing clears the error under the field. */
  setReauthPassword: (password: string) => void;
  reauthError: ReauthErrorKey;
  reauthChecking: boolean;

  privateKeyImport: UseImportPrivateKeyResult;
  watchOnlyImport: UseImportWatchOnlyResult;

  selectDerive: () => Promise<void>;
  selectImport: () => void;
  selectImportPrivateKey: () => void;
  selectImportWatchOnly: () => void;
  submitPrivateKey: () => Promise<void>;
  submitWatchOnly: () => void;
  toggleDerived: (account: DerivedAccountInfo) => void;
  continueDerived: () => void;
  setSeedWords: (next: string[]) => void;
  setSeedLength: (length: number) => void;
  setPastedCount: (count: number | null) => void;
  submitSeed: () => void;
  confirm: () => Promise<void>;
  confirmReauth: () => Promise<void>;
  stepBack: () => void;
}

export function useAccountAddFlow({
  defaultName,
  onBack,
  onWaitStart,
  onWaitEnd,
  onPersisted,
  onFailure,
}: UseAccountAddFlowOptions): AccountAddFlow {
  const [accountState, accountActions] = useAccountsContext();
  const { accounts, activeAccount } = accountState;

  const [step, setStep] = useState<AccountAddStep>('select-method');

  // Derive flow
  const [derivedAccounts, setDerivedAccounts] = useState<DerivedAccountInfo[]>([]);
  const [failedNetworks, setFailedNetworks] = useState<string[]>([]);
  const [selectedDerived, setSelectedDerived] = useState<DerivedAccountInfo | null>(null);
  const [scanning, setScanning] = useState(false);

  // Seed flow — one entry per grid box. Twelve to begin with; a paste or a
  // thirteenth typed word grows it to twenty-four.
  const [seedWords, setSeedWordsState] = useState<string[]>(() =>
    Array<string>(SHORT_PHRASE).fill('')
  );
  const [pastedCount, setPastedCount] = useState<number | null>(null);
  const [seedError, setSeedError] = useState<SeedErrorKey>('');
  const seedPhrase = useMemo(() => normalizeMnemonic(seedWords.join(' ')), [seedWords]);

  // Name
  const [accountName, setAccountName] = useState('');

  // Re-auth. The password lives here only between typing and the verified write.
  const [reauthPassword, setReauthPasswordState] = useState('');
  const [reauthError, setReauthError] = useState<ReauthErrorKey>('');
  const [reauthChecking, setReauthChecking] = useState(false);

  const privateKeyImport = useImportPrivateKey({ accounts });
  const watchOnlyImport = useImportWatchOnly({ accounts });

  /**
   * A write in flight. A ref, not state: the guard must see the value the
   * *previous* call set, not the one this render closed over, so a second
   * confirm that lands before the re-render still bounces. The button's own
   * `disabled` covers pointer taps; this covers Enter, a programmatic submit
   * and the frame before the attribute lands.
   */
  const busyRef = useRef(false);

  const canDerive = !!getAccountMnemonic(activeAccount);

  const selectDerive = useCallback(async () => {
    const mnemonic = getAccountMnemonic(activeAccount);
    if (!mnemonic) return;
    setStep('derive-scan');
    setScanning(true);
    setFailedNetworks([]);
    try {
      const networkIds = await getScanNetworks();
      const { accounts: scanned, failedNetworks: failed } = await scanDerivedAccounts(
        mnemonic,
        networkIds
      );
      setDerivedAccounts(scanned);
      setFailedNetworks(failed);
    } catch {
      // Total failure (network catalog unreachable) — the error state, not an
      // empty list.
      setDerivedAccounts([]);
      setFailedNetworks(['all']);
    } finally {
      setScanning(false);
    }
  }, [activeAccount]);

  const selectImport = useCallback(() => setStep('import-seed'), []);

  const selectImportPrivateKey = useCallback(() => {
    privateKeyImport.reset();
    setStep('import-private-key');
  }, [privateKeyImport]);

  const selectImportWatchOnly = useCallback(() => {
    watchOnlyImport.reset();
    setStep('import-watch-only');
  }, [watchOnlyImport]);

  const submitPrivateKey = useCallback(async () => {
    if (!(await privateKeyImport.validate())) return;
    setAccountName(defaultName);
    setStep('set-name');
  }, [privateKeyImport, defaultName]);

  const submitWatchOnly = useCallback(() => {
    if (!watchOnlyImport.validate()) return;
    setAccountName(defaultName);
    setStep('set-name');
  }, [watchOnlyImport, defaultName]);

  const toggleDerived = useCallback((account: DerivedAccountInfo) => {
    setSelectedDerived((prev) => (prev?.address === account.address ? null : account));
  }, []);

  const continueDerived = useCallback(() => {
    if (!selectedDerived) return;
    setAccountName(defaultName);
    setStep('set-name');
  }, [selectedDerived, defaultName]);

  const setSeedWords = useCallback((next: string[]) => {
    setSeedWordsState(next);
    setPastedCount(null);
    setSeedError('');
  }, []);

  const setSeedLength = useCallback((length: number) => {
    setSeedWordsState((prev) =>
      prev.length === length ? prev : Array.from({ length }, (_, i) => prev[i] ?? '')
    );
  }, []);

  const submitSeed = useCallback(() => {
    if (!validateMnemonic(seedPhrase)) {
      setSeedError('wallet.create.invalidSeed');
      return;
    }
    setSeedError('');
    setAccountName(defaultName);
    setStep('set-name');
  }, [seedPhrase, defaultName]);

  const setReauthPassword = useCallback((password: string) => {
    setReauthPasswordState(password);
    setReauthError('');
  }, []);

  /**
   * Builds the account the current flow describes. Cheap enough to run twice
   * (once per confirm attempt) and free of side effects, so the re-auth path
   * can rebuild rather than park key material in state.
   */
  const buildAccount = useCallback(async () => {
    const name = accountName.trim() || defaultName;
    // A private key owns one address and derives nothing, so it takes the
    // import factory instead of the mnemonic fan-out across networks.
    if (privateKeyImport.privateKey) {
      return importAccountFromPrivateKey({
        name,
        privateKey: privateKeyImport.privateKey,
        networkId: privateKeyImport.networkId,
      });
    }
    // A watched address derives nothing either, and has no key to import.
    if (watchOnlyImport.address) {
      return importWatchOnlyAccount({
        name,
        address: watchOnlyImport.address,
        networkId: watchOnlyImport.networkId,
      });
    }
    return createAccount({
      name,
      mnemonic: selectedDerived ? (getAccountMnemonic(activeAccount) ?? '') : seedPhrase,
      networkIds: await getScanNetworksWithMirrors(),
      startIndex: selectedDerived ? selectedDerived.index : 0,
      // A derived account is a wallet of its own that happens to share this
      // wallet's seed; recording which one lets Wallets draw the descent
      // (spec 025). An imported phrase descends from nothing.
      ...(selectedDerived && activeAccount ? { derivedFrom: activeAccount.id } : {}),
    });
  }, [
    accountName,
    defaultName,
    privateKeyImport,
    watchOnlyImport,
    selectedDerived,
    activeAccount,
    seedPhrase,
  ]);

  /**
   * Stores a freshly built account. Split out of `confirm` because the
   * re-auth retry needs exactly this half: the account is already built, only
   * the encrypted write is missing.
   */
  const persistAccount = useCallback(
    async (account: Account, password?: string) => {
      await accountActions.addAccount(account, password);
      // Anonymous funnel event: a derived account reuses the active seed
      // (create); an imported seed or private key is a recovery. No seed,
      // address or key material leaves here — just which flow completed.
      trackEvent(selectedDerived ? 'wallet_created' : 'wallet_recovered');
      // The key has done its job; drop it rather than leave it resident until
      // the panel happens to unmount.
      privateKeyImport.reset();
      watchOnlyImport.reset();
      onPersisted();
    },
    [accountActions, selectedDerived, privateKeyImport, watchOnlyImport, onPersisted]
  );

  const confirm = useCallback(async () => {
    if (busyRef.current) return;

    // Asked before the work, not after it fails: the vault key expires on
    // inactivity, and finding out at the write means showing a wait, then a
    // dead end, for something that was knowable up front.
    if (!(await isVaultKeyCached())) {
      setStep('reauth');
      return;
    }

    busyRef.current = true;
    onWaitStart();
    try {
      const { account } = await buildAccount();
      await persistAccount(account);
    } catch (err) {
      onWaitEnd();
      // The cache can still lapse between the check and the write.
      if (err instanceof EncryptionMaterialMissingError) {
        setStep('reauth');
        return;
      }
      onFailure(err);
    } finally {
      busyRef.current = false;
    }
  }, [buildAccount, persistAccount, onWaitStart, onWaitEnd, onFailure]);

  /**
   * Completes the add with a password the user just supplied, after the vault
   * key had expired. Verifies it first: re-encrypting the vault under an
   * unverified password would lock the user out of every account they own.
   */
  const confirmReauth = useCallback(async () => {
    if (busyRef.current) return;
    if (!reauthPassword) {
      setReauthError('errors.password_required');
      return;
    }

    setReauthChecking(true);
    let valid = false;
    try {
      valid = await accountActions.checkPassword(reauthPassword);
    } catch {
      setReauthChecking(false);
      setReauthError('errors.password_check_failed');
      return;
    }
    setReauthChecking(false);

    if (!valid) {
      setReauthError('errors.invalid_password');
      return;
    }

    setReauthError('');
    busyRef.current = true;
    onWaitStart();
    try {
      const { account } = await buildAccount();
      await persistAccount(account, reauthPassword);
      setReauthPasswordState('');
    } catch (err) {
      onWaitEnd();
      onFailure(err);
    } finally {
      busyRef.current = false;
    }
  }, [
    reauthPassword,
    accountActions,
    buildAccount,
    persistAccount,
    onWaitStart,
    onWaitEnd,
    onFailure,
  ]);

  const stepBack = useCallback(() => {
    if (step === 'reauth') {
      setReauthPasswordState('');
      setReauthError('');
      setStep('set-name');
      return;
    }
    if (step === 'set-name') {
      if (selectedDerived) setStep('derive-scan');
      else if (privateKeyImport.privateKey) setStep('import-private-key');
      else if (watchOnlyImport.address) setStep('import-watch-only');
      else setStep('import-seed');
    } else if (
      step === 'derive-scan' ||
      step === 'import-seed' ||
      step === 'import-private-key' ||
      step === 'import-watch-only'
    ) {
      if (step === 'import-private-key') privateKeyImport.reset();
      if (step === 'import-watch-only') watchOnlyImport.reset();
      setStep('select-method');
    } else {
      onBack();
    }
  }, [step, selectedDerived, privateKeyImport, watchOnlyImport, onBack]);

  return {
    step,
    canDerive,
    derivedAccounts,
    failedNetworks,
    scanning,
    selectedDerived,
    seedWords,
    pastedCount,
    seedError,
    accountName,
    setAccountName,
    reauthPassword,
    setReauthPassword,
    reauthError,
    reauthChecking,
    privateKeyImport,
    watchOnlyImport,
    selectDerive,
    selectImport,
    selectImportPrivateKey,
    selectImportWatchOnly,
    submitPrivateKey,
    submitWatchOnly,
    toggleDerived,
    continueDerived,
    setSeedWords,
    setSeedLength,
    setPastedCount,
    submitSeed,
    confirm,
    confirmReauth,
    stepBack,
  };
}
