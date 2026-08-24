import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckIcon, iconSize } from '../../icons';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  chunkAddress,
  colors,
  componentSizes,
  fontFamilyNative,
  fontSize,
  formatTokenAmount,
  ms,
  s,
  semantic,
  spacing,
  vs,
} from '@salmon/shared';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { ContentCopySvgIcon } from '../Icon/SvgIcons';
import { BlurContainer } from '../BlurContainer';
import { PrimaryButton, SecondaryButton } from '../Button';
import { TokenLogo } from '../TokenLogo';
import type { StepConfirmationProps } from './types';

// ============================================================================
// Component
// ============================================================================

export const StepConfirmation: React.FC<StepConfirmationProps> = ({
  token,
  recipientAddress,
  resolvedRecipientAddress,
  amount,
  onBack,
  onCancel,
  onSuccess,
  sendHook,
}) => {
  const { t } = useTranslation();
  const { actionRowBottomPadding } = useBottomSheetChrome();
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const { copied, scale: tickScale, trigger: showCopied } = useCopyFeedback();

  // What the transfer will actually pay. When a `.sol` domain was typed, the
  // resolved address is the destination — showing the domain here would ask
  // the user to sign for something this screen never displayed.
  const destinationAddress = resolvedRecipientAddress || recipientAddress;
  const resolvedFromDomain =
    resolvedRecipientAddress && resolvedRecipientAddress !== recipientAddress
      ? recipientAddress
      : null;

  // Amount display.
  //
  // Render edge only: `amount` stays the raw typed string everywhere else on
  // this screen, because both `estimateFee` and `sendTransaction` parse it.
  // `toFixed` emitted a period whatever the app language was, so a Spanish UI
  // signed for an amount written in English punctuation.
  const amountDisplay = useMemo(() => {
    const numAmount = parseFloat(amount);
    return `${formatTokenAmount(numAmount)} ${token.symbol}`;
  }, [amount, token.symbol]);

  // Estimate fee on mount
  useEffect(() => {
    const doEstimate = async () => {
      const result = await sendHook.estimateFee({
        token: {
          address: token.address,
          decimals: token.decimals ?? 9,
          symbol: token.symbol,
        },
        recipientAddress,
        resolvedRecipientAddress,
        amount: parseFloat(amount),
      });
      if (result) {
        setEstimatedFee(result.fee);
      }
    };
    doEstimate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-only: estimate fee once with initial values
  }, []);

  // Handle confirm press
  const handleConfirm = useCallback(async () => {
    try {
      const result = await sendHook.sendTransaction({
        token: {
          address: token.address,
          decimals: token.decimals ?? 9,
          symbol: token.symbol,
        },
        recipientAddress,
        resolvedRecipientAddress,
        amount: parseFloat(amount),
      });
      onSuccess(result.txId);
    } catch {
      // Error is captured by the hook's error state
    }
  }, [sendHook, token, recipientAddress, resolvedRecipientAddress, amount, onSuccess]);

  // Handle copy address — copies the address the transfer will actually pay,
  // not the domain that was typed.
  const handleCopy = useCallback(async () => {
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(destinationAddress);
      showCopied();
    } catch {
      // Clipboard not available
    }
  }, [destinationAddress, showCopied]);

  // Clears the failure and re-arms the confirm button. It does not resend on its
  // own, which is why the label reads "Confirm Again" rather than "Retry".
  const handleRetry = useCallback(() => {
    sendHook.reset();
  }, [sendHook]);

  const isSending = sendHook.status === 'creating' || sendHook.status === 'sending';
  const isFailed = sendHook.status === 'failed';

  return (
    <View style={styles.container}>
      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Large Token Icon */}
        <View style={styles.tokenIconWrapper}>
          <TokenLogo uri={token.logo || undefined} symbol={token.symbol} size={ms(100)} />
        </View>

        {/* Amount */}
        <Text testID="send-confirm-amount" style={styles.amountText}>
          {amountDisplay}
        </Text>

        {/* Recipient Address */}
        <TouchableOpacity
          testID="send-confirm-copy-address"
          style={styles.addressButton}
          onPress={handleCopy}
          activeOpacity={0.7}
          accessibilityRole="button"
          // The tick is the only confirmation a sighted user gets; without the
          // label changing with it, a screen-reader user presses copy and is
          // told nothing happened.
          accessibilityLabel={copied ? t('actions.copied') : t('token.send.copyRecipientAddress')}
        >
          <BlurContainer style={styles.addressContainer}>
            <View style={styles.addressColumn}>
              {/* Mono in 4-character chunks: fixed-width chunks are what let
                  the eye compare a prefix and suffix positionally. */}
              <Text style={styles.addressText} testID="send-confirm-address">
                {chunkAddress(destinationAddress)}
              </Text>
              {resolvedFromDomain !== null && (
                <Text style={styles.resolvedFromText} testID="send-confirm-resolved-from">
                  {t('token.send.resolvedFrom', { domain: resolvedFromDomain })}
                </Text>
              )}
            </View>
            {copied ? (
              <Animated.View style={{ transform: [{ scale: tickScale }] }}>
                <CheckIcon size={ms(iconSize.md)} color={semantic.status.success} />
              </Animated.View>
            ) : (
              <ContentCopySvgIcon size={ms(20)} color={colors.text.secondary} />
            )}
          </BlurContainer>
        </TouchableOpacity>

        {/* Fee Display — on estimation failure keep the row visible as a
            warning instead of hiding it; confirming stays enabled. */}
        {estimatedFee ? (
          <Text style={styles.feeText}>
            {t('token.send.networkFee', 'Network Fee')}: ~{estimatedFee}
          </Text>
        ) : sendHook.feeEstimateFailed ? (
          <Text style={[styles.feeText, styles.errorText]} testID="send-fee-estimate-failed">
            {t('send.fee_estimate_failed', 'Fee could not be estimated')}
          </Text>
        ) : null}

        {/* Error Message */}
        {isFailed && sendHook.error && <Text style={styles.errorText}>{t(sendHook.error)}</Text>}
      </View>

      {/* Bottom Buttons */}
      <View style={[styles.bottomButtons, { paddingBottom: actionRowBottomPadding }]}>
        <SecondaryButton
          testID="send-confirm-cancel-button"
          style={styles.rowButton}
          onPress={isFailed ? onBack : onCancel}
          disabled={isSending}
        >
          {t('actions.cancel', 'Cancel')}
        </SecondaryButton>

        <PrimaryButton
          testID="send-confirm-button"
          style={styles.rowButton}
          onPress={isFailed ? handleRetry : handleConfirm}
          // No spinner: the confirm tap hands the screen to the wait, and the
          // passage is the answer. DESIGN.md makes send the second deliberate
          // exception to the button-loader rule — a loader on a button that is
          // leaving the screen says the same thing twice.
          disabled={isSending}
        >
          {isFailed
            ? t('token.send.confirmAgain', 'Confirm Again')
            : t('actions.confirm', 'Confirm')}
        </PrimaryButton>
      </View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(spacing.headerPadding),
  },
  // Token Icon
  tokenIconWrapper: {
    marginBottom: vs(spacing.lg),
  },
  // Amount
  amountText: {
    fontSize: ms(fontSize.title),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: vs(spacing['2xl']),
  },
  // Address
  addressButton: {
    alignSelf: 'stretch',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: ms(borderRadius.md),
    paddingVertical: vs(spacing.lg),
    paddingHorizontal: s(spacing.lg),
    gap: s(spacing.base),
  },
  addressColumn: {
    flex: 1,
    minWidth: 0,
    gap: vs(spacing.xs),
  },
  addressText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.mono,
    color: colors.text.primary,
  },
  resolvedFromText: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
  },
  // Fee
  feeText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
    marginTop: vs(spacing.lg),
    textAlign: 'center',
  },
  // Error
  errorText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: semantic.status.danger,
    marginTop: vs(spacing.md),
    textAlign: 'center',
  },
  // Bottom Buttons
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: s(spacing.headerPadding),
    paddingTop: vs(spacing.md),
    gap: s(spacing.md),
  },
  // Size only. Radius, fill, border, bezel and material belong to the button:
  // Cancel used to paint a salmon-bordered fill with an outer glow and Confirm
  // a `gradients.primary` box at `borderRadius.lg`, so the pair that performs
  // one decision read as two unrelated controls at the wrong radius.
  rowButton: {
    flex: 1,
    minHeight: vs(componentSizes.buttonHeightMedium),
    height: vs(componentSizes.buttonHeightMedium),
  },
});

export default StepConfirmation;
