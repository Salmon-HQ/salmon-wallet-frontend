import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  letterSpacing,
  lineHeight,
  shadows,
  ms,
  vs,
  s,
  formatTokenBalance,
  sanitizeDecimalInput,
  useCurrencyContext,
  fontFamilyNative,
  opacity,
  componentSizes,
  semantic,
} from '@salmon/shared';
import { TokenLogo } from '../TokenLogo';
import { BlurContainer } from '../BlurContainer';
import type { SwapAmountInputProps } from './types';

const QUICK_FILL_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: 'MAX', value: 1 },
] as const;

/**
 * SwapAmountInput - Input field for swap amounts with token selector
 */
export const SwapAmountInput: React.FC<SwapAmountInputProps> = ({
  label,
  value,
  onChangeValue,
  token,
  onTokenPress,
  usdValue,
  availableBalance,
  editable = true,
  placeholder,
  style,
  isLoading = false,
  testID,
}) => {
  const { t } = useTranslation();
  const [{ currency }, { formatPrecise }] = useCurrencyContext();
  const handleChangeText = useCallback(
    (text: string) => {
      onChangeValue(sanitizeDecimalInput(text));
    },
    [onChangeValue]
  );

  const showQuickFill = editable && availableBalance !== undefined && !!token;

  const handleQuickFill = useCallback(
    (percentage: number) => {
      if (availableBalance === undefined || !token) return;

      const fillAmount = availableBalance * percentage;
      const decimals = token.decimals ?? 9;
      const truncated = Math.floor(fillAmount * 10 ** decimals) / 10 ** decimals;
      onChangeValue(truncated > 0 ? truncated.toString() : '0');
    },
    [availableBalance, token, onChangeValue]
  );

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Input Row */}
      <BlurContainer
        borderColor={value ? semantic.border.raised : undefined}
        style={styles.inputContainer}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.text.secondary} />
          </View>
        ) : (
          <TextInput
            testID={testID ? `${testID}-amount` : undefined}
            style={styles.input}
            value={value}
            onChangeText={handleChangeText}
            placeholder={placeholder ?? t('swap.enter_amount')}
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
            editable={editable}
          />
        )}

        {/* Token Dropdown */}
        <TouchableOpacity
          testID={testID ? `${testID}-token` : undefined}
          style={styles.tokenDropdown}
          onPress={onTokenPress}
          activeOpacity={0.7}
        >
          <TokenLogo uri={token?.logo || undefined} symbol={token?.symbol} size={ms(22)} />
          <Text style={styles.tokenSymbol}>{token?.symbol || t('actions.select', 'Select')}</Text>
        </TouchableOpacity>
      </BlurContainer>

      {/* USD Value and Balance Row */}
      {(usdValue !== undefined || availableBalance !== undefined) && (
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.usdValue}>
              {formatPrecise(usdValue !== undefined ? Math.floor(usdValue * 100) / 100 : undefined)}{' '}
              {currency.toUpperCase()}
            </Text>
            {showQuickFill ? (
              <View style={styles.quickFillButtons}>
                {QUICK_FILL_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={styles.quickFillButton}
                    onPress={() => handleQuickFill(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickFillText}>
                      {option.value === 1 ? t('general.max') : option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : availableBalance !== undefined && token ? (
              <Text style={styles.availableBalance}>
                {t('swap.available_balance', {
                  balance: formatTokenBalance(availableBalance),
                  symbol: token.symbol,
                })}
              </Text>
            ) : null}
          </View>
          {showQuickFill && availableBalance !== undefined && token && (
            <Text style={styles.availableBalanceAligned}>
              {t('swap.available_balance', {
                balance: formatTokenBalance(availableBalance),
                symbol: token.symbol,
              })}
            </Text>
          )}
        </View>
      )}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.md,
    minHeight: vs(componentSizes.inputHeightLg),
    paddingVertical: vs(spacing.xs),
    paddingHorizontal: s(spacing.md),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: ms(fontSize.bodyLg),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    paddingVertical: 0,
    opacity: 1,
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
  infoSection: {
    gap: vs(spacing.xxs),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usdValue: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(fontSize.sm * lineHeight.normal),
  },
  availableBalance: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.primary,
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(fontSize.sm * lineHeight.normal),
  },
  availableBalanceAligned: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.primary,
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(fontSize.sm * lineHeight.normal),
    alignSelf: 'flex-end',
  },
  quickFillButtons: {
    flexDirection: 'row',
    gap: s(spacing.xs),
  },
  quickFillButton: {
    backgroundColor: colors.button.secondaryBackground,
    borderRadius: ms(borderRadius.sm),
    paddingHorizontal: s(spacing.base),
    paddingVertical: vs(spacing.xs),
  },
  quickFillText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
  },
});

export default SwapAmountInput;
