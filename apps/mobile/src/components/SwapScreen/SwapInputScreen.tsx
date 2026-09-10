import React from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  componentSizes,
  fontFamilyNative,
  vs,
  s,
  fontSize,
  lineHeight,
  semantic,
} from '@salmon/shared';
import { SwapAmountInput } from './SwapAmountInput';
import { PrimaryButton } from '../Button';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight';
import type { SwapInputScreenProps } from './types';

/**
 * SwapInputScreen - the Swap Powerup's form: pair, amounts and the swap
 * control. The next screen is core's confirmation, not the Powerup's.
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
  canSwap,
  reviewWarning,
  swapError,
  attribution,
  onSwap,
  style,
}) => {
  const { t } = useTranslation();
  const { floatingBottomOffset, stickyCtaScrollPadding } = useTabChrome();
  const keyboardHeight = useKeyboardHeight();

  // The CTA is absolutely positioned, so KeyboardAvoidingView cannot reach
  // it. While the amount keyboard is open, anchor it just above the keyboard
  // instead of above the tab bar so the user can still act on the amount
  // they just typed.
  const ctaBottomOffset =
    keyboardHeight > 0 ? keyboardHeight + vs(spacing.sm) : floatingBottomOffset;

  return (
    <Pressable
      style={[styles.container, { paddingBottom: stickyCtaScrollPadding }, style]}
      onPress={Keyboard.dismiss}
      accessible={false}
    >
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

        {/* The notice slot, reserved. Every message that can appear here does
            so while the user is still typing the amount — a minimum-amount
            notice, a stale or failed quote, an insufficient balance — so the
            slot holds one line of height from the first frame and fills it
            when it has something to say. Without the reservation the whole
            "You Receive" block travelled down the screen the moment the
            amount crossed the minimum. Same technique as `ReservedSlot`:
            keep the space, not the content. */}
        <View style={styles.noticeSlot} testID="swap-notice-slot">
          {swapError ? (
            <Text testID="swap-error-text" style={styles.errorText}>
              {typeof swapError === 'string' ? t(swapError) : t(swapError.key, swapError.params)}
            </Text>
          ) : null}

          {reviewWarning ? (
            <Text testID="swap-warning-text" style={styles.warningText}>
              {typeof reviewWarning === 'string'
                ? t(reviewWarning)
                : t(reviewWarning.key, reviewWarning.params)}
            </Text>
          ) : null}
        </View>

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

        {/* The fee is a line on the confirmation, never folded into the quote;
            the provider is named from the quote itself (spec 027 §7). */}
        <Text style={styles.disclaimerText}>
          {attribution ?? t('swap.fee_disclaimer')}
        </Text>
      </View>

      <View style={[styles.buttonContainer, { bottom: ctaBottomOffset }]}>
        <PrimaryButton
          onPress={onSwap}
          disabled={!canSwap}
          style={styles.button}
          testID="swap-submit-button"
        >
          {t('swap.swap_now', 'Swap')}
        </PrimaryButton>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: s(spacing.headerPadding),
    paddingTop: vs(spacing['2xl']),
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
  // One line of the notice type, always. The messages are single-line by
  // construction; a longer one grows the slot rather than being clipped.
  noticeSlot: {
    minHeight: vs(fontSize.sm * lineHeight.normal),
    justifyContent: 'center',
  },
  errorText: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
    fontFamily: fontFamilyNative.medium,
    color: semantic.status.danger,
    textAlign: 'center',
  },
  warningText: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
    fontFamily: fontFamilyNative.medium,
    color: semantic.status.warning,
    textAlign: 'center',
  },
  disclaimerText: {
    fontSize: fontSize.micro,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  // Size only. Radius, fill, border, bezel and material belong to the button.
  // One fixed width, in both states: a control pinned to both edges of this
  // screen reads as a bar rather than a button, and sizing it to its label
  // made the geometry a function of its state. Width is not a state.
  button: {
    width: s(componentSizes.copyButtonWidth),
    height: vs(componentSizes.buttonHeightCompact),
  },
});

export default SwapInputScreen;
