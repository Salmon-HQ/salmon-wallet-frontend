import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  colors,
  componentSizes,
  fontSize,
  fontFamilyNative,
  formatTokenBalance,
  letterSpacing,
  lineHeight,
  ms,
  opacity,
  shadows,
  spacing,
  useCurrencyContext,
  vs,
  s,
} from '@salmon/shared';
import { AmountEntryCard } from '../AmountEntryCard';
import { TokenLogo } from '../TokenLogo';
import type { SwapAmountInputProps } from './types';

/**
 * SwapAmountInput — "You Send" / "You Receive", drawn with the same
 * `AmountEntryCard` Send's amount step uses (CORE 05): the card holds the
 * number alone, centred. The token chip and that block's own "Available"
 * line sit in a header row above the card — left and right — not inside it,
 * since Swap lets the user change either side.
 */
export const SwapAmountInput: React.FC<SwapAmountInputProps> = ({
  label,
  value,
  onChangeValue,
  token,
  onTokenPress,
  usdValue,
  editable = true,
  style,
  isLoading = false,
  highlighted = false,
  testID,
}) => {
  const { t } = useTranslation();
  const [{ currency }, { formatPrecise }] = useCurrencyContext();

  const subtext =
    usdValue !== undefined
      ? `${formatPrecise(Math.floor(usdValue * 100) / 100)} ${currency.toUpperCase()}`
      : undefined;

  const availableText = token
    ? `${t('send.screens.available')} ${formatTokenBalance(token.balance ?? 0)} ${token.symbol}`
    : undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.headerRow}>
        <TouchableOpacity
          testID={testID ? `${testID}-token` : undefined}
          style={styles.tokenDropdown}
          onPress={onTokenPress}
          activeOpacity={0.7}
        >
          <TokenLogo uri={token?.logo || undefined} symbol={token?.symbol} size={ms(22)} />
          <Text style={styles.tokenSymbol}>{token?.symbol || t('actions.select', 'Select')}</Text>
        </TouchableOpacity>

        {availableText !== undefined && (
          <Text
            testID={testID ? `${testID}-available` : undefined}
            style={styles.availableText}
            numberOfLines={1}
          >
            {availableText}
          </Text>
        )}
      </View>

      <AmountEntryCard
        testID={testID}
        value={value}
        onChangeValue={onChangeValue}
        editable={editable}
        placeholder="0"
        loading={isLoading}
        focused={highlighted}
        subtext={subtext}
        style={style}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: vs(spacing.sm),
  },
  label: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(fontSize.base * lineHeight.condensed),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(spacing.sm),
  },
  tokenDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.button.secondaryBackground,
    borderRadius: borderRadius.sm + 2,
    paddingHorizontal: s(spacing.sm),
    paddingVertical: vs(spacing.xxs),
    gap: s(spacing.sm - 1),
    minHeight: vs(componentSizes.iconSizeXL),
    minWidth: s(componentSizes.swapSelectorMinWidth),
    ...shadows.sm,
  },
  tokenSymbol: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    opacity: opacity.soft,
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(fontSize.base * lineHeight.condensed),
  },
  availableText: {
    flexShrink: 1,
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(fontSize.sm * lineHeight.normal),
    textAlign: 'right',
  },
});

export default SwapAmountInput;
