import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import {
  colors,
  componentSizes,
  deriveBlockchainAccount,
  fetchAndMergeNetworkConfigs,
  fontFamily,
  getMirrorNetworkId,
  getScanNetworks,
  getShortAddress,
  NETWORK_DISPLAY,
  scanDerivedAccounts,
  spacing,
  type BlockchainAccount,
  type DerivedAccountInfo,
  useAccountsContext,
} from '@salmon/shared';
import { TreeStructureIcon } from '../../icons';
import { styled } from '../../utils/styled';
import { PrimaryButton, SecondaryButton } from '../Button';
import { DerivedAccountCard, DerivedAccountCardSkeleton } from '../DerivedAccountCard';
import { WarningNotice } from '../WarningNotice';
import { ScreenHeader } from '../ScreenHeader';
import {
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  ReservedSlot,
} from '../OnboardingLayout';
import { WaterColumn } from '../WaterColumn';
import type { DerivedAccountsPageProps } from './types';

const LoadingContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
});

const LoadingText = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: 16,
  marginTop: spacing.lg,
  marginBottom: spacing['2xl'],
});

const EmptyContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

const EmptyTitle = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: 16,
  marginTop: spacing.lg,
  textAlign: 'center',
});

const EmptySubtitle = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: 14,
  marginTop: spacing.sm,
  textAlign: 'center',
  paddingLeft: spacing['2xl'],
  paddingRight: spacing['2xl'],
});

const AccountsContainer = styled(Box)({
  width: '100%',
});

const FoundText = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: 14,
  marginBottom: spacing.lg,
  textAlign: 'center',
});

export function DerivedAccountsPage({ onComplete }: DerivedAccountsPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [{ activeAccount }, actions] = useAccountsContext();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [accounts, setAccounts] = useState<DerivedAccountInfo[]>([]);
  // Networks whose scan threw (RPC outage etc.), so an outage is
  // distinguishable from "no accounts".
  const [failedNetworks, setFailedNetworks] = useState<string[]>([]);
  const [scanToken, setScanToken] = useState(0);

  const mnemonic = activeAccount?.mnemonic;

  useEffect(() => {
    let cancelled = false;

    const searchDerivedAccounts = async () => {
      if (!mnemonic || !activeAccount) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await fetchAndMergeNetworkConfigs();
      if (cancelled) return;

      const scanNetworks = await getScanNetworks();
      if (cancelled) return;

      const networkIds = Object.keys(activeAccount.networksAccounts).filter((id) =>
        scanNetworks.includes(id)
      );

      const { accounts: results, failedNetworks } = await scanDerivedAccounts(
        mnemonic,
        networkIds,
        undefined,
        () => cancelled
      );

      if (!cancelled) {
        setAccounts(results);
        setFailedNetworks(failedNetworks);
        setLoading(false);
      }
    };

    void searchDerivedAccounts();
    return () => {
      cancelled = true;
    };
  }, [activeAccount, mnemonic, scanToken]);

  /** Re-runs the scan after a total failure. */
  const handleRetryScan = useCallback(() => {
    setFailedNetworks([]);
    setScanToken((token) => token + 1);
  }, []);

  const handleToggleAccount = useCallback((key: string) => {
    setAccounts((prev) =>
      prev.map((account) =>
        `${account.networkId}-${account.index}` === key
          ? { ...account, selected: !account.selected }
          : account
      )
    );
  }, []);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleImport = useCallback(async () => {
    if (!activeAccount || !mnemonic) return;

    const selectedAccounts = accounts.filter((account) => account.selected);
    if (selectedAccounts.length === 0) {
      handleSkip();
      return;
    }

    setImporting(true);

    try {
      const newDerivedAccounts: BlockchainAccount[] = [];

      for (const account of selectedAccounts) {
        newDerivedAccounts.push(account.account);

        const mirrorNetworkId = await getMirrorNetworkId(account.networkId);
        if (mirrorNetworkId && activeAccount.networksAccounts[mirrorNetworkId]) {
          try {
            const mirrorAccount = await deriveBlockchainAccount(
              mnemonic,
              mirrorNetworkId,
              account.index
            );
            newDerivedAccounts.push(mirrorAccount);
          } catch {
            // Mirror derivation failed
          }
        }
      }

      await actions.editAccount(activeAccount.id, { newDerivedAccounts });
      onComplete();
    } catch (error) {
      console.error('Failed to import derived accounts:', error);
      onComplete();
    } finally {
      setImporting(false);
    }
  }, [accounts, actions, activeAccount, handleSkip, mnemonic, onComplete]);

  const selectedCount = accounts.filter((account) => account.selected).length;

  const renderContent = () => {
    if (loading) {
      return (
        <LoadingContainer>
          <CircularProgress sx={{ color: colors.accent.primary }} />
          <LoadingText>{t('wallet.derived.searching')}</LoadingText>
          <Box sx={{ width: '100%' }}>
            <DerivedAccountCardSkeleton />
            <DerivedAccountCardSkeleton />
            <DerivedAccountCardSkeleton />
          </Box>
        </LoadingContainer>
      );
    }

    if (accounts.length === 0) {
      // A scan that could not look must not present as an empty wallet.
      if (failedNetworks.length > 0) {
        return (
          <EmptyContainer data-testid="derived-scan-error">
            <EmptyTitle>{t('wallet.derived.scan_failed_title')}</EmptyTitle>
            <EmptySubtitle>{t('wallet.derived.scan_failed_body')}</EmptySubtitle>
            <SecondaryButton onClick={handleRetryScan} testID="derived-scan-retry-button">
              {t('transactions.tapToRetry')}
            </SecondaryButton>
          </EmptyContainer>
        );
      }
      return (
        <EmptyContainer>
          <EmptyTitle>{t('wallet.derived.empty_title')}</EmptyTitle>
          <EmptySubtitle>{t('wallet.derived.empty_subtitle')}</EmptySubtitle>
        </EmptyContainer>
      );
    }

    return (
      <AccountsContainer>
        {failedNetworks.length > 0 && (
          <Box sx={{ marginBottom: `${spacing.md}px` }}>
            <WarningNotice tone="warning" title={t('wallet.derived.scan_partial')} />
          </Box>
        )}
        <FoundText>{t('wallet.derived.found', { count: accounts.length })}</FoundText>
        {accounts.map((account) => {
          const key = `${account.networkId}-${account.index}`;
          return (
            <DerivedAccountCard
              key={key}
              testID={`derived-account-${key}`}
              address={getShortAddress(account.address, 6) ?? account.address}
              networkName={account.networkName}
              path={account.path}
              balanceFormatted={account.balanceFormatted}
              selected={account.selected}
              dimmed={account.balance === 0}
              blockchain={
                NETWORK_DISPLAY[account.networkId]?.blockchain as 'solana' | 'bitcoin' | 'ethereum'
              }
              onToggle={() => handleToggleAccount(key)}
            />
          );
        })}
      </AccountsContainer>
    );
  };

  return (
    <OnboardingLayout
      testID="derived-accounts-screen"
      variant="content"
      background={<WaterColumn />}
      scrollBody
      // The derivation tree: one key, many branches — which is what this
      // screen scans. Mirrors mobile; the fish stays on welcome and the lock.
      mark={<TreeStructureIcon size={componentSizes.logoSizeSmall} color={colors.text.primary} />}
      chrome={<ScreenHeader />}
      title={<OnboardingTitle>{t('wallet.derived.title')}</OnboardingTitle>}
      description={<OnboardingDescription>{t('wallet.derived.subtitle')}</OnboardingDescription>}
      body={renderContent()}
      secondary={
        <SecondaryButton
          onClick={handleSkip}
          disabled={importing}
          fullWidth
          testID="derived-skip-button"
        >
          {accounts.length === 0 ? t('wallet.derived.continue') : t('wallet.derived.skip')}
        </SecondaryButton>
      }
      action={
        // The scan is asynchronous, so this control used to appear after first
        // paint and shove everything up 68px with no user input at all. It
        // holds its reserved band from the first frame now.
        <ReservedSlot visible={accounts.length > 0}>
          <PrimaryButton
            onClick={handleImport}
            disabled={loading || importing}
            loading={importing}
            fullWidth
            testID="derived-import-button"
          >
            {t('wallet.derived.import_selected', { count: selectedCount })}
          </PrimaryButton>
        </ReservedSlot>
      }
    />
  );
}
