/**
 * ConversionRateDisplay - Displays the conversion rate for swap transactions
 *
 * Migrated from packages/ui (React Native) to MUI styled components.
 *
 * Shows the rate in format "1 SOL = 150.25 USDC" or compact "1:150.25" for small size.
 */

import React, { useMemo } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ArrowsLeftRightIcon, iconSize } from '../../icons';
import {
  colors,
  formatConversionRate,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  tabularNums,
} from '@salmon/shared';
import type { ConversionRateDisplayProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
});

const RateText = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.sm,
  color: colors.text.secondary,
  lineHeight: lineHeight.condensed,
});

const SymbolText = styled('span')({
  fontWeight: fontWeight.medium,
});

const CompactText = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.xs,
  color: colors.text.secondary,
  lineHeight: lineHeight.condensed,
});

// ============================================================================
// Component
// ============================================================================

export function ConversionRateDisplay({
  fromSymbol,
  toSymbol,
  rate,
  size = 'medium',
  className,
}: ConversionRateDisplayProps) {
  const formattedRate = useMemo(() => formatConversionRate(rate), [rate]);
  const isSmall = size === 'small';

  if (isSmall) {
    return (
      <Container className={className}>
        <ArrowsLeftRightIcon
          size={iconSize.sm}
          color={colors.text.secondary}
          style={{ marginRight: spacing.xs }}
        />
        <CompactText>1:{formattedRate}</CompactText>
      </Container>
    );
  }

  return (
    <Container className={className}>
      <ArrowsLeftRightIcon
        size={iconSize.sm}
        color={colors.text.secondary}
        style={{ marginRight: spacing.sm }}
      />
      <RateText>
        <SymbolText>1 {fromSymbol}</SymbolText>
        {' = '}
        {formattedRate} <SymbolText>{toSymbol}</SymbolText>
      </RateText>
    </Container>
  );
}
