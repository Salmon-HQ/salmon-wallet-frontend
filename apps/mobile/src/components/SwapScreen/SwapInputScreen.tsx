import React from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  spacing,
  borderRadius,
  gradients,
  shadows,
  componentSizes,
  fontFamilyNative,
  vs,
  s,
  fontSize,
  borderWidth,
  semantic,
} from '@salmon/shared';
import { SwapAmountInput } from './SwapAmountInput';
import { PrimaryButton } from '../Button';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight';
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
  swapError,
  onReview,
  style,
}) => {
  const { t } = useTranslation();
  const { floatingBottomOffset, stickyCtaScrollPadding } = useTabChrome();
  const keyboardHeight = useKeyboardHeight();

  // The review CTA is absolutely positioned, so KeyboardAvoidingView cannot
  // reach it. While the amount keyboard is open, anchor it just above the
  // keyboard instead of above the tab bar so the user can still act on the
  // amount they just typed.
  const ctaBottomOffset =
    keyboardHeight > 0 ? keyboardHeight + vs(spacing.sm) : floatingBottomOffset;

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

        {swapError ? (
          <Text testID="swap-error-text" style={styles.errorText}>
            {typeof swapError === 'string' ? t(swapError) : t(swapError.key, swapError.params)}
          </Text>
        ) : null}

        {reviewWarning ? (
          <Text style={styles.warningText}>
            {typeof reviewWarning === 'string'
              ? t(reviewWarning)
              : t(reviewWarning.key, reviewWarning.params)}
          </Text>
        ) : null}

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

        <Text style={styles.disclaimerText}>
          {t('swap.platform_fee_disclaimer', 'Includes 0.5% platform fee')}
        </Text>
      </View>

      {/* Review Button */}
      <View style={[styles.buttonContainer, { bottom: ctaBottomOffset }]}>
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
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamilyNative.medium,
    color: colors.status.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
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
    borderColor: semantic.accent.fill,
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
