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
  componentSizes,
  canonicalNftToSolanaNftData,
  getNftSectionTitle,
  useSolanaNfts,
  type Account,
  type NftData,
  type NftSectionKey,
  type NftSection,
  tabularNums,
} from '@salmon/shared';
import {
  // NftCarouselSection,
  // NftCarouselSectionSkeleton,
  NftCard,
  NftCardSkeleton,
  SolanaSvgIcon,
  WarningNotice,
  visuallyHidden,
} from '@/components';

// ============================================================================
// Props
// ============================================================================

interface CollectiblesPageProps {
  activeAccount: Account | undefined;
  developerNetworks: boolean;
  /** Callback when an NFT is pressed — navigates to detail page */
  onNftDetailPress?: (nft: NftData) => void;
  // /** Callback when "See All" is pressed — navigates to see-all page */
  // onSeeAllPress?: (title: string, blockchain: string, nfts: NftData[]) => void;
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

const SectionHeaderRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
});

const SectionTitleText = styled('h2')({
  margin: 0,
  fontSize: fontSize.md,
  fontWeight: 600,
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  flex: 1,
});

const SectionCount = styled(Typography)({
  ...tabularNums.css,
  fontSize: 13,
  fontWeight: 500,
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
});

const Grid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: spacing.md,
  justifyItems: 'center',
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
});

const SkeletonGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: spacing.md,
  justifyItems: 'center',
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
});

// ============================================================================
// Component
// ============================================================================

export function CollectiblesPage({
  activeAccount,
  developerNetworks,
  onNftDetailPress,
  /* , onSeeAllPress */
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

  const isEmpty = !isLoading && visibleKeys.every((key) => nftsBySections[key].nfts.length === 0);

  const loadError =
    mainnetQuery.error !== null || (developerNetworks && devnetQuery.error !== null);

  // Handlers
  const handleNftPress = useCallback(
    (nft: NftData) => {
      onNftDetailPress?.(nft);
    },
    [onNftDetailPress]
  );

  // const handleSeeAllPress = useCallback((sectionKey: NftSectionKey) => {
  //   const section = nftsBySections[sectionKey];
  //   const title = getNftSectionTitle(sectionKey, section);
  //   onSeeAllPress?.(title, section.blockchain, section.nfts);
  // }, [nftsBySections, onSeeAllPress]);

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

      {/* NFT sections — Solana only, grid layout */}
      {renderedKeys.map((key) => {
        const section = nftsBySections[key];
        return (
          <Box key={key} sx={{ display: 'flex', flexDirection: 'column', gap: `${spacing.md}px` }}>
            {/* Section header — only when the chain label distinguishes something */}
            {showChainLabel && (
              <SectionHeaderRow>
                <SolanaSvgIcon
                  sx={{
                    width: componentSizes.iconSizeMedium,
                    height: componentSizes.iconSizeMedium,
                    color: colors.text.primary,
                  }}
                />
                <SectionTitleText>{getNftSectionTitle(key, section)}</SectionTitleText>
                <SectionCount>({section.nfts.length})</SectionCount>
              </SectionHeaderRow>
            )}

            {/* Grid or Skeleton */}
            {section.loading ? (
              <SkeletonGrid>
                {Array.from({ length: 6 }).map((_, i) => (
                  <NftCardSkeleton key={i} />
                ))}
              </SkeletonGrid>
            ) : (
              <Grid>
                {section.nfts.map((nft, index) => (
                  <NftCard
                    key={`${nft.mint}-${index}`}
                    nft={nft}
                    onPress={handleNftPress ? () => handleNftPress(nft) : undefined}
                  />
                ))}
              </Grid>
            )}
          </Box>
        );
      })}

      {/* Original carousel rendering (commented out):
      {visibleKeys.map((key) => {
        const section = nftsBySections[key];
        if (section.nfts.length === 0 && !section.loading) return null;
        return (
          <NftCarouselSection
            key={key}
            title={getNftSectionTitle(key, section)}
            blockchain={section.blockchain}
            nfts={section.nfts}
            loading={section.loading}
            onNftPress={handleNftPress}
            onSeeAllPress={() => handleSeeAllPress(key)}
          />
        );
      })}
      */}
    </Container>
  );
}
