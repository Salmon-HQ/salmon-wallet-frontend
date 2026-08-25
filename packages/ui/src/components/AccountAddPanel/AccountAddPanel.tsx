/**
 * AccountAddPanel - Multi-step account creation flow
 *
 * Steps:
 * 1. select-method: Choose between deriving or importing
 * 2. derive-scan: Scan for derived accounts using DerivedAccountCard
 * 3. import-seed: Enter seed phrase
 * 4. set-name: Choose account name
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import ListItemButton from '@mui/material/ListItemButton';
import {
  CaretRightIcon,
  EyeIcon,
  FileTextIcon,
  KeyIcon,
  TreeStructureIcon,
  iconSize,
} from '../../icons';
import { styled } from '../../utils/styled';
import {
  colors,
  semantic,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
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
  getShortAddress,
  getAccountMnemonic,
  NETWORK_DISPLAY,
  getScanNetworks,
  SHORT_PHRASE,
  EncryptionMaterialMissingError,
  trackEvent,
  type AccountAddStep,
  type DerivedAccountInfo,
  componentSizes,
  useWaitExit,
} from '@salmon/shared';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { PrimaryButton } from '../Button';
import { DerivedAccountCard } from '../DerivedAccountCard';
import { LoadingScreen } from '../LoadingScreen';
import { WarningNotice } from '../WarningNotice';
import { SeedPhraseEntry } from '../SeedPhrase';
import { PasswordInput } from '../PasswordInput';
import type { AccountAddPanelProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const MethodCard = styled(ListItemButton)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
  padding: spacing.lg,
  backgroundColor: colors.interactive.surface,
  // The control radius, by its scale name (DESIGN.md §The Control Radius Rule).
  borderRadius: borderRadius.r3,
  marginBottom: spacing.md,
});

const MethodIcon = styled(Box)({
  width: componentSizes.iconSize3XL,
  height: componentSizes.iconSize3XL,
  borderRadius: borderRadius.r2,
  backgroundColor: colors.interactive.hoverSubtle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const MethodInfo = styled(Box)({
  flex: 1,
  minWidth: 0,
});

/**
 * The committing action is the system's own primary button — the settings
 * surface joined the system (DESIGN.md §Motion), so no panel hand-rolls the
 * salmon fill any more. This only holds the gap above it.
 */
const CONFIRM_SLOT_STYLE = { marginTop: spacing.xl } as const;

const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    backgroundColor: colors.interactive.surface,
    // The control radius: a field and the button under it are one shape
    // (DESIGN.md §The Control Radius Rule). It was 8.
    borderRadius: componentSizes.inputRadius,
    color: colors.text.primary,
    fontSize: fontSize.body,
    '& fieldset': {
      borderColor: colors.border.default,
    },
    '&:hover fieldset': {
      borderColor: colors.text.secondary,
    },
    '&.Mui-focused fieldset': {
      borderColor: colors.accent.primary,
    },
  },
});

// ============================================================================
// Component
// ============================================================================

export function AccountAddPanel({ onComplete, onBack }: AccountAddPanelProps): React.ReactElement {
  const { t } = useTranslation();
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
  const [confirmError, setConfirmError] = useState('');
  // Re-auth step state. The password lives here only for the moment between
  // typing and the verified write.
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [reauthChecking, setReauthChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const privateKeyImport = useImportPrivateKey({ accounts });
  const watchOnlyImport = useImportWatchOnly({ accounts });

  /**
   * The wait's exit, held. This panel renders inside the settings panel stack,
   * a drawer with its own choreography, so it takes only the half of the
   * passage that is its own: the wait stays mounted with `visible={false}` —
   * which is what starts its exit — and the completion handoff is parked
   * behind `onExited`, because completing earlier unmounts the panel and cuts
   * the closing wave mid-crossing (DESIGN.md §The wait). The wait's own
   * watchdog guarantees the report, so the handoff cannot be stranded. It does
   * not sink: a sheet's content never speaks the verb.
   */
  const { held, onExited } = useWaitExit(loading);
  const pendingCompleteRef = useRef(false);
  const handleWaitExited = useCallback(() => {
    onExited();
    if (!pendingCompleteRef.current) return;
    pendingCompleteRef.current = false;
    onComplete();
  }, [onExited, onComplete]);

  const defaultName = useMemo(
    () => t('settings.account_add.default_name', { number: counter + 1 }),
    [counter, t]
  );
  const [accountName, setAccountName] = useState('');

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
      const scanNetworks = await getScanNetworks();
      const { accounts: derived, failedNetworks: failed } = await scanDerivedAccounts(
        mnemonic,
        scanNetworks
      );
      setDerivedAccounts(derived);
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

  const persistAccount = useCallback(
    async (account: Awaited<ReturnType<typeof buildAccount>>['account'], password?: string) => {
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

  const handleConfirm = useCallback(async () => {
    setConfirmError('');

    // Asked before the work, not after it fails: the vault key expires on
    // inactivity, and finding out at the write means showing a wait and then a
    // dead end for something that was knowable up front.
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
      console.error('Failed to add account:', err);
      setConfirmError(t('settings.account_add.creation_error'));
    }
  }, [buildAccount, persistAccount, t]);

  /**
   * Completes the add with a password the user just supplied. Verifies it
   * first: re-encrypting the vault under an unverified password would lock the
   * user out of every account they own.
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
    setLoading(true);
    try {
      const { account } = await buildAccount();
      await persistAccount(account, reauthPassword);
      setReauthPassword('');
    } catch (err) {
      setLoading(false);
      console.error('Failed to add account after re-auth:', err);
      setConfirmError(t('settings.account_add.creation_error'));
    }
  }, [reauthPassword, accountActions, buildAccount, persistAccount, t]);

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

  return (
    <>
      {held && (
        <LoadingScreen
          visible={loading}
          title={
            selectedDerived
              ? t('settings.account_add.confirm_create')
              : t('settings.account_add.confirm_import')
          }
          subtitle={t('general.loading')}
          onExited={handleWaitExited}
        />
      )}
      <SettingsPanelContent title={stepTitles[step]} onBack={handleStepBack}>
        <Box sx={{ padding: `0 ${spacing.lg}px` }}>
          {step === 'select-method' && (
            <>
              {canDerive && (
                <MethodCard onClick={handleSelectDerive} data-testid="account-add-method-derive">
                  <MethodIcon>
                    <TreeStructureIcon color={colors.accent.primary} size={iconSize.xl} />
                  </MethodIcon>
                  <MethodInfo>
                    <Typography
                      sx={{
                        color: colors.text.primary,
                        fontWeight: fontWeight.semibold,
                        fontSize: fontSize.body,
                        marginBottom: spacing.xxs,
                      }}
                    >
                      {t('settings.account_add.create_new')}
                    </Typography>
                    <Typography sx={{ color: colors.text.secondary, fontSize: fontSize.caption }}>
                      {t('settings.account_add.create_new_description')}
                    </Typography>
                  </MethodInfo>
                  <CaretRightIcon color={colors.text.secondary} />
                </MethodCard>
              )}

              <MethodCard onClick={handleSelectImport} data-testid="account-add-method-import">
                <MethodIcon>
                  <FileTextIcon color={colors.accent.primary} size={iconSize.xl} />
                </MethodIcon>
                <MethodInfo>
                  <Typography
                    sx={{
                      color: colors.text.primary,
                      fontWeight: fontWeight.semibold,
                      fontSize: fontSize.body,
                      marginBottom: spacing.xxs,
                    }}
                  >
                    {t('settings.account_add.import_seed')}
                  </Typography>
                  <Typography sx={{ color: colors.text.secondary, fontSize: fontSize.caption }}>
                    {t('settings.account_add.import_seed_description')}
                  </Typography>
                </MethodInfo>
                <CaretRightIcon color={colors.text.secondary} />
              </MethodCard>

              <MethodCard
                onClick={handleSelectImportPrivateKey}
                data-testid="account-add-method-private-key"
              >
                <MethodIcon>
                  <KeyIcon color={colors.accent.primary} size={iconSize.xl} />
                </MethodIcon>
                <MethodInfo>
                  <Typography
                    sx={{
                      color: colors.text.primary,
                      fontWeight: fontWeight.semibold,
                      fontSize: fontSize.body,
                      marginBottom: spacing.xxs,
                    }}
                  >
                    {t('settings.account_add.import_private_key')}
                  </Typography>
                  <Typography sx={{ color: colors.text.secondary, fontSize: fontSize.caption }}>
                    {t('settings.account_add.import_private_key_description')}
                  </Typography>
                </MethodInfo>
                <CaretRightIcon color={colors.text.secondary} />
              </MethodCard>

              <MethodCard
                onClick={handleSelectImportWatchOnly}
                data-testid="account-add-method-watch-only"
              >
                <MethodIcon>
                  <EyeIcon color={colors.accent.primary} size={iconSize.xl} />
                </MethodIcon>
                <MethodInfo>
                  <Typography
                    sx={{
                      color: colors.text.primary,
                      fontWeight: fontWeight.semibold,
                      fontSize: fontSize.body,
                      marginBottom: spacing.xxs,
                    }}
                  >
                    {t('settings.account_add.import_watch_only')}
                  </Typography>
                  <Typography sx={{ color: colors.text.secondary, fontSize: fontSize.caption }}>
                    {t('settings.account_add.import_watch_only_description')}
                  </Typography>
                </MethodInfo>
                <CaretRightIcon color={colors.text.secondary} />
              </MethodCard>
            </>
          )}

          {step === 'import-private-key' && (
            <>
              <WarningNotice tone="warning" title={t('wallet.import.warning_title')}>
                {t('wallet.import.warning_body')}
              </WarningNotice>
              <Box sx={{ marginTop: `${spacing.lg}px` }}>
                <PasswordInput
                  value={privateKeyImport.value}
                  onChangeText={privateKeyImport.setValue}
                  placeholder={t('wallet.import.placeholder')}
                  error={privateKeyImport.error ? t(privateKeyImport.error) : undefined}
                  onSubmitEditing={handlePrivateKeySubmit}
                  autoFocus
                  testID="account-add-private-key-input"
                />
              </Box>
              {/* One slot under the field: the hint stands where the error
                  will stand, so the layout does not shift when a message
                  replaces it. Matches PasswordInput's own error text. */}
              {!privateKeyImport.error && (
                <Typography
                  sx={{
                    color: colors.text.secondary,
                    fontSize: fontSize.caption,
                    marginTop: `${spacing.sm}px`,
                    paddingLeft: `${spacing.xs}px`,
                    paddingRight: `${spacing.xs}px`,
                  }}
                >
                  {t('wallet.import.help')}
                </Typography>
              )}
              {privateKeyImport.address && (
                <Box
                  sx={{ marginTop: `${spacing.lg}px` }}
                  data-testid="account-add-private-key-address"
                >
                  <Typography sx={{ color: colors.text.secondary, fontSize: fontSize.caption }}>
                    {t('wallet.import.resolved_address')}
                  </Typography>
                  <Typography sx={{ color: colors.text.primary, fontSize: fontSize.body }}>
                    {getShortAddress(privateKeyImport.address)}
                  </Typography>
                </Box>
              )}
              <PrimaryButton
                style={CONFIRM_SLOT_STYLE}
                onClick={handlePrivateKeySubmit}
                disabled={!privateKeyImport.hasInput || privateKeyImport.validating}
                testID="account-add-private-key-continue-button"
              >
                {t('actions.continue')}
              </PrimaryButton>
            </>
          )}

          {step === 'import-watch-only' && (
            <>
              {/* No warning notice and no masked field: an address is public.
                  The private-key step's PasswordInput would imply otherwise. */}
              <StyledTextField
                fullWidth
                value={watchOnlyImport.value}
                onChange={(e) => watchOnlyImport.setValue(e.target.value)}
                placeholder={t('wallet.watchOnly.placeholder')}
                aria-label={t('wallet.watchOnly.label')}
                autoFocus
                inputProps={{ 'data-testid': 'account-add-watch-only-input' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleWatchOnlySubmit();
                }}
              />
              {/* One slot under the field: the hint stands where the error
                  will stand, so the layout does not shift. */}
              <Typography
                sx={{
                  color: watchOnlyImport.error ? semantic.status.danger : colors.text.secondary,
                  fontSize: fontSize.caption,
                  marginTop: `${spacing.sm}px`,
                  paddingLeft: `${spacing.xs}px`,
                  paddingRight: `${spacing.xs}px`,
                }}
                data-testid="account-add-watch-only-message"
              >
                {watchOnlyImport.error ? t(watchOnlyImport.error) : t('wallet.watchOnly.help')}
              </Typography>
              {watchOnlyImport.address && (
                <Box
                  sx={{ marginTop: `${spacing.lg}px` }}
                  data-testid="account-add-watch-only-address"
                >
                  <Typography sx={{ color: colors.text.secondary, fontSize: fontSize.caption }}>
                    {t('wallet.watchOnly.resolved_address')}
                  </Typography>
                  <Typography sx={{ color: colors.text.primary, fontSize: fontSize.body }}>
                    {getShortAddress(watchOnlyImport.address)}
                  </Typography>
                </Box>
              )}
              <PrimaryButton
                style={CONFIRM_SLOT_STYLE}
                onClick={handleWatchOnlySubmit}
                disabled={!watchOnlyImport.hasInput}
                testID="account-add-watch-only-continue-button"
              >
                {t('actions.continue')}
              </PrimaryButton>
            </>
          )}

          {step === 'derive-scan' && (
            <>
              {scanning ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: `${spacing['3xl']}px 0`,
                    gap: spacing.md,
                  }}
                >
                  <CircularProgress sx={{ color: colors.accent.primary }} />
                  <Typography sx={{ color: colors.text.secondary, fontSize: fontSize.body }}>
                    {t('settings.account_add.scanning')}
                  </Typography>
                </Box>
              ) : derivedAccounts.length === 0 && failedNetworks.length > 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: `${spacing['3xl']}px 0`,
                    gap: spacing.md,
                  }}
                  data-testid="derived-scan-error"
                >
                  <Typography sx={{ color: colors.text.primary, fontSize: fontSize.body }}>
                    {t('wallet.derived.scan_failed_title')}
                  </Typography>
                  <Typography
                    sx={{
                      color: colors.text.secondary,
                      fontSize: fontSize.caption,
                      textAlign: 'center',
                    }}
                  >
                    {t('wallet.derived.scan_failed_body')}
                  </Typography>
                  <PrimaryButton
                    fullWidth={false}
                    onClick={handleSelectDerive}
                    testID="derived-scan-retry-button"
                  >
                    {t('transactions.tapToRetry')}
                  </PrimaryButton>
                </Box>
              ) : (
                <>
                  {failedNetworks.length > 0 && (
                    <Box sx={{ marginBottom: `${spacing.md}px` }}>
                      <WarningNotice tone="warning" title={t('wallet.derived.scan_partial')} />
                    </Box>
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
                    style={CONFIRM_SLOT_STYLE}
                    onClick={handleDerivedContinue}
                    disabled={!selectedDerived}
                    testID="account-add-derive-continue-button"
                  >
                    {t('actions.continue')}
                  </PrimaryButton>
                </>
              )}
            </>
          )}

          {step === 'import-seed' && (
            <>
              <SeedPhraseEntry
                testID="account-add-seed"
                words={seedWords}
                onChange={handleSeedWords}
                onLengthChange={handleSeedLength}
                onPasteRejected={setPastedCount}
              />
              {(pastedCount !== null || seedError) && (
                <Typography
                  sx={{
                    color: semantic.status.danger,
                    fontSize: fontSize.caption,
                    marginTop: `${spacing.sm}px`,
                    paddingLeft: `${spacing.xs}px`,
                    paddingRight: `${spacing.xs}px`,
                  }}
                >
                  {pastedCount !== null
                    ? t('wallet.recover.pastedWordCount', { count: pastedCount })
                    : seedError}
                </Typography>
              )}
              <PrimaryButton
                style={CONFIRM_SLOT_STYLE}
                onClick={handleSeedSubmit}
                testID="account-add-seed-continue-button"
              >
                {t('actions.continue')}
              </PrimaryButton>
            </>
          )}

          {step === 'reauth' && (
            <>
              <Typography sx={{ color: colors.text.secondary, fontSize: fontSize.caption }}>
                {t('settings.account_add.reauth_body')}
              </Typography>
              <Box sx={{ marginTop: `${spacing.lg}px` }}>
                <PasswordInput
                  value={reauthPassword}
                  onChangeText={(value) => {
                    setReauthPassword(value);
                    if (reauthError) setReauthError('');
                  }}
                  placeholder={t('lock.password_placeholder')}
                  error={reauthError || undefined}
                  onSubmitEditing={handleReauthConfirm}
                  autoFocus
                  testID="account-add-reauth-password"
                />
              </Box>
              <PrimaryButton
                style={CONFIRM_SLOT_STYLE}
                onClick={handleReauthConfirm}
                disabled={!reauthPassword || reauthChecking}
                testID="account-add-reauth-confirm-button"
              >
                {t('settings.account_add.reauth_confirm')}
              </PrimaryButton>
            </>
          )}

          {step === 'set-name' && (
            <>
              <StyledTextField
                fullWidth
                value={accountName}
                onChange={(e) => {
                  setAccountName(e.target.value);
                  if (confirmError) setConfirmError('');
                }}
                placeholder={t('settings.account_add.set_name_placeholder')}
                aria-label={t('settings.account_add.set_name')}
                autoFocus
                inputProps={{ maxLength: 32, 'data-testid': 'account-add-name-input' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirm();
                }}
              />
              {confirmError && (
                <Typography
                  sx={{
                    color: semantic.status.danger,
                    fontSize: fontSize.caption,
                    marginTop: `${spacing.sm}px`,
                    paddingLeft: `${spacing.xs}px`,
                    paddingRight: `${spacing.xs}px`,
                  }}
                >
                  {confirmError}
                </Typography>
              )}
              <PrimaryButton
                style={CONFIRM_SLOT_STYLE}
                onClick={handleConfirm}
                testID="account-add-confirm-button"
              >
                {selectedDerived
                  ? t('settings.account_add.confirm_create')
                  : t('settings.account_add.confirm_import')}
              </PrimaryButton>
            </>
          )}
        </Box>
      </SettingsPanelContent>
    </>
  );
}
