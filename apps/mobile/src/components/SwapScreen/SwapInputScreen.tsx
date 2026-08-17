import React from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  borderRadius,
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
  bridgeReference,
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

        {/* A bridge that failed after its exchange was created leaves the user
            with an order they cannot see and no way to name it. This is the
            only reference that exists — a reference number, not debug output. */}
        {bridgeReference && (swapError || reviewWarning) ? (
          <View style={styles.referenceBox} testID="bridge-failure-reference">
            <Text style={styles.referenceTitle}>
              {t('bridge.reference_title', 'Keep this reference')}
            </Text>
            <Text style={styles.referenceBody}>
              {t(
                'bridge.reference_body',
                'This bridge did not complete, but the exchange was already created. Save these details — they are what support needs to look it up.'
              )}
            </Text>
            <Text style={styles.referenceLabel}>{t('bridge.exchangeId', 'Exchange ID')}</Text>
            <Text style={styles.referenceValue} selectable>
              {bridgeReference.id}
            </Text>
            <Text style={styles.referenceLabel}>
              {t('bridge.depositAddressLabel', 'Deposit address')}
            </Text>
            <Text style={styles.referenceValue} selectable>
              {bridgeReference.depositAddress}
            </Text>
          </View>
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
        <PrimaryButton
          onPress={onReview}
          disabled={!canReview}
          style={styles.button}
          testID="swap-review-button"
        >
          {t('swap.review.reviewAndSwap', 'Review')}
        </PrimaryButton>
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
    color: semantic.status.danger,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamilyNative.medium,
    color: semantic.status.warning,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  referenceBox: {
    backgroundColor: semantic.surface.raised,
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.thin,
    borderColor: semantic.border.raised,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  referenceTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamilyNative.bold,
    color: semantic.status.warning,
    marginBottom: spacing.xs,
  },
  referenceBody: {
    fontSize: fontSize.sm,
    fontFamily: fontFamilyNative.regular,
    color: semantic.text.secondary,
    marginBottom: spacing.sm,
  },
  referenceLabel: {
    fontSize: fontSize.micro,
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.tertiary,
    textTransform: 'uppercase',
  },
  referenceValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.primary,
    marginBottom: spacing.xs,
  },
  disclaimerText: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  // Size only. Radius, fill, border, bezel and material belong to the button:
  // this CTA used to sit inside a gradient wrapper carrying a 12px radius, a
  // salmon outline and a glow, with the button's own fill forced transparent —
  // a second, squarer shape behind the pill that read as two stacked buttons.
  button: {
    minWidth: s(componentSizes.copyButtonWidth),
    height: vs(componentSizes.buttonHeightCompact),
  },
});

export default SwapInputScreen;
