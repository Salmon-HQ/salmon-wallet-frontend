import {
  borderRadius,
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
  type Semantic,
} from '@salmon/shared';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { ListRow } from '../ListRow';
import { TokenLogo } from '../TokenLogo';
import { useThemedStyles, useSemantic } from '../../theme/useThemedStyles';
import type { TokenListItemProps } from './types';

/** The card's own logo size — pinned by the redesign spec, not the legacy
 * `componentSizes.tokenIcon` token. */
const TOKEN_LOGO_SIZE = 44;

/**
 * Individual token item component for the TokenList
 *
 * Displays token logo, name, price with change indicator, USD holdings, and token amount.
 *
 * Layout varies by blockchain:
 * - Solana/Ethereum: name, ticker/price/change subline, amount + fiat trailing
 * - Bitcoin: name, ticker/price/change subline, amount trailing (no fiat)
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
  const styles = useThemedStyles(stylesFor);
  const { change: changeTones } = useSemantic();
  const [, { formatValue }] = useCurrencyContext();
  const { name, symbol, logo, price, uiAmount, usdBalance, last24HoursChange } = token;

  const handlePress = React.useCallback(() => {
    onPress?.(token);
  }, [onPress, token]);

  // Get the label type for coloring the percentage
  const percentageChange = last24HoursChange?.perc ?? 0;
  const labelType = getLabelValue(percentageChange);
  const changeColor = changeTones[labelType];

  // Format display values
  const displayPrice = hiddenBalance ? hiddenValue : price != null ? formatValue(price) : null;

  const displayPercentage = last24HoursChange ? showPercentage(percentageChange) : null;

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

  // One text run that ellipsises at its end, like the DOM twin
  // (`packages/ui/src/components/TokenList/TokenListItem.tsx`). Three
  // fixed-width Texts fighting for space beside a non-shrinking name column
  // squeezed the ticker to "mSC$145.52"; a single `numberOfLines={1}` Text
  // degrades to "mSOL · $145.…" instead.
  const hasTail = !!displayPrice || !!displayPercentage;
  const tickerSegment = symbol ? (hasTail ? `${symbol} · ` : symbol) : null;
  const changeSegment = displayPercentage
    ? displayPrice
      ? ` · ${displayPercentage}`
      : displayPercentage
    : null;
  const subline = (tickerSegment || displayPrice || changeSegment) && (
    <Text
      testID={`token-row-subline-${symbol}`}
      style={styles.subline}
      numberOfLines={1}
      ellipsizeMode="tail"
      maxFontSizeMultiplier={fontScaleCap.dense}
    >
      {tickerSegment}
      {displayPrice}
      {!!changeSegment && (
        <Text style={[styles.change, { color: changeColor }]}>{changeSegment}</Text>
      )}
    </Text>
  );

  const logoNode = (
    <TokenLogo
      uri={logo}
      symbol={symbol}
      size={s(TOKEN_LOGO_SIZE)}
      borderRadius={borderRadius.tokenIcon}
    />
  );

  // Bitcoin shows only the amount, not a fiat line beside it — unchanged from
  // the hand-drawn row this replaces.
  if (blockchain === 'bitcoin') {
    return (
      <ListRow
        testID={`token-row-${symbol}`}
        padding="lg"
        emphasis="strong"
        leading={logoNode}
        title={name}
        subtitle={subline || undefined}
        trailing={
          <Text
            style={styles.tokenAmount}
            numberOfLines={1}
            maxFontSizeMultiplier={fontScaleCap.dense}
          >
            {displayTokenAmount}
          </Text>
        }
        onPress={onPress ? handlePress : undefined}
        accessibilityLabel={t(
          'accessibility.token_price_balance',
          '{{name}} token, price {{price}}, balance {{amount}} {{symbol}}',
          { name, price: spokenPrice, amount: spokenAmount, symbol }
        )}
        style={StyleSheet.flatten([styles.cardSpacing, style])}
      />
    );
  }

  return (
    <ListRow
      testID={`token-row-${symbol}`}
      padding="lg"
      emphasis="strong"
      leading={logoNode}
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

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    // The card ground, radius and hairline are `Card`'s; what stays here is the
    // list glue — how far one row sits from the next. Card→card is a
    // sibling-component seam per DESIGN.md's component gap rule, so it takes
    // the same `screenGutter` (20) as the screen's side gutters, not an
    // internal-anatomy step.
    cardSpacing: {
      marginBottom: vs(spacing.screenGutter),
    },

    // Secondary line: "SOL · $159.58 · +4.2%" as one text run that
    // ellipsises at its end — matches the DOM twin.
    subline: {
      fontSize: ms(fontSize.caption),
      fontFamily: fontFamilyNative.medium,
      color: t.text.secondary,
    },
    change: {
      fontSize: ms(fontSize.caption),
      fontFamily: fontFamilyNative.semiBold,
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
      color: t.text.secondary,
    },
    tokenAmount: {
      fontSize: ms(fontSize.bodyLg),
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
    },
  });

export default TokenListItem;
