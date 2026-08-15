/**
 * NftCarouselSection - NFT grid section for a single blockchain
 *
 * Displays NFTs in a responsive 2-column grid layout.
 */
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  fontFamily,
  type NftBlockchain,
  fontSize,
  fontWeight,
  componentSizes,
} from '@salmon/shared';
import { NftCard } from '../NftCard';
import { SolanaSvgIcon, BitcoinSvgIcon } from '../Icon';
import { NftCarouselSectionSkeleton } from './NftCarouselSectionSkeleton';
import type { NftCarouselSectionProps } from './types';

// ============================================================================
// Constants
// ============================================================================

const CARD_GAP = componentSizes.nftCardGap;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
});

const HeaderRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
});

const Title = styled('h2')({
  margin: 0,
  fontSize: fontSize.md,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  flex: 1,
  textAlign: 'left',
});

const Count = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
});

const Grid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: CARD_GAP,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
});

// ============================================================================
// Helpers
// ============================================================================

function getBlockchainIcon(blockchain: NftBlockchain) {
  switch (blockchain) {
    case 'solana':
      return (
        <SolanaSvgIcon
          sx={{
            width: componentSizes.iconSizeMedium,
            height: componentSizes.iconSizeMedium,
            color: colors.text.primary,
          }}
        />
      );
    case 'bitcoin':
      return (
        <BitcoinSvgIcon
          sx={{ width: componentSizes.iconSizeMedium, height: componentSizes.iconSizeMedium }}
        />
      );
  }
}

// ============================================================================
// Component
// ============================================================================

export function NftCarouselSection({
  title,
  blockchain,
  nfts,
  loading,
  showChainLabel = true,
  onNftPress,
  style,
  className,
}: NftCarouselSectionProps) {
  if (loading) {
    return <NftCarouselSectionSkeleton style={style} className={className} />;
  }

  if (nfts.length === 0) return null;

  return (
    <Container style={style} className={className}>
      {/* Header — only when the chain label distinguishes something */}
      {showChainLabel && (
        <HeaderRow>
          {getBlockchainIcon(blockchain)}
          <Title>{title}</Title>
          <Count>({nfts.length})</Count>
        </HeaderRow>
      )}

      {/* Grid */}
      <Grid>
        {nfts.map((nft, index) => (
          <NftCard
            key={`${nft.mint}-${index}`}
            nft={nft}
            onPress={onNftPress ? () => onNftPress(nft) : undefined}
          />
        ))}
      </Grid>
    </Container>
  );
}
