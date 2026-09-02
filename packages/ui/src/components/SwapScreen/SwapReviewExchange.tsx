/**
 * SwapReviewExchange - the single graphic block on the swap review screen:
 * sent token logo, arrow, received token logo, with amounts
 * and USD values underneath. Replaces the two stacked You Send / You Receive
 * cards.
 *
 * Web version using MUI and @emotion/styled for web and browser extension.
 */
import React, { useState } from 'react';
import { styled } from '../../utils/styled';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  borderRadius,
  fontFamily,
  fontWeight,
  fontSize,
  letterSpacing,
  lineHeight,
  tabularNums,
} from '@salmon/shared';
import type { SwapReviewExchangeSide } from '@salmon/shared';
import { ArrowRightIcon, iconSize } from '../../icons';
import { BlurContainer } from '../BlurContainer';
import { PendingValue } from '../PendingValue';
import type { SwapReviewExchangeProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const LOGO_SIZE = 40;

const Row = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
  padding: `${spacing.base}px ${spacing.base}px`,
});

const Side = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: spacing.xs,
  minWidth: 0,
});

const Label = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.wider,
  textAlign: 'center',
});

const Amount = styled(Typography)<{ $emphasis?: boolean }>(({ $emphasis }) => ({
  ...tabularNums.css,
  // The received amount on a success receipt outranks the sent one — one
  // step up in size, same tabular digits.
  fontSize: $emphasis ? fontSize.xl : fontSize.lg,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  letterSpacing: letterSpacing.snug,
  lineHeight: `${($emphasis ? fontSize.xl : fontSize.lg) * lineHeight.tight}px`,
  textAlign: 'center',
}));

const UsdValue = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  letterSpacing: letterSpacing.slight,
  lineHeight: `${fontSize.sm * lineHeight.tokenListItem}px`,
  textAlign: 'center',
});

const LogoImg = styled('img')({
  width: LOGO_SIZE,
  height: LOGO_SIZE,
  borderRadius: '50%',
  backgroundColor: colors.background.tertiary,
  objectFit: 'cover',
});

const LogoFallback = styled('div')({
  width: LOGO_SIZE,
  height: LOGO_SIZE,
  borderRadius: '50%',
  backgroundColor: colors.background.tertiary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: LOGO_SIZE * 0.32,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
});

// ============================================================================
// Sub-components
// ============================================================================

/** Token logo with symbol-initials fallback (same pattern as mobile TokenLogo). */
function TokenLogo({ uri, symbol }: { uri?: string; symbol: string }): React.ReactElement {
  const [error, setError] = useState(false);

  if (!uri || error) {
    return (
      <LogoFallback data-testid="swap-review-exchange-logo">
        {symbol ? symbol.slice(0, 3).toUpperCase() : '?'}
      </LogoFallback>
    );
  }

  return (
    <LogoImg
      src={uri}
      alt=""
      data-testid="swap-review-exchange-logo"
      onError={() => setError(true)}
    />
  );
}

/**
 * One half of the exchange graphic: microcopy label, token logo, amount in
 * the token, USD value underneath.
 */
function ExchangeSide({
  label,
  logo,
  symbol,
  amount,
  usdValue,
  pendingAmount = false,
  pendingUsdValue = false,
  emphasis = false,
}: SwapReviewExchangeSide): React.ReactElement {
  return (
    <Side>
      <Label>{label}</Label>
      <TokenLogo uri={logo} symbol={symbol} />
      <Amount $emphasis={emphasis}>
        <PendingValue pending={pendingAmount}>{amount}</PendingValue>
      </Amount>
      {usdValue != null && (
        <UsdValue>
          <PendingValue pending={pendingUsdValue}>{usdValue}</PendingValue>
        </UsdValue>
      )}
    </Side>
  );
}

// ============================================================================
// SwapReviewExchange Component
// ============================================================================

export function SwapReviewExchange({
  send,
  receive,
  style,
}: SwapReviewExchangeProps): React.ReactElement {
  return (
    <BlurContainer
      style={{
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        ...style,
      }}
    >
      <Row data-testid="swap-review-exchange">
        <ExchangeSide {...send} />
        <ArrowRightIcon size={iconSize.md} color={colors.text.secondary} />
        <ExchangeSide {...receive} />
      </Row>
    </BlurContainer>
  );
}
