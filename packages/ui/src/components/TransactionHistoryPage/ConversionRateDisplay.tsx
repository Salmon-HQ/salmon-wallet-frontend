/**
 * ConversionRateDisplay — the rate of a swap, on the DOM.
 *
 * The mobile twin is
 * `apps/mobile/src/components/Activity/ConversionRateDisplay.tsx`: the full
 * "1 SOL = 150.25 USDC", or the compact "1:150.25" at the small size.
 */
import React, { useMemo } from 'react';
import { fontFamily, fontSize, fontWeight, formatConversionRate, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { ArrowsLeftRightIcon } from '../../icons';
import type { ConversionRateDisplayProps } from './types';

export function ConversionRateDisplay({
  fromSymbol,
  toSymbol,
  rate,
  size = 'medium',
  className,
  style,
}: ConversionRateDisplayProps) {
  const { text } = useSemantic();
  const formattedRate = useMemo(() => formatConversionRate(rate), [rate]);
  const isSmall = size === 'small';

  return (
    <span
      data-testid="conversion-rate"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        fontFamily: fontFamily.sans,
        fontSize: isSmall ? fontSize.micro : fontSize.caption,
        color: text.secondary,
        ...style,
      }}
    >
      <ArrowsLeftRightIcon size={isSmall ? 12 : 14} color={text.secondary} />
      {isSmall ? (
        <span>1:{formattedRate}</span>
      ) : (
        <span>
          <span style={{ fontWeight: fontWeight.medium }}>1 {fromSymbol}</span>
          <span> = </span>
          <span>{formattedRate} </span>
          <span style={{ fontWeight: fontWeight.medium }}>{toSymbol}</span>
        </span>
      )}
    </span>
  );
}
