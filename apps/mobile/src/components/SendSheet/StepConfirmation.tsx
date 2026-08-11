import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  colors,
  gradients,
  shadows,
  fontFamilyNative,
  fontScaleCap,
  ms,
  vs,
  s,
  useSendTransaction,
  fontSize,
  borderRadius,
  borderWidth,
  spacing,
  opacity,
  componentSizes,
} from '@salmon/shared';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { ContentCopySvgIcon } from '../Icon/SvgIcons';
import { BlurContainer } from '../BlurContainer';
import { TokenLogo } from '../TokenLogo';
import type { StepConfirmationProps } from './types';

// ============================================================================
// Constants
// ============================================================================

const BUTTON_SHADOW = shadows.button;

// ============================================================================
// Component
// ============================================================================

export const StepConfirmation: React.FC<StepConfirmationProps> = ({
  token,
  recipientAddress,
  resolvedRecipientAddress,
  amount,
  blockchain,
  account,
  onBack,
  onCancel,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { actionRowBottomPadding } = useBottomSheetChrome();
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sendHook = useSendTransaction({ account, blockchain });
  // Amount display
  const amountDisplay = useMemo(() => {
    const numAmount = parseFloat(amount);
    return `${Number(numAmount.toFixed(6))} ${token.symbol}`;
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

  // Handle copy address
  const handleCopy = useCallback(async () => {
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(recipientAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }, [recipientAddress]);

  // Handle retry
  const handleRetry = useCallback(() => {
    sendHook.reset();
  }, [sendHook]);

  const isSending = sendHook.status === 'creating' || sendHook.status === 'sending';
  const isFailed = sendHook.status === 'failed';

  // Truncate address for display
  const truncatedAddress = useMemo(() => {
    if (recipientAddress.length <= 20) return recipientAddress;
    return recipientAddress;
  }, [recipientAddress]);

  return (
    <View style={styles.container}>
      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Large Token Icon */}
        <View style={styles.tokenIconWrapper}>
          <TokenLogo uri={token.logo || undefined} symbol={token.symbol} size={ms(100)} />
        </View>

        {/* Amount */}
        <Text style={styles.amountText}>{amountDisplay}</Text>

        {/* Recipient Address */}
        <TouchableOpacity
          testID="send-confirm-copy-address"
          style={styles.addressButton}
          onPress={handleCopy}
          activeOpacity={0.7}
          accessibilityLabel={t('token.send.copyRecipientAddress')}
        >
          <BlurContainer style={styles.addressContainer}>
            <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
              {truncatedAddress}
            </Text>
            {copied ? (
              <Ionicons name="checkmark" size={ms(20)} color={colors.status.success} />
            ) : (
              <ContentCopySvgIcon size={ms(20)} color={colors.text.secondary} />
            )}
          </BlurContainer>
        </TouchableOpacity>

        {/* Fee Display */}
        {estimatedFee && (
          <Text style={styles.feeText}>
            {t('token.send.networkFee', 'Network Fee')}: ~{estimatedFee}
          </Text>
        )}

        {/* Error Message */}
        {isFailed && sendHook.error && (
          <Text style={styles.errorText}>{t(sendHook.error)}</Text>
        )}
      </View>

      {/* Bottom Buttons */}
      <View style={[styles.bottomButtons, { paddingBottom: actionRowBottomPadding }]}>
        <TouchableOpacity
          testID="send-confirm-cancel-button"
          style={styles.cancelButton}
          onPress={isFailed ? onBack : onCancel}
          activeOpacity={0.7}
          disabled={isSending}
        >
          <Text style={styles.cancelButtonText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={fontScaleCap.chrome}>
            {t('actions.cancel', 'CANCEL').toUpperCase()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="send-confirm-button"
          style={[styles.confirmButton, isSending && styles.confirmButtonDisabled]}
          onPress={isFailed ? handleRetry : handleConfirm}
          activeOpacity={0.7}
          disabled={isSending}
        >
          <LinearGradient
            colors={[...gradients.primary.colors]}
            style={styles.confirmButtonGradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.4 }}
          >
            {isSending ? (
              <View style={styles.sendingRow}>
                <ActivityIndicator size="small" color={colors.text.primary} />
                <Text style={styles.confirmButtonText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={fontScaleCap.chrome}>{t('token.send.sending', 'Sending...')}</Text>
              </View>
            ) : (
              <Text style={styles.confirmButtonText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={fontScaleCap.chrome}>
                {isFailed ? t('actions.retry', 'RETRY').toUpperCase() : t('actions.confirm', 'CONFIRM').toUpperCase()}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
  addressText: {
    flex: 1,
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
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
    color: colors.status.error,
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
  cancelButton: {
    flex: 1,
    minHeight: vs(componentSizes.buttonHeightMedium),
    borderRadius: ms(borderRadius.lg),
    borderWidth: borderWidth.thin,
    borderColor: colors.accent.border,
    backgroundColor: colors.button.cancelBackground,
    alignItems: 'center',
    justifyContent: 'center',
    ...BUTTON_SHADOW,
  },
  cancelButtonText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
  },
  confirmButton: {
    flex: 1,
    minHeight: vs(componentSizes.buttonHeightMedium),
    borderRadius: ms(borderRadius.lg),
    borderWidth: borderWidth.thin,
    borderColor: colors.accent.border,
    overflow: 'hidden',
    ...BUTTON_SHADOW,
  },
  confirmButtonDisabled: {
    opacity: opacity.medium,
  },
  confirmButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
  },
  sendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
  },
});

export default StepConfirmation;
