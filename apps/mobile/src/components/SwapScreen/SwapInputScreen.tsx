import React from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  useAmountShortcuts,
} from '@salmon/shared';
import { SwapAmountInput } from './SwapAmountInput';
import { ChipGroup } from '../Chip';
import { PrimaryButton } from '../Button';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight';
import type { SwapInputScreenProps } from './types';

/**
 * SwapInputScreen - the Swap Powerup's form: pair, amounts and the swap
 * control, drawn with the same amount-card and percent-pill row Send's
 * amount step uses (CORE 05). The next screen is core's confirmation, not
 * the Powerup's.
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
  outUsdValue,
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

  // The balance fills; a fill stays lit until the user types over it.
  const shortcuts = useAmountShortcuts({
    balance: inToken?.balance,
    decimals: inToken?.decimals,
    setAmount: onInAmountChange,
    maxLabel: t('general.max'),
  });
  const isFillLit = shortcuts.selected !== '';

  return (
    <Pressable style={[styles.container, style]} onPress={Keyboard.dismiss} accessible={false}>
      {/* The form lives in Home's content region now, under the balance block
          and the sub-tab row (spec 027): on a short screen, or at a large font
          scale, the two amount fields and the attribution no longer fit it.
          They scroll; the CTA stays pinned to the bottom of the region. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.inputsContainer, { paddingBottom: stickyCtaScrollPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* You Send */}
        <SwapAmountInput
          testID="swap-from"
          label={t('swap.you_send', 'You Send')}
          value={inAmount}
          onChangeValue={shortcuts.onAmountChange}
          token={inToken}
          onTokenPress={onInTokenPress}
          usdValue={inUsdValue}
          highlighted={isFillLit}
          editable={true}
        />

        {inToken && inToken.balance !== undefined && (
          <ChipGroup
            testID="swap-shortcuts"
            options={shortcuts.options}
            value={shortcuts.selected}
            onChange={shortcuts.select}
            size="md"
            fill
            variant="outline"
            style={styles.shortcuts}
          />
        )}

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
          usdValue={outAmount && outUsdValue != null ? outUsdValue : undefined}
          highlighted={isFillLit}
          editable={false}
          placeholder="0"
          isLoading={isLoadingQuote}
        />

        {/* The fee is a line on the confirmation, never folded into the quote;
            the provider is named from the quote itself (spec 027 §7). */}
        <Text style={styles.disclaimerText}>{attribution ?? t('swap.fee_disclaimer')}</Text>
      </ScrollView>

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
  },
  scroll: {
    flex: 1,
  },
  inputsContainer: {
    paddingHorizontal: s(spacing.headerPadding),
    paddingTop: vs(spacing['2xl']),
    gap: vs(spacing['2xl']),
  },
  shortcuts: {
    flexGrow: 0,
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
