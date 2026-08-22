/**
 * NftSeeAllPage - Full-page grid view of all NFTs for a blockchain section
 *
 * Replaces the former NftSeeAllSheet dialog.
 * Renders as a full page with back navigation, matching the
 * page-navigation pattern used by TokenDetailPage and NftDetailPage.
 */

import React from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';

import { spacing } from '@salmon/shared';

import { PageShell } from '../PageShell';
import { NftCard } from '../NftCard';
import type { NftSeeAllPageProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const Grid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: spacing.md,
  justifyItems: 'center',
  padding: spacing.lg,
});

// ============================================================================
// Component
// ============================================================================

export function NftSeeAllPage({
  title,
  nfts,
  onNftPress,
  onBack,
  style,
  className,
}: NftSeeAllPageProps): React.ReactElement {
  return (
    <PageShell title={title} onBack={onBack} style={style} className={className}>
      <Grid>
        {nfts.map((nft, index) => (
          <NftCard
            key={`${nft.mint}-${index}`}
            nft={nft}
            onPress={onNftPress ? () => onNftPress(nft) : undefined}
          />
        ))}
      </Grid>
    </PageShell>
  );
}
