import {
  borderRadius,
  colors,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  formatLargeNumber,
  formatTokenAmount,
  getLabelValue,
  hiddenValue,
  ms,
  s,
  showPercentage,
  spacing,
  useCurrencyContext,
  vs,
  semantic,
} from '@salmon/shared';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../Card';
import { ListRow } from '../ListRow';
import { TokenLogo } from '../TokenLogo';
import type { TokenListItemProps } from './types';

/** The card's own logo size — pinned by the redesign spec, not the legacy
 * `componentSizes.tokenIcon` token. */
const TOKEN_LOGO_SIZE = 44;

/**
 * Arrow indicator component for price changes
 */
const ChangeArrow: React.FC<{ isPositive: boolean }> = ({ isPositive }) => (
  <Text
    style={[
      styles.changeArrow,
      { color: isPositive ? colors.change.positive : colors.change.negative },
    ]}
  >
    {isPositive ? '\u25B2' : '\u25BC'}
  </Text>
);

/**
 * Individual token item component for the TokenList
 *
 * Displays token logo, name, price with change indicator, USD holdings, and token amount.
 *
 * Layout varies by blockchain:
 * - Solana/Ethereum: Full layout with token name, price, and detailed info
 * - Bitcoin: Simplified layout showing only total USD value and BTC amount
 *
 * @example
 * ```tsx
 * <TokenListItem
 *   token={{
 *     address: 'So11111111111111111111111111111111111111112',
 *     name: 'Solana',
 *     symbol: 'SOL',
 *     logo: 'https://...',
 *     price: 131.28,
 *     uiAmount: '1.2',
 *     usdBalance: 155.20,
 *     last24HoursChange: { perc: 1.2, abs: 10.01 }
 *   }}
 *   onPress={(token) => console.log(token)}
 *   hiddenBalance={false}
 *   blockchain="solana"
 * />
 * ```
 */
const TokenListItem: React.FC<TokenListItemProps> = ({
  token,
  onPress,
  hiddenBalance = false,
  blockchain = 'solana',
  style,
}) => {
  const { t } = useTranslation();
  const [, { formatValue, formatChange }] = useCurrencyContext();
  const { name, symbol, logo, price, uiAmount, usdBalance, last24HoursChange } = token;

  const handlePress = React.useCallback(() => {
    onPress?.(token);
  }, [onPress, token]);

  // Get the label type for coloring the percentage and absolute change
  const percentageChange = last24HoursChange?.perc ?? 0;
  const absoluteChange = last24HoursChange?.abs;
  const labelType = getLabelValue(percentageChange);
  const changeColor = colors.change[labelType];
  const isPositiveChange = percentageChange >= 0;

  // Format display values
  const displayPrice = hiddenBalance ? hiddenValue : price != null ? formatValue(price) : null;

  const displayPercentage = last24HoursChange ? showPercentage(percentageChange) : null;
  // A hidden balance hides the money, and an absolute change IS money — "+$41.20"
  // reconstructs roughly what the masked holding is worth. The percentage is a
  // ratio and carries no size, so it stays.
  const displayAbsChange =
    hiddenBalance || absoluteChange == null ? null : formatChange(absoluteChange);

  const displayUsdValue = hiddenBalance
    ? hiddenValue
    : usdBalance != null
      ? formatValue(usdBalance)
      : null;

  // A holding of 28,896.26376 BONK printed in full pushed the ticker off the
  // row ("28896.26376 Bo…"). `formatLargeNumber` is the repo's compact
  // renderer: K/M/B above a thousand, full precision below it, so a dust
  // balance still reads digit for digit.
  const numericAmount = typeof uiAmount === 'string' ? parseFloat(uiAmount) : uiAmount;
  const compactAmount = Number.isFinite(numericAmount)
    ? formatLargeNumber(numericAmount)
    : formatTokenAmount(uiAmount);
  const displayTokenAmount = hiddenBalance ? hiddenValue : `${compactAmount} ${symbol || ''}`;

  // What the screen reader is told, masked exactly like the pixels are. The
  // labels used to interpolate the raw `price` and `uiAmount` regardless of
  // `hiddenBalance`, so VoiceOver read out the balance the user had just
  // chosen to hide.
  const spokenAmount = hiddenBalance ? hiddenValue : uiAmount;
  const spokenPrice = hiddenBalance ? hiddenValue : price;

  // Bitcoin has a different layout showing price, change, and BTC amount
  if (blockchain === 'bitcoin') {
    return (
      <Card
        testID={`token-row-${symbol}`}
        padding="lg"
        radius="xl"
        onPress={onPress ? handlePress : undefined}
        accessibilityLabel={t(
          'accessibility.token_price_balance',
          '{{name}} token, price {{price}}, balance {{amount}} {{symbol}}',
          { name, price: spokenPrice, amount: spokenAmount, symbol }
        )}
        style={StyleSheet.flatten([styles.cardSpacing, styles.bitcoinContainer, style])}
      >
        {/* Token Logo */}
        <TokenLogo uri={logo} symbol={symbol} size={s(33)} borderRadius={16.5} />

        {/* Bitcoin Info - Price and percentage change */}
        <View style={styles.bitcoinInfoContainer}>
          {displayPrice && (
            <Text
              style={styles.bitcoinPrice}
              numberOfLines={1}
              maxFontSizeMultiplier={fontScaleCap.dense}
            >
              {displayPrice}
            </Text>
          )}
          <View style={styles.bitcoinChangeRow}>
            {displayPercentage && (
              <>
                <ChangeArrow isPositive={isPositiveChange} />
                <Text
                  style={[styles.bitcoinChangeText, { color: changeColor }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={fontScaleCap.dense}
                >
                  {displayPercentage}
                  {displayAbsChange && ` (${displayAbsChange})`}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Bitcoin Amount - Right Side */}
        <View style={styles.bitcoinAmountContainer}>
          <Text
            style={styles.bitcoinAmount}
            numberOfLines={1}
            maxFontSizeMultiplier={fontScaleCap.dense}
          >
            {displayTokenAmount}
          </Text>
        </View>
      </Card>
    );
  }

  // Solana/Ethereum layout — a `ListRow`: logo, name + ticker line, amount +
  // fiat column. The row's geometry, card and press state are the primitive's;
  // only the three contents are this component's.
  // "SOL · $101.39 · -1.1%", in three Texts with an explicit order of sacrifice.
  // The price and the change are what the user opened the screen for, so they
  // never give up a character: both are `flexShrink: 0`. The ticker is the only
  // shrinkable segment, and it clips rather than ellipsising, so a narrow row
  // degrades to "$101.39 · -1.1%" instead of the "$101.…" the old
  // shrinking-lead layout produced. Only once the ticker is gone does the
  // pressure reach the name column (`ListRow` gives the title `flexShrink: 1`).
  const hasTail = !!displayPrice || !!displayPercentage;
  const tickerSegment = symbol ? (hasTail ? `${symbol} · ` : symbol) : null;
  const changeSegment = displayPercentage
    ? displayPrice
      ? ` · ${displayPercentage}`
      : displayPercentage
    : null;
  const subline = (tickerSegment || displayPrice || changeSegment) && (
    <View style={styles.sublineRow}>
      {!!tickerSegment && (
        <Text
          testID={`token-row-ticker-${symbol}`}
          style={[styles.subline, styles.sublineTicker]}
          numberOfLines={1}
          ellipsizeMode="clip"
          maxFontSizeMultiplier={fontScaleCap.dense}
        >
          {tickerSegment}
        </Text>
      )}
      {!!displayPrice && (
        <Text
          testID={`token-row-price-${symbol}`}
          style={[styles.subline, styles.sublineFixed]}
          numberOfLines={1}
          maxFontSizeMultiplier={fontScaleCap.dense}
        >
          {displayPrice}
        </Text>
      )}
      {!!changeSegment && (
        <Text
          testID={`token-row-change-${symbol}`}
          style={[styles.subline, styles.change, styles.sublineFixed, { color: changeColor }]}
          numberOfLines={1}
          maxFontSizeMultiplier={fontScaleCap.dense}
        >
          {changeSegment}
        </Text>
      )}
    </View>
  );

  return (
    <ListRow
      testID={`token-row-${symbol}`}
      padding="lg"
      emphasis="strong"
      leading={
        <TokenLogo
          uri={logo}
          symbol={symbol}
          size={s(TOKEN_LOGO_SIZE)}
          borderRadius={borderRadius.tokenIcon}
        />
      }
      title={name}
      subtitle={subline || undefined}
      trailing={
        <View style={styles.valueContainer}>
          <Text
            style={styles.tokenAmount}
            numberOfLines={1}
            maxFontSizeMultiplier={fontScaleCap.dense}
          >
            {displayTokenAmount}
          </Text>
          {displayUsdValue && (
            <Text
              style={styles.usdValue}
              numberOfLines={1}
              maxFontSizeMultiplier={fontScaleCap.dense}
            >
              {displayUsdValue}
            </Text>
          )}
        </View>
      }
      onPress={handlePress}
      accessibilityLabel={t(
        'accessibility.token_balance',
        '{{name}} token, balance {{amount}} {{symbol}}',
        { name, amount: spokenAmount, symbol }
      )}
      style={StyleSheet.flatten([styles.cardSpacing, style])}
    />
  );
};

const styles = StyleSheet.create({
  // The card ground, radius and hairline are `Card`'s; what stays here is the
  // list glue — how far one row sits from the next. Card→card is a
  // sibling-component seam per DESIGN.md's component gap rule, so it takes
  // the same `screenGutter` (20) as the screen's side gutters, not an
  // internal-anatomy step.
  cardSpacing: {
    marginBottom: vs(spacing.screenGutter),
  },

  // Secondary line: "SOL · $159.58 · +4.2%", drawn as one shrinking segment
  // (the ticker) and two fixed ones, so neither the price nor the change is
  // ever the part that gets cut.
  sublineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  subline: {
    fontSize: ms(fontSize.caption),
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.secondary,
  },
  // The one segment allowed to give up room, all the way to nothing.
  sublineTicker: {
    flexShrink: 1,
    minWidth: 0,
  },
  // Price and change: never truncated, never shrunk.
  sublineFixed: {
    flexShrink: 0,
  },
  change: {
    fontSize: ms(fontSize.caption),
    fontFamily: fontFamilyNative.semiBold,
  },
  changeArrow: {
    fontSize: ms(fontSize.body),
  },
  valueContainer: {
    alignItems: 'flex-end',
    gap: vs(spacing.xxs),
    flexShrink: 0,
    maxWidth: '46%',
  },
  usdValue: {
    fontSize: ms(fontSize.caption),
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.secondary,
  },
  tokenAmount: {
    fontSize: ms(fontSize.bodyLg),
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
  },

  // Bitcoin-specific styles (based on Figma specs)
  bitcoinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.md),
  },
  bitcoinInfoContainer: {
    flex: 1,
    gap: vs(spacing.xxs),
  },
  bitcoinPrice: {
    fontSize: ms(fontSize.lg),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    letterSpacing: ms(-0.09, 0.3),
  },
  bitcoinChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xxs),
  },
  bitcoinChangeText: {
    fontSize: ms(fontSize.caption),
    fontFamily: fontFamilyNative.light,
    letterSpacing: ms(-0.06, 0.3),
  },
  bitcoinAmountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bitcoinAmount: {
    fontSize: ms(fontSize.xl),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.secondary,
    letterSpacing: ms(-0.095, 0.3),
  },
});

export default TokenListItem;
