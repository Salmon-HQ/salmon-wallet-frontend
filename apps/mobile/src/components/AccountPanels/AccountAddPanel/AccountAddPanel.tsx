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
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
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
  colors,
  componentSizes,
  spacing,
  borderRadius,
  borderWidth,
  fontSize,
  fontFamilyNative,
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
  NETWORK_DISPLAY,
  SHORT_PHRASE,
  EncryptionMaterialMissingError,
  trackEvent,
  type Account,
  type AccountAddStep,
  type DerivedAccountInfo,
  semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { PrimaryButton } from '../../Button';
import { ConfirmSheet } from '../../ConfirmSheet';
import { DerivedAccountCard } from '../../DerivedAccountCard';
import { LoadingScreen } from '../../LoadingScreen';
import { WarningNotice } from '../../WarningNotice';
import { SeedPhraseEntry } from '../../SeedPhrase';
import { PasswordInput } from '../../PasswordInput';
import { useSecretScreen } from '../../../../hooks/useSecretScreen';
import { useWaitPassage } from '../../../utils/useWaitPassage';
import type { AccountAddPanelProps } from './types';

// ============================================================================
// Component
// ============================================================================

export function AccountAddPanel({ onComplete, onBack }: AccountAddPanelProps): React.ReactElement {
  const { t } = useTranslation();
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
      networkIds: await getScanNetworks(),
      startIndex: selectedDerived ? selectedDerived.index : 0,
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

  const renderSelectMethod = () => (
    <View style={styles.methodContainer}>
      {canDerive && (
        <TouchableOpacity
          testID="account-add-method-derive"
          accessibilityRole="button"
          style={styles.methodCard}
          onPress={handleSelectDerive}
          activeOpacity={0.7}
        >
          <View style={styles.methodIcon}>
            <TreeStructureIcon size={iconSize.xl} color={semantic.accent.ink} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>{t('settings.account_add.create_new')}</Text>
            <Text style={styles.methodDescription}>
              {t('settings.account_add.create_new_description')}
            </Text>
          </View>
          <CaretRightIcon size={iconSize.md} color={semantic.text.secondary} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        testID="account-add-method-import"
        accessibilityRole="button"
        style={styles.methodCard}
        onPress={handleSelectImport}
        activeOpacity={0.7}
      >
        <View style={styles.methodIcon}>
          <FileTextIcon size={iconSize.xl} color={semantic.accent.ink} />
        </View>
        <View style={styles.methodInfo}>
          <Text style={styles.methodTitle}>{t('settings.account_add.import_seed')}</Text>
          <Text style={styles.methodDescription}>
            {t('settings.account_add.import_seed_description')}
          </Text>
        </View>
        <CaretRightIcon size={iconSize.md} color={semantic.text.secondary} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="account-add-method-private-key"
        accessibilityRole="button"
        style={styles.methodCard}
        onPress={handleSelectImportPrivateKey}
        activeOpacity={0.7}
      >
        <View style={styles.methodIcon}>
          <KeyIcon size={iconSize.xl} color={semantic.accent.ink} />
        </View>
        <View style={styles.methodInfo}>
          <Text style={styles.methodTitle}>{t('settings.account_add.import_private_key')}</Text>
          <Text style={styles.methodDescription}>
            {t('settings.account_add.import_private_key_description')}
          </Text>
        </View>
        <CaretRightIcon size={iconSize.md} color={semantic.text.secondary} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="account-add-method-watch-only"
        accessibilityRole="button"
        style={styles.methodCard}
        onPress={handleSelectImportWatchOnly}
        activeOpacity={0.7}
      >
        <View style={styles.methodIcon}>
          <EyeIcon size={iconSize.xl} color={semantic.accent.ink} />
        </View>
        <View style={styles.methodInfo}>
          <Text style={styles.methodTitle}>{t('settings.account_add.import_watch_only')}</Text>
          <Text style={styles.methodDescription}>
            {t('settings.account_add.import_watch_only_description')}
          </Text>
        </View>
        <CaretRightIcon size={iconSize.md} color={semantic.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  const renderDeriveScan = () => (
    <View>
      {scanning ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={semantic.accent.ink} />
          <Text style={styles.loadingText}>{t('settings.account_add.scanning')}</Text>
        </View>
      ) : derivedAccounts.length === 0 && failedNetworks.length > 0 ? (
        <View style={styles.scanErrorContainer} testID="derived-scan-error">
          <Text style={styles.scanErrorTitle}>{t('wallet.derived.scan_failed_title')}</Text>
          <Text style={styles.scanErrorBody}>{t('wallet.derived.scan_failed_body')}</Text>
          <View style={styles.buttonContainer}>
            <PrimaryButton onPress={handleSelectDerive} testID="derived-scan-retry-button">
              {t('transactions.tapToRetry')}
            </PrimaryButton>
          </View>
        </View>
      ) : (
        <>
          {failedNetworks.length > 0 && (
            <WarningNotice
              tone="warning"
              title={t('wallet.derived.scan_partial')}
              style={styles.partialWarning}
            />
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
          <View style={styles.buttonContainer}>
            <PrimaryButton
              onPress={handleDerivedContinue}
              disabled={!selectedDerived}
              testID="account-add-derive-continue-button"
            >
              {t('actions.continue')}
            </PrimaryButton>
          </View>
        </>
      )}
    </View>
  );

  const renderImportSeed = () => (
    <View>
      <Text style={styles.inputLabel}>{t('settings.account_add.import_seed')}</Text>
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
      <View style={styles.buttonContainer}>
        <PrimaryButton onPress={handleSeedSubmit} testID="account-add-seed-continue-button">
          {t('actions.continue')}
        </PrimaryButton>
      </View>
    </View>
  );

  const renderImportPrivateKey = () => (
    <View>
      <WarningNotice
        tone="warning"
        title={t('wallet.import.warning_title')}
        style={styles.partialWarning}
      >
        <Text style={styles.methodDescription}>{t('wallet.import.warning_body')}</Text>
      </WarningNotice>
      <Text style={styles.inputLabel}>{t('wallet.import.label')}</Text>
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
      {!privateKeyImport.error && <Text style={styles.inputHint}>{t('wallet.import.help')}</Text>}
      {privateKeyImport.address && (
        <View style={styles.resolvedAddress} testID="account-add-private-key-address">
          <Text style={styles.methodDescription}>{t('wallet.import.resolved_address')}</Text>
          <Text style={styles.methodTitle}>{getShortAddress(privateKeyImport.address)}</Text>
        </View>
      )}
      <View style={styles.buttonContainer}>
        <PrimaryButton
          onPress={handlePrivateKeySubmit}
          disabled={!privateKeyImport.hasInput || privateKeyImport.validating}
          testID="account-add-private-key-continue-button"
        >
          {t('actions.continue')}
        </PrimaryButton>
      </View>
    </View>
  );

  const renderImportWatchOnly = () => (
    <View>
      {/* No warning notice and no masked field: an address is public. The
          private-key step's PasswordInput would imply otherwise. */}
      <Text style={styles.inputLabel}>{t('wallet.watchOnly.label')}</Text>
      <TextInput
        testID="account-add-watch-only-input"
        style={styles.input}
        value={watchOnlyImport.value}
        onChangeText={watchOnlyImport.setValue}
        placeholder={t('wallet.watchOnly.placeholder')}
        placeholderTextColor={semantic.text.tertiary}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleWatchOnlySubmit}
      />
      {/* One slot under the field: the hint stands where the error will
          stand, so the layout does not shift when a message replaces it. */}
      <Text
        testID="account-add-watch-only-message"
        style={watchOnlyImport.error ? styles.errorText : styles.inputHint}
      >
        {watchOnlyImport.error ? t(watchOnlyImport.error) : t('wallet.watchOnly.help')}
      </Text>
      {watchOnlyImport.address && (
        <View style={styles.resolvedAddress} testID="account-add-watch-only-address">
          <Text style={styles.methodDescription}>{t('wallet.watchOnly.resolved_address')}</Text>
          <Text style={styles.methodTitle}>{getShortAddress(watchOnlyImport.address)}</Text>
        </View>
      )}
      <View style={styles.buttonContainer}>
        <PrimaryButton
          onPress={handleWatchOnlySubmit}
          disabled={!watchOnlyImport.hasInput}
          testID="account-add-watch-only-continue-button"
        >
          {t('actions.continue')}
        </PrimaryButton>
      </View>
    </View>
  );

  const renderReauth = () => (
    <View>
      <Text style={styles.methodDescription}>{t('settings.account_add.reauth_body')}</Text>
      <Text style={styles.inputLabel}>{t('lock.password_label', 'Password')}</Text>
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
      <View style={styles.buttonContainer}>
        <PrimaryButton
          onPress={handleReauthConfirm}
          disabled={!reauthPassword || reauthChecking}
          testID="account-add-reauth-confirm-button"
        >
          {t('settings.account_add.reauth_confirm')}
        </PrimaryButton>
      </View>
    </View>
  );

  const renderSetName = () => (
    <View>
      <Text style={styles.inputLabel}>{t('settings.account_add.set_name')}</Text>
      <TextInput
        testID="account-add-name-input"
        style={styles.input}
        value={accountName}
        onChangeText={setAccountName}
        placeholder={t('settings.account_add.set_name_placeholder')}
        placeholderTextColor={semantic.text.tertiary}
        autoFocus
        maxLength={32}
        returnKeyType="done"
        onSubmitEditing={handleConfirm}
      />
      <View style={styles.buttonContainer}>
        <PrimaryButton onPress={handleConfirm} testID="account-add-confirm-button">
          {t('settings.account_add.confirm')}
        </PrimaryButton>
      </View>
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
      <SettingsScreenLayout title={currentTitle} onBack={handleStepBack}>
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

const styles = StyleSheet.create({
  methodContainer: {
    gap: spacing.md,
  },
  /** Matches PasswordInput's own error text, so hint and error share a slot. */
  inputHint: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  resolvedAddress: {
    marginTop: spacing.lg,
    gap: spacing.xxs,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.r3,
    padding: spacing.lg,
  },
  methodIcon: {
    width: componentSizes.iconSize3XL,
    height: componentSizes.iconSize3XL,
    borderRadius: borderRadius.r2,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  methodInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  methodTitle: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
    marginBottom: spacing.xxs,
  },
  methodDescription: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  loadingText: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
  },
  buttonContainer: {
    marginTop: spacing.xl,
  },
  scanErrorContainer: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  scanErrorTitle: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
    textAlign: 'center',
  },
  scanErrorBody: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  partialWarning: {
    marginBottom: spacing.md,
  },
  errorText: {
    color: semantic.status.danger,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  inputLabel: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.caption,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.r2,
    borderWidth: borderWidth.thin,
    borderColor: semantic.border.default,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
  },
});
