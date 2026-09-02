/**
 * AccountAddPanel — the multi-step add-account flow, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AccountPanels/AccountAddPanel`:
 * the method list as `ListRow`s, the derived scan on `DerivedAccountCard`,
 * the seed grid, the private-key and watch-only fields, the name step and
 * the re-auth step, each a stack of kit blocks under a title and a subtitle.
 *
 * Steps:
 * 1. select-method: derive, import seed, import private key, watch an address
 * 2. derive-scan: scan the active seed's paths
 * 3. import-*: the credential
 * 4. set-name: the name
 * 5. reauth: the password, when the vault key has lapsed
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createAccount,
  EncryptionMaterialMissingError,
  fontFamily,
  fontSize,
  getAccountMnemonic,
  getScanNetworks,
  getScanNetworksWithMirrors,
  getShortAddress,
  importAccountFromPrivateKey,
  importWatchOnlyAccount,
  isVaultKeyCached,
  lineHeight,
  NETWORK_DISPLAY,
  normalizeMnemonic,
  scanDerivedAccounts,
  SHORT_PHRASE,
  spacing,
  trackEvent,
  useAccountsContext,
  useImportPrivateKey,
  useImportWatchOnly,
  validateMnemonic,
  type AccountAddStep,
  type DerivedAccountInfo,
  type IconGlyphProps,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import {
  CaretRightIcon,
  EyeIcon,
  FileTextIcon,
  KeyIcon,
  TreeStructureIcon,
  iconSize,
} from '../../icons';
import { PrimaryButton } from '../Button';
import { Card } from '../Card';
import { ConfirmDialog } from '../ConfirmDialog';
import { DerivedAccountCard, DerivedAccountCardSkeleton } from '../DerivedAccountCard';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { PasswordInput } from '../PasswordInput';
import { SectionLabel } from '../SectionLabel';
import { SeedPhraseEntry } from '../SeedPhrase';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { TextInput } from '../TextInput';
import { WarningNotice } from '../WarningNotice';
import type { AccountAddPanelProps } from './types';

/** The leading well every settings row carries. */
const ROW_BUBBLE_SIZE = 40;
/** Mirrors the cards a scan lists, so the wait does not jump on swap. */
const SCAN_SKELETON_COUNT = 3;

export function AccountAddPanel({
  onComplete,
  onBack,
  onWait,
  onCloseSettings,
}: AccountAddPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const { text, status } = useSemantic();
  const [accountState, accountActions] = useAccountsContext();
  const { activeAccount, accounts, counter } = accountState;

  const [step, setStep] = useState<AccountAddStep>('select-method');
  const [derivedAccounts, setDerivedAccounts] = useState<DerivedAccountInfo[]>([]);
  // Networks whose scan threw — distinguishes an outage from "no accounts".
  const [failedNetworks, setFailedNetworks] = useState<string[]>([]);
  const [selectedDerived, setSelectedDerived] = useState<DerivedAccountInfo | null>(null);
  const [scanning, setScanning] = useState(false);
  // One entry per grid box. Twelve to begin with; a paste or a thirteenth
  // typed word grows it to twenty-four.
  const [seedWords, setSeedWords] = useState<string[]>(() => Array<string>(SHORT_PHRASE).fill(''));
  // What was actually pasted when a paste did not fit. `null` = no rejection.
  const [pastedCount, setPastedCount] = useState<number | null>(null);
  const [seedError, setSeedError] = useState('');
  const seedPhrase = useMemo(() => normalizeMnemonic(seedWords.join(' ')), [seedWords]);
  // Creation-failure notice, surfaced as a sheet rather than inline.
  const [creationError, setCreationError] = useState<{ title: string; message: string } | null>(
    null
  );
  // Re-auth step state. The password lives here only for the moment between
  // typing and the verified write.
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [reauthChecking, setReauthChecking] = useState(false);
  const privateKeyImport = useImportPrivateKey({ accounts });
  const watchOnlyImport = useImportWatchOnly({ accounts });

  /**
   * The wait is **not rendered here**. This panel lives inside the settings
   * stack, and the add finishes by closing it — a wait mounted in here would
   * be torn down with it and its closing wave would play nowhere. The panel
   * raises the wait on the stack (`onWait`), which hosts it outside.
   */
  const raiseWait = useCallback(() => {
    onWait({
      title: selectedDerived
        ? t('settings.account_add.confirm_create')
        : t('settings.account_add.confirm_import'),
      subtitle: t('general.loading'),
    });
  }, [onWait, selectedDerived, t]);

  // A wait this panel raised may not outlive the panel unnoticed. Read
  // through a ref so only unmount — never a new `onWait` identity — lowers it.
  const onWaitRef = useRef(onWait);
  useEffect(() => {
    onWaitRef.current = onWait;
  }, [onWait]);
  useEffect(() => () => onWaitRef.current(null), []);

  const defaultName = useMemo(
    () => t('settings.account_add.default_name', { number: counter + 1 }),
    [counter, t]
  );
  const [accountName, setAccountName] = useState('');

  // Deriving needs a seed phrase to derive from. An account imported from a
  // private key, or a watch-only one, has none — so the row is not offered.
  const canDerive = !!getAccountMnemonic(activeAccount);

  const handleSelectDerive = useCallback(async () => {
    const mnemonic = getAccountMnemonic(activeAccount);
    if (!mnemonic) return;
    setStep('derive-scan');
    setScanning(true);
    setFailedNetworks([]);
    try {
      const scanNetworks = await getScanNetworks();
      const { accounts: derived, failedNetworks: failed } = await scanDerivedAccounts(
        mnemonic,
        scanNetworks
      );
      setDerivedAccounts(derived);
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

  const handleSelectImport = useCallback(() => setStep('import-seed'), []);

  const handleSelectImportPrivateKey = useCallback(() => {
    privateKeyImport.reset();
    setStep('import-private-key');
  }, [privateKeyImport]);

  const handleSelectImportWatchOnly = useCallback(() => {
    watchOnlyImport.reset();
    setStep('import-watch-only');
  }, [watchOnlyImport]);

  const handlePrivateKeySubmit = useCallback(async () => {
    if (!(await privateKeyImport.validate())) return;
    setAccountName(defaultName);
    setStep('set-name');
  }, [privateKeyImport, defaultName]);

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
   * Builds the account the current flow describes. Cheap and side-effect free,
   * so the re-auth path can rebuild rather than park key material in state.
   */
  const buildAccount = useCallback(async () => {
    const name = accountName.trim() || defaultName;
    if (privateKeyImport.privateKey) {
      return importAccountFromPrivateKey({
        name,
        privateKey: privateKeyImport.privateKey,
        networkId: privateKeyImport.networkId,
      });
    }
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
      // A derived account is a wallet of its own that shares this wallet's
      // seed; recording which one lets Wallets draw the descent (spec 025).
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

  const persistAccount = useCallback(
    async (account: Awaited<ReturnType<typeof buildAccount>>['account'], password?: string) => {
      await accountActions.addAccount(account, password);
      // Anonymous funnel event: no seed, address or key material leaves here.
      trackEvent(selectedDerived ? 'wallet_created' : 'wallet_recovered');
      privateKeyImport.reset();
      watchOnlyImport.reset();
      // The account has landed: the wait is lowered and settings closes under
      // it, so the last wave crosses the screen the user is returned to.
      onWait(null);
      onComplete();
      onCloseSettings();
    },
    [
      accountActions,
      selectedDerived,
      privateKeyImport,
      watchOnlyImport,
      onWait,
      onComplete,
      onCloseSettings,
    ]
  );

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
    // Asked before the work, not after it fails: the vault key expires on
    // inactivity, and finding out at the write means a wait and then a dead end.
    if (!(await isVaultKeyCached())) {
      setStep('reauth');
      return;
    }

    raiseWait();
    try {
      const { account } = await buildAccount();
      await persistAccount(account);
    } catch (err) {
      onWait(null);
      // The cache can still lapse between the check and the write.
      if (err instanceof EncryptionMaterialMissingError) {
        setStep('reauth');
        return;
      }
      reportFailure(err);
    }
  }, [buildAccount, persistAccount, raiseWait, onWait, reportFailure]);

  /**
   * Completes the add with a password the user just supplied. Verifies it
   * first: re-encrypting the vault under an unverified password would lock
   * the user out of every account they own.
   */
  const handleReauthConfirm = useCallback(async () => {
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
    raiseWait();
    try {
      const { account } = await buildAccount();
      await persistAccount(account, reauthPassword);
      setReauthPassword('');
    } catch (err) {
      onWait(null);
      reportFailure(err);
    }
  }, [
    reauthPassword,
    accountActions,
    buildAccount,
    persistAccount,
    raiseWait,
    onWait,
    reportFailure,
    t,
  ]);

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

  const hintStyle: React.CSSProperties = {
    margin: 0,
    color: text.secondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    padding: `0 ${spacing.xs}px`,
  };
  const errorStyle: React.CSSProperties = { ...hintStyle, color: status.danger };
  const addressStyle: React.CSSProperties = {
    margin: 0,
    color: text.primary,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.mono,
  };
  /** The inside of one step: 12 binds a label to its field and a field to its hint. */
  const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: spacing.md };

  const methods: {
    id: string;
    icon: React.ComponentType<IconGlyphProps>;
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
            onPress: () => void handleSelectDerive(),
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
        <div style={stack} aria-busy="true" aria-label={t('settings.account_add.scanning')}>
          {Array.from({ length: SCAN_SKELETON_COUNT }, (_, i) => (
            <DerivedAccountCardSkeleton key={i} />
          ))}
          <p style={{ ...hintStyle, textAlign: 'center' }}>{t('settings.account_add.scanning')}</p>
        </div>
      );
    }

    if (derivedAccounts.length === 0 && failedNetworks.length > 0) {
      return (
        <div style={stack} data-testid="derived-scan-error">
          <WarningNotice tone="error" title={t('wallet.derived.scan_failed_title')}>
            {t('wallet.derived.scan_failed_body')}
          </WarningNotice>
          <PrimaryButton
            onPress={() => void handleSelectDerive()}
            testID="derived-scan-retry-button"
          >
            {t('transactions.tapToRetry')}
          </PrimaryButton>
        </div>
      );
    }

    return (
      <div style={stack}>
        {failedNetworks.length > 0 && (
          <WarningNotice tone="warning" title={t('wallet.derived.scan_partial')} />
        )}
        {derivedAccounts.map((item) => (
          <DerivedAccountCard
            key={`${item.networkId}-${item.address}`}
            testID={`account-add-derived-${item.address}`}
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
      </div>
    );
  };

  const renderImportSeed = () => (
    <div style={stack}>
      <SectionLabel variant="caps">{t('settings.account_add.import_seed')}</SectionLabel>
      <SeedPhraseEntry
        testID="account-add-seed"
        words={seedWords}
        onChange={handleSeedWords}
        onLengthChange={handleSeedLength}
        onPasteRejected={setPastedCount}
      />
      {pastedCount !== null ? (
        <p style={errorStyle}>{t('wallet.recover.pastedWordCount', { count: pastedCount })}</p>
      ) : seedError ? (
        <p style={errorStyle}>{seedError}</p>
      ) : null}
      <PrimaryButton onPress={handleSeedSubmit} testID="account-add-seed-continue-button">
        {t('actions.continue')}
      </PrimaryButton>
    </div>
  );

  const renderImportPrivateKey = () => (
    <div style={stack}>
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
        onSubmitEditing={() => void handlePrivateKeySubmit()}
        autoFocus
      />
      {/* One slot under the field: the hint stands where the error will
          stand, so the layout does not shift when a message replaces it. */}
      {!privateKeyImport.error && <p style={hintStyle}>{t('wallet.import.help')}</p>}
      {privateKeyImport.address && (
        <Card
          padding="md"
          gap={spacing.xxs}
          style={{ flexDirection: 'column' }}
          testID="account-add-private-key-address"
        >
          <p style={hintStyle}>{t('wallet.import.resolved_address')}</p>
          <p style={addressStyle}>{getShortAddress(privateKeyImport.address)}</p>
        </Card>
      )}
      <PrimaryButton
        onPress={() => void handlePrivateKeySubmit()}
        disabled={!privateKeyImport.hasInput || privateKeyImport.validating}
        testID="account-add-private-key-continue-button"
      >
        {t('actions.continue')}
      </PrimaryButton>
    </div>
  );

  const renderImportWatchOnly = () => (
    <div style={stack}>
      {/* No warning notice and no masked field: an address is public. */}
      <SectionLabel variant="caps">{t('wallet.watchOnly.label')}</SectionLabel>
      <TextInput
        testID="account-add-watch-only-input"
        value={watchOnlyImport.value}
        onChangeText={watchOnlyImport.setValue}
        placeholder={t('wallet.watchOnly.placeholder')}
        accessibilityLabel={t('wallet.watchOnly.label')}
        autoFocus
        mono
        onSubmitEditing={handleWatchOnlySubmit}
      />
      <p
        data-testid="account-add-watch-only-message"
        style={watchOnlyImport.error ? errorStyle : hintStyle}
      >
        {watchOnlyImport.error ? t(watchOnlyImport.error) : t('wallet.watchOnly.help')}
      </p>
      {watchOnlyImport.address && (
        <Card
          padding="md"
          gap={spacing.xxs}
          style={{ flexDirection: 'column' }}
          testID="account-add-watch-only-address"
        >
          <p style={hintStyle}>{t('wallet.watchOnly.resolved_address')}</p>
          <p style={addressStyle}>{getShortAddress(watchOnlyImport.address)}</p>
        </Card>
      )}
      <PrimaryButton
        onPress={handleWatchOnlySubmit}
        disabled={!watchOnlyImport.hasInput}
        testID="account-add-watch-only-continue-button"
      >
        {t('actions.continue')}
      </PrimaryButton>
    </div>
  );

  const renderReauth = () => (
    <div style={stack}>
      <p
        style={{
          margin: 0,
          color: text.secondary,
          fontFamily: fontFamily.sans,
          fontSize: fontSize.body,
          lineHeight: `${fontSize.body * lineHeight.snug}px`,
        }}
      >
        {t('settings.account_add.reauth_body')}
      </p>
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
        onSubmitEditing={() => void handleReauthConfirm()}
        autoFocus
      />
      <PrimaryButton
        onPress={() => void handleReauthConfirm()}
        disabled={!reauthPassword || reauthChecking}
        testID="account-add-reauth-confirm-button"
      >
        {t('settings.account_add.reauth_confirm')}
      </PrimaryButton>
    </div>
  );

  const renderSetName = () => (
    <div style={stack}>
      <SectionLabel variant="caps">{t('settings.account_add.set_name')}</SectionLabel>
      <TextInput
        testID="account-add-name-input"
        value={accountName}
        onChangeText={setAccountName}
        placeholder={t('settings.account_add.set_name_placeholder')}
        accessibilityLabel={t('settings.account_add.set_name')}
        autoFocus
        maxLength={32}
        onSubmitEditing={() => void handleConfirm()}
      />
      <PrimaryButton onPress={() => void handleConfirm()} testID="account-add-confirm-button">
        {selectedDerived
          ? t('settings.account_add.confirm_create')
          : t('settings.account_add.confirm_import')}
      </PrimaryButton>
    </div>
  );

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

  return (
    <>
      <SettingsPanelContent
        title={stepTitles[step]}
        subtitle={stepSubtitles[step]}
        onBack={handleStepBack}
      >
        {step === 'select-method' && renderSelectMethod()}
        {step === 'derive-scan' && renderDeriveScan()}
        {step === 'import-seed' && renderImportSeed()}
        {step === 'import-private-key' && renderImportPrivateKey()}
        {step === 'import-watch-only' && renderImportWatchOnly()}
        {step === 'set-name' && renderSetName()}
        {step === 'reauth' && renderReauth()}
      </SettingsPanelContent>

      {/* Failure notice as a sheet: nothing to confirm, one dismiss button. */}
      <ConfirmDialog
        visible={creationError !== null}
        onClose={() => setCreationError(null)}
        title={creationError?.title ?? ''}
        message={creationError?.message ?? ''}
        acknowledgeOnly
        confirmText={t('actions.close')}
        onConfirm={async () => {}}
        confirmTestID="account-add-error-close"
      />
    </>
  );
}
