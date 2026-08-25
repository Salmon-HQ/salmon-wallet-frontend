/**
 * CollectiblesPage - Multi-chain NFT collection display
 *
 * Fetches and displays NFTs across ALL blockchains in Netflix-style
 * carousel sections (matching mobile's multi-chain approach).
 * Each section has horizontal scrolling with arrow navigation.
 */
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  fontSize,
  borderRadius,
  fontFamily,
  canonicalNftToSolanaNftData,
  getNftSectionTitle,
  useSolanaNfts,
  type Account,
  type NftBlockchain,
  type NftData,
  type NftSectionKey,
  type NftSection,
} from '@salmon/shared';
import { NftCarouselSection, TextButton, WarningNotice, visuallyHidden } from '@/components';

// ============================================================================
// Props
// ============================================================================

interface CollectiblesPageProps {
  activeAccount: Account | undefined;
  developerNetworks: boolean;
  /** Callback when an NFT is pressed — navigates to detail page */
  onNftDetailPress?: (nft: NftData) => void;
  /** Callback when "See All" is pressed — navigates to see-all page */
  onSeeAllPress?: (data: { title: string; blockchain: NftBlockchain; nfts: NftData[] }) => void;
}

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  paddingTop: spacing.md,
  paddingBottom: spacing.lg,
  overflowY: 'auto',
  gap: spacing.lg,
});

const EmptyState = styled(Box)({
  padding: `${spacing.xl}px ${spacing.lg}px`,
  textAlign: 'center',
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.lg,
  marginLeft: spacing.lg,
  marginRight: spacing.lg,
});

const EmptyStateText = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: 500,
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  marginBottom: spacing.sm,
});

const EmptyStateSubtext = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.disabled,
  fontFamily: fontFamily.sans,
});

// ============================================================================
// Component
// ============================================================================

export function CollectiblesPage({
  activeAccount,
  developerNetworks,
  onNftDetailPress,
  onSeeAllPress,
}: CollectiblesPageProps) {
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
        networkLabel: t('general.network_devnet', 'Devnet'),
      } as NftSection,
    };
  }, [
    mainnetQuery.nfts,
    mainnetQuery.loading,
    devnetQuery.nfts,
    devnetQuery.loading,
    developerNetworks,
    t,
  ]);

  // Derived state (Solana only)
  const visibleKeys = useMemo<NftSectionKey[]>(
    () => (developerNetworks ? ['solana', 'solana-devnet'] : ['solana']),
    [developerNetworks]
  );

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

  // Handlers
  const handleNftPress = useCallback(
    (nft: NftData) => {
      onNftDetailPress?.(nft);
    },
    [onNftDetailPress]
  );

  const handleSeeAll = useCallback(
    (title: string, nfts: NftData[]) => {
      onSeeAllPress?.({ title, blockchain: 'solana', nfts });
    },
    [onSeeAllPress]
  );

  return (
    <Container>
      {/* Visually hidden: the tab bar carries the visible label, but screen
          reader users still need a heading to orient by. */}
      <Typography component="h1" sx={visuallyHidden}>
        {t('collectibles.title', 'Collectibles')}
      </Typography>

      {loadError && (
        <Box
          sx={{ paddingLeft: `${spacing.lg}px`, paddingRight: `${spacing.lg}px` }}
          data-testid="collectibles-load-error"
        >
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
        <Box
          sx={{ paddingLeft: `${spacing.lg}px`, paddingRight: `${spacing.lg}px` }}
          data-testid="collectibles-partial-load"
        >
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

      {/* Empty state */}
      {isEmpty && (
        <EmptyState data-testid="collectibles-empty">
          <EmptyStateText>{t('collectibles.empty', 'No collectibles found')}</EmptyStateText>
          <EmptyStateSubtext>
            {t('collectibles.empty_hint', 'Your NFTs and collectibles will appear here')}
          </EmptyStateSubtext>
        </EmptyState>
      )}

      {/* NFT sections — Solana only, shared carousel (mirrors web's CollectiblesTab) */}
      {renderedKeys.map((key) => {
        const section = nftsBySections[key];
        const title = getNftSectionTitle(key, section);

        return (
          <NftCarouselSection
            key={key}
            title={title}
            blockchain="solana"
            nfts={section.nfts}
            loading={section.loading}
            showChainLabel={showChainLabel}
            onNftPress={handleNftPress}
            onSeeAllPress={() => handleSeeAll(title, section.nfts)}
          />
        );
      })}
    </Container>
  );
}
