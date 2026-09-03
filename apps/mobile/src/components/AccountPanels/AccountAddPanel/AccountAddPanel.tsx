/**
 * AccountAddPanel - Multi-step account creation flow for mobile
 *
 * Steps:
 * 1. select-method: Choose between deriving or importing
 * 2. derive-scan: Scan for derived accounts using DerivedAccountCard
 * 3. import-seed: Enter seed phrase using SeedPhrase component
 * 4. set-name: Choose account name
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  CaretRightIcon,
  EyeIcon,
  FileTextIcon,
  KeyIcon,
  TreeStructureIcon,
  iconSize,
} from '../../../icons';
import { useTranslation } from 'react-i18next';

import {
  spacing,
  fontSize,
  fontFamilyNative,
  lineHeight,
  s,
  vs,
  useAccountsContext,
  scanDerivedAccounts,
  validateMnemonic,
  normalizeMnemonic,
  createAccount,
  importAccountFromPrivateKey,
  importWatchOnlyAccount,
  isVaultKeyCached,
  useImportPrivateKey,
  useImportWatchOnly,
  getAccountMnemonic,
  getShortAddress,
  getScanNetworks,
  getScanNetworksWithMirrors,
  NETWORK_DISPLAY,
  SHORT_PHRASE,
  EncryptionMaterialMissingError,
  trackEvent,
  type Account,
  type AccountAddStep,
  type DerivedAccountInfo,
  type Semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { PrimaryButton } from '../../Button';
import { Card } from '../../Card';
import { TextField } from '../../TextInput';
import { ConfirmSheet } from '../../ConfirmSheet';
import { IconBubble } from '../../IconBubble';
import { ListRow } from '../../ListRow';
import { SectionLabel } from '../../SectionLabel';
import { DerivedAccountCard } from '../../DerivedAccountCard';
import { LoadingScreen } from '../../LoadingScreen';
import { WarningNotice } from '../../WarningNotice';
import { SeedPhraseEntry } from '../../SeedPhrase';
import { PasswordInput } from '../../PasswordInput';
import { useSecretScreen } from '../../../../hooks/useSecretScreen';
import { useWaitPassage } from '../../../utils/useWaitPassage';
import { useSemantic, useThemedStyles } from '../../../theme/useThemedStyles';
import type { AccountAddPanelProps } from './types';

// ============================================================================
// Component
// ============================================================================

/** The leading well every settings row carries. */
const ROW_BUBBLE_SIZE = 40;

export function AccountAddPanel({ onComplete, onBack }: AccountAddPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { text, accent } = useSemantic();
  const [accountState, accountActions] = useAccountsContext();
  const { accounts, activeAccount } = accountState;

  // The imported seed lives in this panel's memory for its whole lifetime,
  // not just while the grid is mounted (`SeedWordInput` covers those frames).
  useSecretScreen('account-add-panel');

  // Step state
  const [step, setStep] = useState<AccountAddStep>('select-method');

  // Derive flow state
  const [derivedAccounts, setDerivedAccounts] = useState<DerivedAccountInfo[]>([]);
  // Networks whose scan threw — distinguishes an outage from "no accounts".
  const [failedNetworks, setFailedNetworks] = useState<string[]>([]);
  const [selectedDerived, setSelectedDerived] = useState<DerivedAccountInfo | null>(null);
  const [scanning, setScanning] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Creation-failure notice, surfaced as a sheet rather than an OS alert.
  // Title and body together: the failure is named in the heading rather than
  // filed under "unexpected", which is wrong for a cause the code detected on
  // purpose and leaves the user with nothing to act on.
  const [creationError, setCreationError] = useState<{ title: string; message: string } | null>(
    null
  );
  // Re-auth step state. The password lives here only for the moment between
  // typing and the verified write.
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [reauthChecking, setReauthChecking] = useState(false);

  // The wait's passage: the panel keeps the wait mounted until its closing
  // wave has left, and the completion handoff is parked behind that report —
  // completing earlier unmounts the wait mid-wave. LoadingScreen's watchdog
  // guarantees the report, so the handoff cannot be stranded.
  const { onExited: waitExited } = useWaitPassage(loading);
  const pendingCompleteRef = useRef(false);
  const handleWaitExited = useCallback(() => {
    waitExited();
    if (!pendingCompleteRef.current) return;
    pendingCompleteRef.current = false;
    onComplete();
  }, [waitExited, onComplete]);

  // Import flow state — one entry per grid box. Twelve to begin with; a paste
  // or a thirteenth typed word grows it to twenty-four.
  const [seedWords, setSeedWords] = useState<string[]>(() => Array<string>(SHORT_PHRASE).fill(''));
  // What was actually pasted when a paste did not fit. `null` = no rejection.
  const [pastedCount, setPastedCount] = useState<number | null>(null);
  const [seedError, setSeedError] = useState('');
  const seedPhrase = useMemo(() => normalizeMnemonic(seedWords.join(' ')), [seedWords]);

  // Name step state
  const defaultName = useMemo(
    () => t('settings.account_add.default_name', { number: accounts.length + 1 }),
    [accounts.length, t]
  );
  const [accountName, setAccountName] = useState('');

  // Private-key import state (shared with web via the same hook)
  const privateKeyImport = useImportPrivateKey({ accounts });
  // Watch-only import state (shared with web via the same hook)
  const watchOnlyImport = useImportWatchOnly({ accounts });

  // ========================================================================
  // Step handlers
  // ========================================================================

  // Deriving needs a seed phrase to derive from. An account imported from a
  // private key, or a watch-only one, has none — so the card is not offered
  // rather than offered and inert. This reads the same value the handler
  // guards on, so the two cannot drift apart.
  const canDerive = !!getAccountMnemonic(activeAccount);

  const handleSelectDerive = useCallback(async () => {
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
      // Total failure (network catalog unreachable) — mark the scan as failed
      // so the UI shows the error state instead of an empty list.
      setDerivedAccounts([]);
      setFailedNetworks(['all']);
    } finally {
      setScanning(false);
    }
  }, [activeAccount]);

  const handleSelectImport = useCallback(() => {
    setStep('import-seed');
  }, []);

  const handleSelectImportPrivateKey = useCallback(() => {
    privateKeyImport.reset();
    setStep('import-private-key');
  }, [privateKeyImport]);

  const handlePrivateKeySubmit = useCallback(async () => {
    if (!(await privateKeyImport.validate())) return;
    setAccountName(defaultName);
    setStep('set-name');
  }, [privateKeyImport, defaultName]);

  const handleSelectImportWatchOnly = useCallback(() => {
    watchOnlyImport.reset();
    setStep('import-watch-only');
  }, [watchOnlyImport]);

  const handleWatchOnlySubmit = useCallback(() => {
    if (!watchOnlyImport.validate()) return;
    setAccountName(defaultName);
    setStep('set-name');
  }, [watchOnlyImport, defaultName]);

  const handleDerivedSelect = useCallback((account: DerivedAccountInfo) => {
    setSelectedDerived((prev) => (prev?.address === account.address ? null : account));
  }, []);

  const handleDerivedContinue = useCallback(() => {
    if (!selectedDerived) return;
    setAccountName(defaultName);
    setStep('set-name');
  }, [selectedDerived, defaultName]);

  const handleSeedWords = useCallback((next: string[]) => {
    setSeedWords(next);
    setPastedCount(null);
    setSeedError('');
  }, []);

  const handleSeedLength = useCallback((length: number) => {
    setSeedWords((prev) =>
      prev.length === length ? prev : Array.from({ length }, (_, i) => prev[i] ?? '')
    );
  }, []);

  const handleSeedSubmit = useCallback(() => {
    if (!validateMnemonic(seedPhrase)) {
      setSeedError(t('wallet.create.invalidSeed'));
      return;
    }
    setSeedError('');
    setAccountName(defaultName);
    setStep('set-name');
  }, [seedPhrase, defaultName, t]);

  /**
   * Stores a freshly built account, reporting completion through the wait.
   *
   * Split out of `handleConfirm` because the re-auth retry needs exactly this
   * half: the account is already built, only the encrypted write is missing.
   */
  const persistAccount = useCallback(
    async (account: Account, password?: string) => {
      await accountActions.addAccount(account, password);
      // Anonymous funnel event: an account was added from inside the app. A
      // derived account reuses the active seed (create); an imported seed or
      // private key is a recovery. No seed, address or key material leaves
      // here — just which flow completed.
      trackEvent(selectedDerived ? 'wallet_created' : 'wallet_recovered');
      // The key has done its job; drop it from component state rather than
      // leaving it resident until the panel happens to unmount.
      privateKeyImport.reset();
      watchOnlyImport.reset();
      // Parked, not fired: dropping `loading` starts the wait's exit, and
      // `handleWaitExited` completes once the last wave has left the screen.
      pendingCompleteRef.current = true;
      setLoading(false);
    },
    [accountActions, selectedDerived, privateKeyImport, watchOnlyImport]
  );

  /**
   * Builds the account the current flow describes. Cheap enough to run twice
   * (once per confirm attempt) and free of side effects, so the re-auth path
   * can rebuild rather than park key material in component state.
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

  const reportFailure = useCallback(
    (err: unknown) => {
      console.error('Failed to add account:', err);
      setCreationError({
        title: t('general.error'),
        message: t('settings.account_add.creation_error'),
      });
    },
    [t]
  );

  const handleConfirm = useCallback(async () => {
    if (loading) return;

    // Asked before the work, not after it fails: the vault key expires on
    // inactivity, and finding out at the write means showing a wait, then a
    // dead end, for something that was knowable up front.
    if (!(await isVaultKeyCached())) {
      setStep('reauth');
      return;
    }

    setLoading(true);
    try {
      const { account } = await buildAccount();
      await persistAccount(account);
    } catch (err) {
      setLoading(false);
      // The cache can still lapse between the check and the write.
      if (err instanceof EncryptionMaterialMissingError) {
        setStep('reauth');
        return;
      }
      reportFailure(err);
    }
  }, [loading, buildAccount, persistAccount, reportFailure]);

  /**
   * Completes the add with a password the user just supplied, after the vault
   * key had expired. Verifies it first: re-encrypting the vault under an
   * unverified password would lock the user out of every account they own.
   */
  const handleReauthConfirm = useCallback(async () => {
    if (loading) return;
    if (!reauthPassword) {
      setReauthError(t('errors.password_required'));
      return;
    }

    setReauthChecking(true);
    let valid = false;
    try {
      valid = await accountActions.checkPassword(reauthPassword);
    } catch {
      setReauthChecking(false);
      setReauthError(t('errors.password_check_failed'));
      return;
    }
    setReauthChecking(false);

    if (!valid) {
      setReauthError(t('errors.invalid_password'));
      return;
    }

    setReauthError('');
    setLoading(true);
    try {
      const { account } = await buildAccount();
      await persistAccount(account, reauthPassword);
      setReauthPassword('');
    } catch (err) {
      setLoading(false);
      reportFailure(err);
    }
  }, [loading, reauthPassword, accountActions, buildAccount, persistAccount, reportFailure, t]);

  const handleStepBack = useCallback(() => {
    if (step === 'reauth') {
      setReauthPassword('');
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

  // ========================================================================
  // Render helpers
  // ========================================================================

  // Deriving is offered only when there is a phrase to derive from, so the
  // list is built per render rather than declared at module scope.
  const methods: {
    id: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    titleKey: string;
    descriptionKey: string;
    onPress: () => void;
  }[] = [
    ...(canDerive
      ? [
          {
            id: 'derive',
            icon: TreeStructureIcon,
            titleKey: 'settings.account_add.create_new',
            descriptionKey: 'settings.account_add.create_new_description',
            onPress: handleSelectDerive,
          },
        ]
      : []),
    {
      id: 'import',
      icon: FileTextIcon,
      titleKey: 'settings.account_add.import_seed',
      descriptionKey: 'settings.account_add.import_seed_description',
      onPress: handleSelectImport,
    },
    {
      id: 'private-key',
      icon: KeyIcon,
      titleKey: 'settings.account_add.import_private_key',
      descriptionKey: 'settings.account_add.import_private_key_description',
      onPress: handleSelectImportPrivateKey,
    },
    {
      id: 'watch-only',
      icon: EyeIcon,
      titleKey: 'settings.account_add.import_watch_only',
      descriptionKey: 'settings.account_add.import_watch_only_description',
      onPress: handleSelectImportWatchOnly,
    },
  ];

  const renderSelectMethod = () =>
    methods.map((method) => (
      <ListRow
        key={method.id}
        testID={`account-add-method-${method.id}`}
        leading={
          <IconBubble
            size={ROW_BUBBLE_SIZE}
            shape="rounded"
            tone="accent-tint"
            icon={method.icon}
            iconSize={iconSize.md}
          />
        }
        title={t(method.titleKey)}
        subtitle={t(method.descriptionKey)}
        onPress={method.onPress}
        trailing={<CaretRightIcon size={iconSize.sm} color={text.tertiary} />}
      />
    ));

  const renderDeriveScan = () => {
    if (scanning) {
      return (
        <View style={styles.scanState}>
          <ActivityIndicator size="large" color={accent.ink} />
          <Text style={styles.scanStateText}>{t('settings.account_add.scanning')}</Text>
        </View>
      );
    }

    if (derivedAccounts.length === 0 && failedNetworks.length > 0) {
      return (
        <View style={styles.stack} testID="derived-scan-error">
          <WarningNotice tone="error" title={t('wallet.derived.scan_failed_title')}>
            {t('wallet.derived.scan_failed_body')}
          </WarningNotice>
          <PrimaryButton onPress={handleSelectDerive} testID="derived-scan-retry-button">
            {t('transactions.tapToRetry')}
          </PrimaryButton>
        </View>
      );
    }

    return (
      <View style={styles.stack}>
        {failedNetworks.length > 0 && (
          <WarningNotice tone="warning" title={t('wallet.derived.scan_partial')} />
        )}
        {derivedAccounts.map((item: DerivedAccountInfo) => (
          <DerivedAccountCard
            key={`${item.networkId}-${item.address}`}
            address={item.address}
            networkName={item.networkName}
            path={item.path}
            balanceFormatted={item.balanceFormatted}
            selected={selectedDerived?.address === item.address}
            dimmed={item.balance === 0}
            onToggle={() => handleDerivedSelect(item)}
            blockchain={NETWORK_DISPLAY[item.networkId]?.blockchain}
          />
        ))}
        <PrimaryButton
          onPress={handleDerivedContinue}
          disabled={!selectedDerived}
          testID="account-add-derive-continue-button"
        >
          {t('actions.continue')}
        </PrimaryButton>
      </View>
    );
  };

  const renderImportSeed = () => (
    <View style={styles.stack}>
      <SectionLabel variant="caps">{t('settings.account_add.import_seed')}</SectionLabel>
      <SeedPhraseEntry
        testID="account-add-seed"
        words={seedWords}
        onChange={handleSeedWords}
        onLengthChange={handleSeedLength}
        onPasteRejected={setPastedCount}
      />
      {pastedCount !== null ? (
        <Text style={styles.errorText}>
          {t('wallet.recover.pastedWordCount', { count: pastedCount })}
        </Text>
      ) : seedError ? (
        <Text style={styles.errorText}>{seedError}</Text>
      ) : null}
      <PrimaryButton onPress={handleSeedSubmit} testID="account-add-seed-continue-button">
        {t('actions.continue')}
      </PrimaryButton>
    </View>
  );

  const renderImportPrivateKey = () => (
    <View style={styles.stack}>
      <WarningNotice tone="warning" title={t('wallet.import.warning_title')}>
        {t('wallet.import.warning_body')}
      </WarningNotice>
      <SectionLabel variant="caps">{t('wallet.import.label')}</SectionLabel>
      <PasswordInput
        testID="account-add-private-key-input"
        value={privateKeyImport.value}
        onChangeText={privateKeyImport.setValue}
        placeholder={t('wallet.import.placeholder')}
        error={privateKeyImport.error ? t(privateKeyImport.error) : undefined}
        onSubmitEditing={handlePrivateKeySubmit}
        autoFocus
      />
      {/* One slot under the field: the hint stands where the error will stand,
          so the layout does not shift when a message replaces it. */}
      {!privateKeyImport.error && <Text style={styles.hintText}>{t('wallet.import.help')}</Text>}
      {privateKeyImport.address && (
        <Card padding="md" gap={spacing.xxs} testID="account-add-private-key-address">
          <Text style={styles.hintText}>{t('wallet.import.resolved_address')}</Text>
          <Text style={styles.addressText}>{getShortAddress(privateKeyImport.address)}</Text>
        </Card>
      )}
      <PrimaryButton
        onPress={handlePrivateKeySubmit}
        disabled={!privateKeyImport.hasInput || privateKeyImport.validating}
        testID="account-add-private-key-continue-button"
      >
        {t('actions.continue')}
      </PrimaryButton>
    </View>
  );

  const renderImportWatchOnly = () => (
    <View style={styles.stack}>
      {/* No warning notice and no masked field: an address is public. The
          private-key step's PasswordInput would imply otherwise. */}
      <SectionLabel variant="caps">{t('wallet.watchOnly.label')}</SectionLabel>
      <TextField
        testID="account-add-watch-only-input"
        value={watchOnlyImport.value}
        onChangeText={watchOnlyImport.setValue}
        placeholder={t('wallet.watchOnly.placeholder')}
        accessibilityLabel={t('wallet.watchOnly.label')}
        autoFocus
        mono
        onSubmitEditing={handleWatchOnlySubmit}
      />
      {/* One slot under the field: the hint stands where the error will
          stand, so the layout does not shift when a message replaces it. */}
      <Text
        testID="account-add-watch-only-message"
        style={watchOnlyImport.error ? styles.errorText : styles.hintText}
      >
        {watchOnlyImport.error ? t(watchOnlyImport.error) : t('wallet.watchOnly.help')}
      </Text>
      {watchOnlyImport.address && (
        <Card padding="md" gap={spacing.xxs} testID="account-add-watch-only-address">
          <Text style={styles.hintText}>{t('wallet.watchOnly.resolved_address')}</Text>
          <Text style={styles.addressText}>{getShortAddress(watchOnlyImport.address)}</Text>
        </Card>
      )}
      <PrimaryButton
        onPress={handleWatchOnlySubmit}
        disabled={!watchOnlyImport.hasInput}
        testID="account-add-watch-only-continue-button"
      >
        {t('actions.continue')}
      </PrimaryButton>
    </View>
  );

  const renderReauth = () => (
    <View style={styles.stack}>
      <Text style={styles.bodyText}>{t('settings.account_add.reauth_body')}</Text>
      <SectionLabel variant="caps">{t('lock.password_label', 'Password')}</SectionLabel>
      <PasswordInput
        testID="account-add-reauth-password"
        value={reauthPassword}
        onChangeText={(value) => {
          setReauthPassword(value);
          if (reauthError) setReauthError('');
        }}
        placeholder={t('lock.password_placeholder')}
        error={reauthError || undefined}
        onSubmitEditing={handleReauthConfirm}
        autoFocus
      />
      <PrimaryButton
        onPress={handleReauthConfirm}
        disabled={!reauthPassword || reauthChecking}
        testID="account-add-reauth-confirm-button"
      >
        {t('settings.account_add.reauth_confirm')}
      </PrimaryButton>
    </View>
  );

  const renderSetName = () => (
    <View style={styles.stack}>
      <SectionLabel variant="caps">{t('settings.account_add.set_name')}</SectionLabel>
      <TextField
        testID="account-add-name-input"
        value={accountName}
        onChangeText={setAccountName}
        placeholder={t('settings.account_add.set_name_placeholder')}
        accessibilityLabel={t('settings.account_add.set_name')}
        autoFocus
        maxLength={32}
        onSubmitEditing={handleConfirm}
      />
      <PrimaryButton onPress={handleConfirm} testID="account-add-confirm-button">
        {t('settings.account_add.confirm')}
      </PrimaryButton>
    </View>
  );

  // ========================================================================
  // Main render
  // ========================================================================

  const stepTitles: Record<AccountAddStep, string> = {
    'select-method': t('settings.account_add.title'),
    'derive-scan': t('settings.account_add.create_new'),
    'import-seed': t('settings.account_add.import_seed'),
    'import-private-key': t('wallet.import.title'),
    'import-watch-only': t('wallet.watchOnly.title'),
    'set-name': t('settings.account_add.set_name'),
    reauth: t('settings.account_add.reauth_title'),
    complete: t('settings.account_add.title'),
  };
  const currentTitle = stepTitles[step];

  const stepSubtitles: Record<AccountAddStep, string> = {
    'select-method': t(
      'settings.account_add.select_method_subtitle',
      'Choose how you want to add this account.'
    ),
    'derive-scan': t(
      'settings.account_add.create_new_description',
      'Derive a new account from your existing seed phrase'
    ),
    'import-seed': t(
      'settings.account_add.import_seed_description',
      'Import an account using a different seed phrase'
    ),
    'import-private-key': t(
      'settings.account_add.import_private_key_description',
      'Add a wallet you already own using its private key'
    ),
    'import-watch-only': t(
      'settings.account_add.watch_only_subtitle',
      "Follow a wallet's address without moving its funds"
    ),
    'set-name': t(
      'settings.account_add.set_name_subtitle',
      "Give this account a name you'll recognize"
    ),
    reauth: t('settings.account_add.reauth_subtitle', 'Enter your password to keep going.'),
    complete: t('settings.account_add.title'),
  };
  const currentSubtitle = stepSubtitles[step];

  return (
    <>
      <LoadingScreen
        visible={loading}
        // Its own window: rendered inline it sits under the gate's header, so
        // the chevron and close button stayed tappable over a flow in flight.
        fullScreen
        title={
          selectedDerived
            ? t('settings.account_add.confirm_create')
            : t('settings.account_add.confirm_import')
        }
        subtitle={t('general.loading')}
        onExited={handleWaitExited}
      />
      <SettingsScreenLayout title={currentTitle} subtitle={currentSubtitle} onBack={handleStepBack}>
        {step === 'select-method' && renderSelectMethod()}
        {step === 'derive-scan' && renderDeriveScan()}
        {step === 'import-seed' && renderImportSeed()}
        {step === 'import-private-key' && renderImportPrivateKey()}
        {step === 'import-watch-only' && renderImportWatchOnly()}
        {step === 'set-name' && renderSetName()}
        {step === 'reauth' && renderReauth()}
      </SettingsScreenLayout>

      {/* Failure notice as a sheet: there is nothing to confirm here, so it
          carries one dismiss button instead of a cancel/confirm pair that both
          did the same thing. */}
      <ConfirmSheet
        visible={creationError !== null}
        onClose={() => setCreationError(null)}
        title={creationError?.title ?? ''}
        message={creationError?.message ?? ''}
        acknowledgeOnly
        confirmText={t('actions.close')}
        onConfirm={async () => {}}
      />
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    /**
     * The inside of one step. 12 binds a label to its field and a field to its
     * hint; the 20 between steps' blocks is the layout's own (DESIGN.md
     * §Layout, the component gap).
     */
    stack: {
      gap: s(spacing.md),
    },
    scanState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: vs(spacing['3xl']),
      gap: s(spacing.md),
    },
    scanStateText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.bodyLg),
    },
    bodyText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
    },
    /** Matches PasswordInput's own error text, so hint and error share a slot. */
    hintText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      paddingHorizontal: s(spacing.xs),
    },
    errorText: {
      color: t.status.danger,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      paddingHorizontal: s(spacing.xs),
    },
    addressText: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.mono,
      fontSize: s(fontSize.mono),
    },
  });
