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
import { distributePhrase } from '../utils/seed-phrase';
import {
  createAccount,
  importAccountFromPrivateKey,
  importWatchOnlyAccount,
  importSeedVaultAccount,
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
import type {
  AccountAddStep,
  SeedVaultAccess,
  SeedVaultListedAccount,
} from '../types/ui/account-add';
import { getBlockchainFromNetworkId } from '../config/blockchains';
import { useImportPrivateKey, type UseImportPrivateKeyResult } from './useImportPrivateKey';
import { useImportWatchOnly, type UseImportWatchOnlyResult } from './useImportWatchOnly';

/** The seed step's one error, as an i18n key. */
export type SeedErrorKey = 'wallet.create.invalidSeed' | '';

/** The Seed Vault step's errors, as i18n keys. */
export type SeedVaultErrorKey =
  | 'wallet.seedVault.errors.cancelled'
  | 'wallet.seedVault.errors.unavailable'
  | 'wallet.seedVault.errors.failed'
  | '';

/** A Seed Vault account as the step shows it. */
export interface SeedVaultRow extends SeedVaultListedAccount {
  /** Already a Salmon wallet with this same access: shown, not offered. */
  added: boolean;
}

const SEED_VAULT_SHOWN_INDEXES = 5;

/** The account index in a Solana path (`…/44'/501'/3'…` → 3); Infinity when absent. */
function seedVaultAccountIndex(path: string): number {
  const match = /44'\/501'\/(\d+)'/.exec(path);
  return match ? Number(match[1]) : Infinity;
}

/**
 * The Seed Vault accounts worth offering. Seed Vault lists every path it
 * derived ahead of time (on the simulator, a hundred per path style); shown
 * are the seed's own wallet accounts first — those hold the user's funds —
 * then the first few of each path style, each marked when it is already a
 * Salmon wallet under the same access.
 * ponytail: fixed cap of SEED_VAULT_SHOWN_INDEXES; add "show more" if a user needs a deeper index.
 */
export function seedVaultRows(
  listed: SeedVaultListedAccount[],
  wallets: Account[]
): SeedVaultRow[] {
  return listed
    .filter(
      (a) => a.isUserWallet || seedVaultAccountIndex(a.derivationPath) < SEED_VAULT_SHOWN_INDEXES
    )
    .sort((a, b) => Number(b.isUserWallet) - Number(a.isUserWallet))
    .map((row) => ({
      ...row,
      added: wallets.some(
        ({ secret }) =>
          secret?.kind === 'seedVault' &&
          secret.address === row.address &&
          secret.authToken === row.authToken
      ),
    }));
}

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
  /** Seed Vault, where the device has one (Android Seeker); absent elsewhere. */
  seedVault?: SeedVaultAccess;
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
  /** The grid holds a phrase that checks out: the only time Continue is offered. */
  seedValid: boolean;
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

  /** Whether this device offers "Use Seed Vault". */
  canUseSeedVault: boolean;
  seedVaultAccounts: SeedVaultRow[];
  seedVaultLoading: boolean;
  seedVaultError: SeedVaultErrorKey;
  selectedSeedVault: SeedVaultRow | null;
  selectSeedVault: () => Promise<void>;
  /** Authorize another seed, or create/import one in Seed Vault, then list again. */
  seedVaultAction: (action: 'authorizeAnother' | 'createSeed' | 'importSeed') => Promise<void>;
  toggleSeedVault: (row: SeedVaultRow) => void;
  continueSeedVault: () => void;

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
  /**
   * Fills the grid from pasted text through the same distribution the grid's
   * own paste uses, so the button and an in-box paste cannot differ. The
   * platform reads the clipboard; this is what it does with the text.
   */
  pasteSeed: (text: string) => void;
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
  seedVault,
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
  const [seedErrorState, setSeedError] = useState<SeedErrorKey>('');
  const seedPhrase = useMemo(() => normalizeMnemonic(seedWords.join(' ')), [seedWords]);
  const seedValid = useMemo(() => validateMnemonic(seedPhrase), [seedPhrase]);
  // A full grid that does not check out says so on its own — the user is not
  // offered a Continue to find out with (the recover screen's rule).
  const seedComplete = seedWords.every((word) => word.length > 0);
  const seedError: SeedErrorKey =
    seedErrorState || (seedComplete && !seedValid ? 'wallet.create.invalidSeed' : '');

  // Name
  const [accountName, setAccountName] = useState('');

  // Re-auth. The password lives here only between typing and the verified write.
  const [reauthPassword, setReauthPasswordState] = useState('');
  const [reauthError, setReauthError] = useState<ReauthErrorKey>('');
  const [reauthChecking, setReauthChecking] = useState(false);

  // Seed Vault. Rows are recomputed against the wallets, so one added in this
  // flow shows as added when the step is shown again.
  const [seedVaultListed, setSeedVaultListed] = useState<SeedVaultListedAccount[]>([]);
  const [seedVaultLoading, setSeedVaultLoading] = useState(false);
  const [seedVaultError, setSeedVaultError] = useState<SeedVaultErrorKey>('');
  const [selectedSeedVault, setSelectedSeedVault] = useState<SeedVaultRow | null>(null);
  const seedVaultAccounts = useMemo(
    () => seedVaultRows(seedVaultListed, accounts),
    [seedVaultListed, accounts]
  );

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

  const loadSeedVault = useCallback(
    async (before?: () => Promise<void>) => {
      if (!seedVault) return;
      setSeedVaultLoading(true);
      setSeedVaultError('');
      try {
        await before?.();
        setSeedVaultListed(await seedVault.listAccounts());
      } catch (err) {
        const reason = (err as { reason?: string } | null)?.reason;
        setSeedVaultError(
          reason === 'cancelled' || reason === 'unavailable'
            ? `wallet.seedVault.errors.${reason}`
            : 'wallet.seedVault.errors.failed'
        );
      } finally {
        setSeedVaultLoading(false);
      }
    },
    [seedVault]
  );

  const selectSeedVault = useCallback(async () => {
    setSelectedSeedVault(null);
    setStep('import-seed-vault');
    await loadSeedVault();
  }, [loadSeedVault]);

  const seedVaultAction = useCallback(
    (action: 'authorizeAnother' | 'createSeed' | 'importSeed') =>
      loadSeedVault(() => seedVault![action]()),
    [loadSeedVault, seedVault]
  );

  const toggleSeedVault = useCallback((row: SeedVaultRow) => {
    if (row.added) return;
    setSelectedSeedVault((prev) =>
      prev?.address === row.address && prev.authToken === row.authToken ? null : row
    );
  }, []);

  const continueSeedVault = useCallback(() => {
    if (!selectedSeedVault) return;
    setAccountName(selectedSeedVault.isUserWallet ? selectedSeedVault.name : defaultName);
    setStep('set-name');
  }, [selectedSeedVault, defaultName]);

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

  const pasteSeed = useCallback((text: string) => {
    if (!text) return;
    const { words, fits, count } = distributePhrase(text);
    setSeedWordsState(words);
    setPastedCount(fits ? null : count);
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
    // A Seed Vault account is one address whose key stays in Seed Vault. It
    // lands on the selected network when that is Solana (Seed Vault holds
    // Solana keys only), so a devnet session adds a devnet wallet.
    if (selectedSeedVault) {
      const current = accountActions.getNetworkId();
      return importSeedVaultAccount({
        name,
        authToken: selectedSeedVault.authToken,
        derivationPath: selectedSeedVault.derivationPath,
        address: selectedSeedVault.address,
        networkId:
          current && getBlockchainFromNetworkId(current) === 'solana' ? current : 'solana-mainnet',
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
    selectedSeedVault,
    accountActions,
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
      // The same Seed Vault account under an access the user re-granted after
      // revoking it: the wallet is replaced, not duplicated.
      const stale = selectedSeedVault
        ? accounts.find(
            ({ secret }) =>
              secret?.kind === 'seedVault' && secret.address === selectedSeedVault.address
          )
        : undefined;
      if (stale) await accountActions.removeAccount(stale.id, password);
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
    [
      accountActions,
      accounts,
      selectedSeedVault,
      selectedDerived,
      privateKeyImport,
      watchOnlyImport,
      onPersisted,
    ]
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
      else if (selectedSeedVault) setStep('import-seed-vault');
      else if (privateKeyImport.privateKey) setStep('import-private-key');
      else if (watchOnlyImport.address) setStep('import-watch-only');
      else setStep('import-seed');
    } else if (
      step === 'derive-scan' ||
      step === 'import-seed' ||
      step === 'import-private-key' ||
      step === 'import-watch-only' ||
      step === 'import-seed-vault'
    ) {
      if (step === 'import-seed-vault') setSelectedSeedVault(null);
      if (step === 'import-private-key') privateKeyImport.reset();
      if (step === 'import-watch-only') watchOnlyImport.reset();
      setStep('select-method');
    } else {
      onBack();
    }
  }, [step, selectedDerived, selectedSeedVault, privateKeyImport, watchOnlyImport, onBack]);

  return {
    step,
    canDerive,
    derivedAccounts,
    failedNetworks,
    scanning,
    selectedDerived,
    seedWords,
    seedValid,
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
    canUseSeedVault: !!seedVault,
    seedVaultAccounts,
    seedVaultLoading,
    seedVaultError,
    selectedSeedVault,
    selectSeedVault,
    seedVaultAction,
    toggleSeedVault,
    continueSeedVault,
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
    pasteSeed,
    submitSeed,
    confirm,
    confirmReauth,
    stepBack,
  };
}
