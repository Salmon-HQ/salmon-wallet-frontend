import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '@salmon/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  fontFamily,
  canonicalNftToSolanaNftData,
  getNftSectionTitle,
  useSolanaNfts,
  type Account,
  type NftData,
  type NftSectionKey,
  type NftSection,
} from '@salmon/shared';
import { NftCarouselSection, TextButton, WarningNotice, visuallyHidden } from '@salmon/ui';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CollectiblesTabProps {
  activeAccount: Account | undefined;
  developerNetworks: boolean;
  onNftDetailPress?: (nft: NftData) => void;
  onSeeAllPress?: (data: { title: string; blockchain: string; nfts: NftData[] }) => void;
}

// ---------------------------------------------------------------------------
// Styled
// ---------------------------------------------------------------------------

const ScrollContainer = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: `${spacing.lg}px`,
});

const EmptyState = styled(Box)({
  padding: `${spacing['2xl']}px ${spacing.lg}px`,
  textAlign: 'center',
});

const EmptyStateText = styled(Typography)({
  fontSize: 14,
  fontWeight: 500,
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CollectiblesTab({
  activeAccount,
  developerNetworks,
  onNftDetailPress,
  onSeeAllPress,
}: CollectiblesTabProps): React.ReactElement {
  const { t } = useTranslation();

  // Resolve owner addresses per section
  const solanaMainnetAddress =
    activeAccount?.networksAccounts?.['solana-mainnet']?.[0]?.getReceiveAddress();
  const solanaDevnetAddress =
    activeAccount?.networksAccounts?.['solana-devnet']?.[0]?.getReceiveAddress();
  const includeSpam = !!developerNetworks;

  const mainnetQuery = useSolanaNfts({
    publicKey: solanaMainnetAddress,
    networkId: 'solana-mainnet',
    includeSpam,
  });
  const devnetQuery = useSolanaNfts({
    publicKey: solanaDevnetAddress,
    networkId: 'solana-devnet',
    includeSpam,
    enabled: developerNetworks,
  });

  // Build sections from queries
  const nftsBySections = useMemo<Record<NftSectionKey, NftSection>>(() => {
    return {
      solana: {
        nfts: mainnetQuery.nfts.map((nft) => canonicalNftToSolanaNftData(nft)) as NftData[],
        loading: mainnetQuery.loading,
        blockchain: 'solana',
        isTestnet: false,
      } as NftSection,
      'solana-devnet': {
        nfts: developerNetworks
          ? (devnetQuery.nfts.map((nft) => canonicalNftToSolanaNftData(nft)) as NftData[])
          : [],
        loading: developerNetworks ? devnetQuery.loading : false,
        blockchain: 'solana',
        isTestnet: true,
        networkLabel: 'Devnet',
      } as NftSection,
    };
  }, [
    mainnetQuery.nfts,
    mainnetQuery.loading,
    devnetQuery.nfts,
    devnetQuery.loading,
    developerNetworks,
  ]);

  // Visible section keys
  const visibleKeys = useMemo(() => {
    const keys: NftSectionKey[] = ['solana'];
    if (developerNetworks) keys.push('solana-devnet');
    return keys;
  }, [developerNetworks]);

  // Sections that actually render. Mainnet and devnet count as distinct
  // chains: same base chain, different networks and different assets.
  const renderedKeys = useMemo(
    () =>
      visibleKeys.filter(
        (key) => nftsBySections[key].loading || nftsBySections[key].nfts.length > 0
      ),
    [visibleKeys, nftsBySections]
  );
  const showChainLabel = renderedKeys.length > 1;

  const isLoading = visibleKeys.some((key) => nftsBySections[key].loading);
  const loadError =
    mainnetQuery.error !== null || (developerNetworks && devnetQuery.error !== null);
  // Some pages arrived and a later one did not. The list renders, but it is
  // short, and saying so is the difference between resilient and quietly wrong.
  const partialLoad = mainnetQuery.partial || (developerNetworks && devnetQuery.partial);
  // A failed load is not "you have no collectibles" — the error state owns it.
  const isEmpty =
    !isLoading && !loadError && visibleKeys.every((key) => nftsBySections[key].nfts.length === 0);

  const handleRetry = useCallback(() => {
    void mainnetQuery.refresh();
    if (developerNetworks) void devnetQuery.refresh();
  }, [mainnetQuery, devnetQuery, developerNetworks]);

  const handleNftPress = useCallback(
    (nft: NftData) => {
      onNftDetailPress?.(nft);
    },
    [onNftDetailPress]
  );

  const handleSeeAll = useCallback(
    (_key: NftSectionKey, title: string, nfts: NftData[]) => {
      onSeeAllPress?.({ title, blockchain: 'solana', nfts });
    },
    [onSeeAllPress]
  );

  return (
    <ScrollContainer>
      {/* Visually hidden: the tab bar carries the visible label, but screen
          reader users still need a heading to orient by. */}
      <Typography component="h1" sx={visuallyHidden}>
        {t('collectibles.title', 'Collectibles')}
      </Typography>

      {loadError && (
        <Box sx={{ marginBottom: `${spacing.md}px` }} data-testid="collectibles-load-error">
          <WarningNotice
            tone="warning"
            title={t('collectibles.load_error', "Your collectibles couldn't be loaded right now.")}
            action={
              <TextButton onClick={handleRetry} testID="collectibles-retry-button">
                {t('actions.retry', 'Retry')}
              </TextButton>
            }
          />
        </Box>
      )}
      {/* A short list, not a failed one: the grid below is real, it is just
          missing whatever the failed page held. */}
      {!loadError && partialLoad && (
        <Box sx={{ marginBottom: `${spacing.md}px` }} data-testid="collectibles-partial-load">
          <WarningNotice
            tone="warning"
            title={t(
              'collectibles.partial_error',
              'Some of your collectibles could not be loaded. Pull to refresh to try again.'
            )}
            action={
              <TextButton onClick={handleRetry} testID="collectibles-partial-retry-button">
                {t('actions.retry', 'Retry')}
              </TextButton>
            }
          />
        </Box>
      )}

      {isEmpty && (
        <EmptyState data-testid="collectibles-empty">
          <EmptyStateText>{t('collectibles.no_nfts', 'No collectibles found')}</EmptyStateText>
        </EmptyState>
      )}

      {renderedKeys.map((key) => {
        const section = nftsBySections[key];
        const title = getNftSectionTitle(key, section as NftSection);

        return (
          <NftCarouselSection
            key={key}
            title={title}
            blockchain="solana"
            nfts={section.nfts}
            loading={section.loading}
            showChainLabel={showChainLabel}
            onNftPress={handleNftPress}
            onSeeAllPress={() => handleSeeAll(key, title, section.nfts)}
          />
        );
      })}
    </ScrollContainer>
  );
}
