/**
 * TokenListItem — one token's row, on the kit, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/TokenList/TokenListItem.tsx`
 * and the anatomy is the same: a `ListRow` with the 44 logo as its leading
 * mark, the token's name as the title, one secondary line — "SOL · $101.39 ·
 * -1.1%" — under it, and the amount over the fiat value in the trailing slot.
 *
 * The secondary line is one text run that ellipsises at its end, like
 * mobile's single `numberOfLines={1}` Text — a narrow panel reads "SOL ·
 * $101.…", never a ticker clipped mid-glyph.
 *
 * Bitcoin shows only the amount, not a fiat line beside it.
 */
import React, { useCallback } from 'react';
import {
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  formatLargeNumber,
  formatTokenAmount,
  getLabelValue,
  hiddenValue,
  showPercentage,
  spacing,
  useCurrencyContext,
  type Semantic,
} from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { ListRow } from '../ListRow';
import { TokenLogo } from './TokenLogo';
import type { TokenListItemProps } from './types';

/** The card's own logo size — pinned by the redesign, not the legacy token. */
const TOKEN_LOGO_SIZE = 44;

/** Card → card is a sibling-component seam: the component gap (20). */
export const TOKEN_ROW_GAP = spacing.screenGutter;

export function TokenListItem({
  token,
  onPress,
  hiddenBalance = false,
  blockchain = 'solana',
  style,
  className,
}: TokenListItemProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [, { formatValue }] = useCurrencyContext();
  const { name, symbol, logo, price, uiAmount, usdBalance, last24HoursChange } = token;

  const handlePress = useCallback(() => onPress?.(token), [onPress, token]);

  const percentageChange = last24HoursChange?.perc ?? 0;
  const changeColor = semantic.change[getLabelValue(percentageChange)];

  const displayPrice = hiddenBalance ? hiddenValue : price != null ? formatValue(price) : null;
  const displayPercentage = last24HoursChange ? showPercentage(percentageChange) : null;
  const displayUsdValue = hiddenBalance
    ? hiddenValue
    : usdBalance != null
      ? formatValue(usdBalance)
      : null;

  // A holding of 28,896.26376 BONK printed in full pushes the ticker off the
  // row. `formatLargeNumber` is the repo's compact renderer: K/M/B above a
  // thousand, full precision below it, so a dust balance still reads digit for
  // digit.
  const numericAmount = typeof uiAmount === 'string' ? parseFloat(uiAmount) : uiAmount;
  const compactAmount = Number.isFinite(numericAmount)
    ? formatLargeNumber(numericAmount as number)
    : formatTokenAmount(uiAmount);
  const displayTokenAmount = hiddenBalance ? hiddenValue : `${compactAmount} ${symbol || ''}`;

  // What the screen reader is told, masked exactly like the pixels are.
  const spokenAmount = hiddenBalance ? hiddenValue : uiAmount;
  const spokenPrice = hiddenBalance ? hiddenValue : price;

  const hasTail = !!displayPrice || !!displayPercentage;
  const tickerSegment = symbol ? (hasTail ? `${symbol} · ` : symbol) : null;
  const changeSegment = displayPercentage
    ? displayPrice
      ? ` · ${displayPercentage}`
      : displayPercentage
    : null;

  // One text run, ellipsised at its end — as mobile's single-line Text. Three
  // flex segments with the ticker as the shrinkable one rendered "S$104.48"
  // at the side panel's 400: the ticker was clipped mid-glyph and the
  // separator vanished before the name column gave up anything.
  const subline = (tickerSegment || displayPrice || changeSegment) && (
    <span
      data-testid={`token-row-subline-${symbol}`}
      style={{
        ...sublineStyle(semantic),
        display: 'block',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {tickerSegment}
      {displayPrice}
      {!!changeSegment && (
        <span style={{ fontWeight: fontWeight.semibold, color: changeColor }}>{changeSegment}</span>
      )}
    </span>
  );

  const amountLine = (
    <span
      style={{
        fontFamily: fontFamily.sans,
        fontWeight: fontWeight.bold,
        fontSize: fontSize.bodyLg,
        color: semantic.text.primary,
        whiteSpace: 'nowrap',
      }}
    >
      {displayTokenAmount}
    </span>
  );

  const isBitcoin = blockchain === 'bitcoin';

  return (
    <ListRow
      testID={`token-row-${symbol}`}
      padding="lg"
      emphasis="strong"
      leading={
        <TokenLogo
          uri={logo}
          symbol={symbol}
          size={TOKEN_LOGO_SIZE}
          borderRadius={borderRadius.tokenIcon}
        />
      }
      title={name}
      subtitle={subline || undefined}
      trailing={
        isBitcoin ? (
          amountLine
        ) : (
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: spacing.xxs,
              flexShrink: 0,
              maxWidth: '46%',
            }}
          >
            {amountLine}
            {displayUsdValue && (
              <span
                style={{
                  fontFamily: fontFamily.sans,
                  fontWeight: fontWeight.medium,
                  fontSize: fontSize.caption,
                  color: semantic.text.secondary,
                  whiteSpace: 'nowrap',
                }}
              >
                {displayUsdValue}
              </span>
            )}
          </span>
        )
      }
      onPress={onPress ? handlePress : undefined}
      accessibilityLabel={
        isBitcoin
          ? t(
              'accessibility.token_price_balance',
              '{{name}} token, price {{price}}, balance {{amount}} {{symbol}}',
              { name, price: spokenPrice, amount: spokenAmount, symbol }
            )
          : t('accessibility.token_balance', '{{name}} token, balance {{amount}} {{symbol}}', {
              name,
              amount: spokenAmount,
              symbol,
            })
      }
      className={className}
      style={style}
    />
  );
}

const sublineStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  fontSize: fontSize.caption,
  color: t.text.secondary,
});
