import React from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, gradients, shadows, componentSizes, fontFamilyNative, vs, s, fontSize, borderWidth, } from '@salmon/shared';
import { SwapAmountInput } from './SwapAmountInput';
import { PrimaryButton } from '../Button';
import { useTabChrome } from '../../../hooks/useTabChrome';
import type { SwapInputScreenProps } from './types';

/**
 * SwapInputScreen - First step of swap flow
 * Shows input/output token selectors and amounts
 */
export const SwapInputScreen: React.FC<SwapInputScreenProps> = ({
  inToken,
  outToken,
  inAmount,
  outAmount,
  onInAmountChange,
  onInTokenPress,
  onOutTokenPress,
  inUsdValue,
  isLoadingQuote = false,
  canReview,
  reviewWarning,
  onReview,
  style,
}) => {
  const { t } = useTranslation();
  const { floatingBottomOffset, stickyCtaScrollPadding } = useTabChrome();

  return (
    <Pressable
      style={[styles.container, { paddingBottom: stickyCtaScrollPadding }, style]}
      onPress={Keyboard.dismiss}
      accessible={false}
    >
      {/* Input Fields */}
      <View style={styles.inputsContainer}>
        {/* You Send */}
        <SwapAmountInput
          testID="swap-from"
          label={t('swap.you_send', 'You Send')}
          value={inAmount}
          onChangeValue={onInAmountChange}
          token={inToken}
          onTokenPress={onInTokenPress}
          usdValue={inUsdValue}
          availableBalance={inToken?.balance}
          editable={true}
          placeholder={t('swap.enter_amount', 'Enter an amount')}
        />

        {reviewWarning ? <Text style={styles.warningText}>{reviewWarning}</Text> : null}

        {/* You Receive */}
        <SwapAmountInput
          testID="swap-to"
          label={t('swap.you_receive', 'You Receive')}
          value={outAmount}
          onChangeValue={() => {}}
          token={outToken}
          onTokenPress={onOutTokenPress}
          editable={false}
          placeholder="0"
          isLoading={isLoadingQuote}
        />

        <Text style={styles.disclaimerText}>{t('swap.platform_fee_disclaimer', 'Includes 0.5% platform fee')}</Text>
      </View>

      {/* Review Button */}
      <View style={[styles.buttonContainer, { bottom: floatingBottomOffset }]}>
        {canReview ? (
          <LinearGradient
            colors={gradients.primaryButton.colors}
            start={gradients.primaryButton.start}
            end={gradients.primaryButton.end}
            style={[styles.buttonGradient, styles.buttonGradientActive]}
          >
            <PrimaryButton
              onPress={onReview}
              disabled={false}
              style={styles.button}
              testID="swap-review-button"
            >
              {t('swap.review.reviewAndSwap', 'Review & Swap')}
            </PrimaryButton>
          </LinearGradient>
        ) : (
          <View style={[styles.buttonGradient, styles.buttonGradientInactive]}>
            <PrimaryButton
              onPress={onReview}
              disabled={true}
              style={styles.button}
              testID="swap-review-button"
            >
              {t('swap.review.reviewAndSwap', 'Review & Swap')}
            </PrimaryButton>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: s(spacing.headerPadding),
    paddingTop: vs(spacing['3xl'] + spacing['3xl']),
  },
  inputsContainer: {
    gap: vs(spacing['2xl']),
  },
  buttonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  warningText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamilyNative.medium,
    color: colors.status.warning,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  disclaimerText: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  buttonGradient: {
    borderRadius: borderRadius.lg,
    borderWidth: borderWidth.accent,
    borderColor: 'transparent',
    ...shadows.button,
  },
  buttonGradientActive: {
    borderColor: colors.accent.border,
  },
  buttonGradientInactive: {
    backgroundColor: colors.button.inactiveBackground,
    borderColor: 'transparent',
  },
  button: {
    minWidth: s(componentSizes.copyButtonWidth),
    height: vs(componentSizes.buttonHeightCompact),
    backgroundColor: 'transparent',
  },
});

export default SwapInputScreen;
