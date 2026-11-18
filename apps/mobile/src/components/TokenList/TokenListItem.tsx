import {
  borderRadius,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  ms,
  s,
  spacing,
  tokenRowDisplay,
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
  const { name, symbol, logo } = token;

  const handlePress = React.useCallback(() => {
    onPress?.(token);
  }, [onPress, token]);

  const {
    changeTone,
    displayPrice,
    displayUsdValue,
    displayTokenAmount,
    spokenAmount,
    spokenPrice,
    tickerSegment,
    changeSegment,
  } = tokenRowDisplay(token, hiddenBalance, formatValue);
  const changeColor = changeTones[changeTone];

  // One text run that ellipsises at its end, like the DOM twin: three
  // fixed-width Texts beside a non-shrinking name column squeeze the ticker.
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
