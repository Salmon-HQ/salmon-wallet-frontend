import {
  borderRadius,
  borderWidth,
  colors,
  componentSizes,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  getLabelValue,
  hiddenValue,
  lineHeight,
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
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurContainer } from '../BlurContainer';
import { TokenLogo } from '../TokenLogo';
import TokenBadges from './TokenBadges';
import type { TokenListItemProps } from './types';

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
  const { name, symbol, logo, price, uiAmount, usdBalance, last24HoursChange, tags } = token;

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
  const displayAbsChange = absoluteChange != null ? formatChange(absoluteChange) : null;

  const displayUsdValue = hiddenBalance
    ? hiddenValue
    : usdBalance != null
      ? formatValue(usdBalance)
      : null;

  const displayTokenAmount = hiddenBalance ? hiddenValue : `${uiAmount} ${symbol || ''}`;

  // Bitcoin has a different layout showing price, change, and BTC amount
  if (blockchain === 'bitcoin') {
    const Wrapper = onPress ? TouchableOpacity : View;
    const wrapperProps = onPress
      ? {
          onPress: handlePress,
          activeOpacity: 0.7,
          accessibilityRole: 'button' as const,
          accessibilityLabel: t(
            'accessibility.token_price_balance',
            '{{name}} token, price {{price}}, balance {{amount}} {{symbol}}',
            { name, price, amount: uiAmount, symbol }
          ),
        }
      : {};
    return (
      <BlurContainer style={[styles.glassWrapper, style]} borderWidth={borderWidth.tokenListItem}>
        <Wrapper testID={`token-row-${symbol}`} style={styles.bitcoinContainer} {...wrapperProps}>
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
        </Wrapper>
      </BlurContainer>
    );
  }

  // Solana/Ethereum layout
  return (
    <BlurContainer style={[styles.glassWrapper, style]} borderWidth={borderWidth.tokenListItem}>
      <TouchableOpacity
        testID={`token-row-${symbol}`}
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t(
          'accessibility.token_balance',
          '{{name}} token, balance {{amount}} {{symbol}}',
          { name, amount: uiAmount, symbol }
        )}
      >
        {/* Token Logo */}
        <TokenLogo
          uri={logo}
          symbol={symbol}
          size={s(componentSizes.tokenIcon)}
          borderRadius={borderRadius.tokenIcon}
        />

        {/* Token Info - Left Side */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text
              style={styles.name}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={fontScaleCap.dense}
            >
              {name}
            </Text>
            <TokenBadges tags={tags} />
          </View>
          <View style={styles.priceRow}>
            {displayPrice && (
              <Text
                style={styles.price}
                numberOfLines={1}
                maxFontSizeMultiplier={fontScaleCap.dense}
              >
                {displayPrice}
              </Text>
            )}
            {displayPercentage && (
              <>
                <ChangeArrow isPositive={isPositiveChange} />
                <Text
                  style={[styles.changeText, { color: changeColor }]}
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

        {/* Value Info - Right Side */}
        <View style={styles.valueContainer}>
          {displayUsdValue && (
            <Text
              style={styles.usdValue}
              numberOfLines={1}
              maxFontSizeMultiplier={fontScaleCap.dense}
            >
              {displayUsdValue}
            </Text>
          )}
          <Text
            style={styles.tokenAmount}
            numberOfLines={1}
            maxFontSizeMultiplier={fontScaleCap.dense}
          >
            {displayTokenAmount}
          </Text>
        </View>
      </TouchableOpacity>
    </BlurContainer>
  );
};

const styles = StyleSheet.create({
  // Glass wrapper for iOS 26+ Liquid Glass effect
  glassWrapper: {
    borderRadius: borderRadius.lg,
    marginBottom: vs(spacing.sm),
    marginHorizontal: s(spacing['2xl']),
    overflow: 'hidden',
  },
  // Common container styles
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(spacing.md),
    paddingVertical: vs(spacing.md),
    gap: s(spacing.md),
  },

  // Solana/Ethereum styles
  infoContainer: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  name: {
    fontSize: ms(fontSize.body),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.balance,
    flexShrink: 1,
    minWidth: 0,
    lineHeight: ms(fontSize.body) * lineHeight.tokenListItem,
    letterSpacing: ms(-0.07, 0.3),
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xxs),
    minWidth: 0,
  },
  price: {
    fontSize: ms(fontSize.body),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.secondary,
    lineHeight: ms(fontSize.body) * lineHeight.tokenListItem,
    letterSpacing: ms(-0.07, 0.3),
    flexShrink: 0,
  },
  changeArrow: {
    fontSize: ms(fontSize.body),
  },
  changeText: {
    fontSize: ms(fontSize.caption),
    fontFamily: fontFamilyNative.light,
    letterSpacing: ms(-0.06, 0.3),
    flexShrink: 1,
  },
  valueContainer: {
    alignItems: 'flex-end',
    gap: vs(spacing.xs),
    flexShrink: 0,
    maxWidth: '46%',
  },
  usdValue: {
    fontSize: ms(fontSize.lg),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.balance,
    letterSpacing: ms(-0.09, 0.3),
  },
  tokenAmount: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
  },

  // Bitcoin-specific styles (based on Figma specs)
  bitcoinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(spacing.md),
    paddingVertical: vs(spacing.md),
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
