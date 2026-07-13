/**
 * AccountAddPanel - Multi-step account creation flow
 *
 * Steps:
 * 1. select-method: Choose between deriving or importing
 * 2. derive-scan: Scan for derived accounts using DerivedAccountCard
 * 3. import-seed: Enter seed phrase
 * 4. set-name: Choose account name
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import ListItemButton from '@mui/material/ListItemButton';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DescriptionIcon from '@mui/icons-material/Description';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { styled } from '../../utils/styled';
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  useAccountsContext,
  scanDerivedAccounts,
  validateMnemonic,
  normalizeMnemonic,
  createAccount,
  NETWORK_DISPLAY,
  getScanNetworks,
  EncryptionMaterialMissingError,
  trackEvent,
  type AccountAddStep,
  type DerivedAccountInfo,
  opacity,
  componentSizes,
} from '@salmon/shared';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { DerivedAccountCard } from '../DerivedAccountCard';
import { LoadingScreen } from '../LoadingScreen';
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
  borderRadius: borderRadius.lg,
  marginBottom: spacing.md,
});

const MethodIcon = styled(Box)({
  width: componentSizes.iconSize3XL,
  height: componentSizes.iconSize3XL,
  borderRadius: borderRadius.md,
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

const ConfirmButton = styled(Button)({
  backgroundColor: colors.accent.primary,
  color: colors.text.primary,
  fontWeight: fontWeight.semibold,
  textTransform: 'none',
  borderRadius: borderRadius.md,
  padding: `${spacing.md}px`,
  marginTop: spacing.xl,
  '&:hover': {
    backgroundColor: colors.accent.primary,
    opacity: opacity.soft,
  },
  '&.Mui-disabled': {
    backgroundColor: colors.interactive.hoverStrong,
    color: colors.text.disabled,
  },
});

const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    backgroundColor: colors.interactive.surface,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: fontSize.base,
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

export function AccountAddPanel({
  onComplete,
  onBack,
}: AccountAddPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [accountState, accountActions] = useAccountsContext();
  const { activeAccount, counter } = accountState;

  const [step, setStep] = useState<AccountAddStep>('select-method');
  const [derivedAccounts, setDerivedAccounts] = useState<DerivedAccountInfo[]>([]);
  const [selectedDerived, setSelectedDerived] = useState<DerivedAccountInfo | null>(null);
  const [scanning, setScanning] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [seedError, setSeedError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);

  const defaultName = useMemo(
    () => t('settings.account_add.default_name', { number: counter + 1 }),
    [counter, t],
  );
  const [accountName, setAccountName] = useState('');

  const handleSelectDerive = useCallback(async () => {
    if (!activeAccount?.mnemonic) return;
    setStep('derive-scan');
    setScanning(true);
    try {
      const scanNetworks = await getScanNetworks();
      const results = await scanDerivedAccounts(
        activeAccount.mnemonic,
        scanNetworks,
      );
      setDerivedAccounts(results);
    } catch {
      setDerivedAccounts([]);
    } finally {
      setScanning(false);
    }
  }, [activeAccount]);

  const handleSelectImport = useCallback(() => {
    setStep('import-seed');
  }, []);

  const handleDerivedSelect = useCallback((account: DerivedAccountInfo) => {
    setSelectedDerived(prev => prev?.address === account.address ? null : account);
  }, []);

  const handleDerivedContinue = useCallback(() => {
    if (!selectedDerived) return;
    setAccountName(defaultName);
    setStep('set-name');
  }, [selectedDerived, defaultName]);

  const handleSeedSubmit = useCallback(() => {
    const normalized = normalizeMnemonic(seedPhrase);
    if (!validateMnemonic(normalized)) {
      setSeedError(t('wallet.create.invalidSeed'));
      return;
    }
    setSeedError('');
    setSeedPhrase(normalized);
    setAccountName(defaultName);
    setStep('set-name');
  }, [seedPhrase, defaultName, t]);

  const handleConfirm = useCallback(async () => {
    const name = accountName.trim() || defaultName;
    setConfirmError('');
    setLoading(true);
    try {
      const mnemonic = selectedDerived ? (activeAccount?.mnemonic || '') : seedPhrase;
      const startIndex = selectedDerived ? selectedDerived.index : 0;
      const scanNetworks = await getScanNetworks();
      const { account } = await createAccount({
        name,
        mnemonic,
        networkIds: scanNetworks,
        startIndex,
      });
      await accountActions.addAccount(account);
      // Anonymous funnel event: an account was added from inside the app. A
      // derived account reuses the active seed (create); an imported seed is a
      // recovery. No seed, address or key material — just which flow completed.
      trackEvent(selectedDerived ? 'wallet_created' : 'wallet_recovered');
      onComplete();
    } catch (err) {
      setLoading(false);
      if (err instanceof EncryptionMaterialMissingError) {
        setConfirmError(t('settings.account_add.session_expired'));
        return;
      }
      setConfirmError(t('settings.account_add.creation_error'));
    }
  }, [accountName, defaultName, selectedDerived, activeAccount, seedPhrase, accountActions, onComplete, t]);

  const handleStepBack = useCallback(() => {
    if (step === 'set-name') {
      setStep(selectedDerived ? 'derive-scan' : 'import-seed');
    } else if (step === 'derive-scan' || step === 'import-seed') {
      setStep('select-method');
    } else {
      onBack();
    }
  }, [step, selectedDerived, onBack]);

  const stepTitles: Record<AccountAddStep, string> = {
    'select-method': t('settings.account_add.title'),
    'derive-scan': t('settings.account_add.create_new'),
    'import-seed': t('settings.account_add.import_seed'),
    'set-name': t('settings.account_add.set_name'),
    'complete': t('settings.account_add.title'),
  };

  return (
    <>
    <LoadingScreen
      visible={loading}
      title={selectedDerived
        ? t('settings.account_add.confirm_create')
        : t('settings.account_add.confirm_import')}
      subtitle={t('general.loading')}
    />
    <SettingsPanelContent title={stepTitles[step]} onBack={handleStepBack}>
      <Box sx={{ padding: `0 ${spacing.lg}px` }}>
        {step === 'select-method' && (
          <>
            <MethodCard onClick={handleSelectDerive} data-testid="account-add-method-derive">
              <MethodIcon>
                <AccountTreeIcon sx={{ color: colors.accent.primary, fontSize: fontSize.iconMd }} />
              </MethodIcon>
              <MethodInfo>
                <Typography sx={{ color: colors.text.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.base, marginBottom: spacing.xxs }}>
                  {t('settings.account_add.create_new')}
                </Typography>
                <Typography sx={{ color: colors.text.secondary, fontSize: fontSize.sm }}>
                  {t('settings.account_add.create_new_description')}
                </Typography>
              </MethodInfo>
              <ChevronRightIcon sx={{ color: colors.text.secondary }} />
            </MethodCard>

            <MethodCard onClick={handleSelectImport} data-testid="account-add-method-import">
              <MethodIcon>
                <DescriptionIcon sx={{ color: colors.accent.primary, fontSize: fontSize.iconMd }} />
              </MethodIcon>
              <MethodInfo>
                <Typography sx={{ color: colors.text.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.base, marginBottom: spacing.xxs }}>
                  {t('settings.account_add.import_seed')}
                </Typography>
                <Typography sx={{ color: colors.text.secondary, fontSize: fontSize.sm }}>
                  {t('settings.account_add.import_seed_description')}
                </Typography>
              </MethodInfo>
              <ChevronRightIcon sx={{ color: colors.text.secondary }} />
            </MethodCard>
          </>
        )}

        {step === 'derive-scan' && (
          <>
            {scanning ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${spacing['3xl']}px 0`, gap: spacing.md }}>
                <CircularProgress sx={{ color: colors.accent.primary }} />
                <Typography sx={{ color: colors.text.secondary, fontSize: fontSize.base }}>
                  {t('settings.account_add.scanning')}
                </Typography>
              </Box>
            ) : (
              <>
                {derivedAccounts.map((item) => (
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
                <ConfirmButton
                  fullWidth
                  variant="contained"
                  onClick={handleDerivedContinue}
                  disabled={!selectedDerived}
                  data-testid="account-add-derive-continue-button"
                >
                  {t('actions.continue')}
                </ConfirmButton>
              </>
            )}
          </>
        )}

        {step === 'import-seed' && (
          <>
            <StyledTextField
              fullWidth
              multiline
              minRows={4}
              value={seedPhrase}
              onChange={(e) => {
                setSeedPhrase(e.target.value);
                if (seedError) setSeedError('');
              }}
              placeholder={t('settings.account_add.seed_placeholder', 'Enter your seed phrase...')}
              autoFocus
              inputProps={{ 'data-testid': 'account-add-seed-input' }}
            />
            {seedError && (
              <Typography sx={{ color: colors.status.error, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                {seedError}
              </Typography>
            )}
            <ConfirmButton
              fullWidth
              variant="contained"
              onClick={handleSeedSubmit}
              data-testid="account-add-seed-continue-button"
            >
              {t('actions.continue')}
            </ConfirmButton>
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
              autoFocus
              inputProps={{ maxLength: 32, 'data-testid': 'account-add-name-input' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
            />
            {confirmError && (
              <Typography sx={{ color: colors.status.error, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                {confirmError}
              </Typography>
            )}
            <ConfirmButton
              fullWidth
              variant="contained"
              onClick={handleConfirm}
              data-testid="account-add-confirm-button"
            >
              {selectedDerived
                ? t('settings.account_add.confirm_create')
                : t('settings.account_add.confirm_import')}
            </ConfirmButton>
          </>
        )}
      </Box>
    </SettingsPanelContent>
    </>
  );
}
