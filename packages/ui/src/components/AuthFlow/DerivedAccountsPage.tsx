import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import {
  colors,
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
import { styled } from '../../utils/styled';
import { PrimaryButton, SecondaryButton } from '../Button';
import { DerivedAccountCard, DerivedAccountCardSkeleton } from '../DerivedAccountCard';
import { ScreenHeader } from '../ScreenHeader';
import { getAuthContainerStyles } from './common';
import type { DerivedAccountsPageProps } from './types';

const Container = styled(Box)<{ $contained?: boolean }>(({ $contained = false }) => ({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: colors.background.primary,
  ...getAuthContainerStyles($contained),
}));

const Content = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: `0 ${spacing['2xl']}px`,
});

const LogoImage = styled('img')({
  width: 48,
  height: 48,
  objectFit: 'contain',
  marginBottom: spacing.lg,
});

const Title = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontWeight: 700,
  fontSize: 24,
  lineHeight: '32px',
  marginBottom: spacing.sm,
  textAlign: 'center',
});

const Subtitle = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: 14,
  lineHeight: '20px',
  marginBottom: spacing['2xl'],
  textAlign: 'center',
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
});

const LoadingContainer = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  paddingTop: spacing['3xl'],
});

const LoadingText = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: 16,
  marginTop: spacing.lg,
  marginBottom: spacing['2xl'],
});

const EmptyContainer = styled(Box)({
  flex: 1,
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
  flex: 1,
  width: '100%',
  overflowY: 'auto',
});

const FoundText = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: 14,
  marginBottom: spacing.lg,
  textAlign: 'center',
});

const ButtonContainer = styled(Box)({
  width: '100%',
  paddingTop: spacing.lg,
  paddingBottom: spacing['2xl'],
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
});

export function DerivedAccountsPage({
  onComplete,
  contained = false,
}: DerivedAccountsPageProps): React.ReactElement {
  const [{ activeAccount }, actions] = useAccountsContext();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [accounts, setAccounts] = useState<DerivedAccountInfo[]>([]);

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
        scanNetworks.includes(id),
      );

      const results = await scanDerivedAccounts(
        mnemonic,
        networkIds,
        undefined,
        () => cancelled,
      );

      if (!cancelled) {
        setAccounts(results);
        setLoading(false);
      }
    };

    void searchDerivedAccounts();
    return () => {
      cancelled = true;
    };
  }, [activeAccount, mnemonic]);

  const handleToggleAccount = useCallback((key: string) => {
    setAccounts((prev) =>
      prev.map((account) =>
        `${account.networkId}-${account.index}` === key
          ? { ...account, selected: !account.selected }
          : account,
      ),
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
              account.index,
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
          <LoadingText>Searching for accounts...</LoadingText>
          <Box sx={{ width: '100%' }}>
            <DerivedAccountCardSkeleton />
            <DerivedAccountCardSkeleton />
            <DerivedAccountCardSkeleton />
          </Box>
        </LoadingContainer>
      );
    }

    if (accounts.length === 0) {
      return (
        <EmptyContainer>
          <EmptyTitle>No Derived Accounts Found</EmptyTitle>
          <EmptySubtitle>
            Could not derive additional accounts from your seed phrase.
          </EmptySubtitle>
        </EmptyContainer>
      );
    }

    return (
      <AccountsContainer>
        <FoundText>
          Found {accounts.length} derived account{accounts.length !== 1 ? 's' : ''}
        </FoundText>
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
              blockchain={NETWORK_DISPLAY[account.networkId]?.blockchain as 'solana' | 'bitcoin' | 'ethereum'}
              onToggle={() => handleToggleAccount(key)}
            />
          );
        })}
      </AccountsContainer>
    );
  };

  return (
    <Container $contained={contained}>
      <ScreenHeader />
      <Content>
        <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />
        <Title>Derived Accounts</Title>
        <Subtitle>
          Search for additional accounts derived from your seed phrase.
        </Subtitle>

        {renderContent()}

        <ButtonContainer>
          {accounts.length > 0 && (
            <PrimaryButton
              onClick={handleImport}
              disabled={loading || importing}
              loading={importing}
              testID="derived-import-button"
            >
              {`IMPORT SELECTED (${selectedCount})`}
            </PrimaryButton>
          )}
          <SecondaryButton onClick={handleSkip} disabled={importing} testID="derived-skip-button">
            {accounts.length === 0 ? 'CONTINUE' : 'SKIP'}
          </SecondaryButton>
        </ButtonContainer>
      </Content>
    </Container>
  );
}
