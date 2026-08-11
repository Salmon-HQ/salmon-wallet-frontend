/**
 * StepConfirmation - Transaction confirmation step for the SendSheet (web/extension version)
 *
 * Migrated from packages/ui (React Native) to MUI styled components.
 * Features:
 * - Large token icon display
 * - Amount display
 * - Recipient address with copy-to-clipboard
 * - Fee estimation
 * - Confirm/Cancel/Retry action buttons
 * - Loading and error states
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  componentSizes,
  gradients,
  fontFamily,
  fontWeight,
  useSendTransaction,
  copyToClipboard,
  borderRadius,
  borderWidth,
  fontSize,
  shadowsCSS,
  opacity,
  duration,
  durationMs,
  easing,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import type { StepConfirmationProps } from './types';

// ============================================================================
// Constants
// ============================================================================

const COPY_FEEDBACK_DURATION = durationMs.feedbackLong;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  justifyContent: 'space-between',
  minHeight: 0,
});

const CenterContent = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  paddingLeft: spacing.xl,
  paddingRight: spacing.xl,
});

// Token Icon
const TokenIconWrapper = styled(Box)({
  marginBottom: spacing.lg,
});

const TokenIconImage = styled('img')({
  width: componentSizes.tokenIconXL,
  height: componentSizes.tokenIconXL,
  borderRadius: borderRadius.full,
  objectFit: 'cover',
});

const TokenIconFallback = styled(Box)({
  width: componentSizes.tokenIconXL,
  height: componentSizes.tokenIconXL,
  borderRadius: borderRadius.full,
  backgroundColor: colors.background.card,
  border: `${borderWidth.medium}px solid ${colors.border.default}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const TokenIconFallbackText = styled(Typography)({
  fontSize: fontSize['3xl'],
  fontWeight: fontWeight.extraBold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
});

// Amount
const AmountText = styled(Typography)({
  fontSize: fontSize.title,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  textAlign: 'center',
  marginBottom: spacing.xl,
});

// Address
const AddressButton = styled(ButtonBase)({
  maxWidth: '100%',
  borderRadius: borderRadius.md,
  transition: `opacity ${duration.fast} ${easing.ease}`,
  '&:hover': {
    opacity: opacity.high,
  },
});

const AddressContent = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: borderRadius.md,
  padding: `${spacing.lg}px ${spacing.lg}px`,
  gap: spacing.md,
  maxWidth: '100%',
});

const AddressText = styled(Typography)({
  flex: 1,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

// Fee
const FeeText = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  marginTop: spacing.lg,
  textAlign: 'center',
});

// Error
const ErrorText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.status.error,
  marginTop: spacing.md,
  textAlign: 'center',
});

// Bottom Buttons
const BottomButtons = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  paddingLeft: spacing.xl,
  paddingRight: spacing.xl,
  paddingBottom: spacing.xl,
  paddingTop: spacing.md,
  gap: spacing.md,
});

const CancelButton = styled(ButtonBase)<{ disabled?: boolean }>(({ disabled }) => ({
  flex: 1,
  height: componentSizes.buttonHeightMedium,
  borderRadius: borderRadius.lg,
  border: `${borderWidth.thin}px solid ${colors.accent.border}`,
  backgroundColor: colors.button.cancelBackground,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: shadowsCSS.button,
  opacity: disabled ? 0.5 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: `opacity ${duration.fast} ${easing.ease}`,
  '&:hover': {
    opacity: disabled ? 0.5 : 0.85,
  },
}));

const CancelButtonText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
});

const ConfirmButton = styled(ButtonBase)<{ disabled?: boolean }>(({ disabled }) => ({
  flex: 1,
  height: componentSizes.buttonHeightMedium,
  borderRadius: borderRadius.lg,
  overflow: 'hidden',
  border: `${borderWidth.thin}px solid ${colors.accent.border}`,
  opacity: disabled ? 0.7 : 1,
  boxShadow: shadowsCSS.button,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: `opacity ${duration.fast} ${easing.ease}`,
  '&:hover': {
    opacity: disabled ? 0.7 : 0.85,
  },
}));

const ConfirmButtonGradient = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  background: gradients.primaryCSS,
});

const ConfirmButtonText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
});

const SendingRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
});

// ============================================================================
// Component
// ============================================================================

export function StepConfirmation({
  token,
  recipientAddress,
  resolvedRecipientAddress,
  amount,
  blockchain,
  account,
  onBack,
  onCancel,
  onSuccess,
}: StepConfirmationProps) {
  const { t } = useTranslation();
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
    const success = await copyToClipboard(recipientAddress);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
    }
  }, [recipientAddress]);

  // Handle retry
  const handleRetry = useCallback(() => {
    sendHook.reset();
  }, [sendHook]);

  const isSending = sendHook.status === 'creating' || sendHook.status === 'sending';
  const isFailed = sendHook.status === 'failed';

  return (
    <Container>
      {/* Center content */}
      <CenterContent>
        {/* Large Token Icon */}
        <TokenIconWrapper>
          {token.logo ? (
            <TokenIconImage
              src={token.logo}
              alt={token.symbol}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <TokenIconFallback>
              <TokenIconFallbackText>
                {token.symbol?.slice(0, 3).toUpperCase() || '?'}
              </TokenIconFallbackText>
            </TokenIconFallback>
          )}
        </TokenIconWrapper>

        {/* Amount */}
        <AmountText>{amountDisplay}</AmountText>

        {/* Recipient Address */}
        <AddressButton
          onClick={handleCopy}
          aria-label={t('token.send.copyRecipientAddress')}
          data-testid="send-confirm-copy-address"
        >
          <BlurContainer style={{ borderRadius: borderRadius.md }}>
            <AddressContent>
              <AddressText title={recipientAddress}>
                {recipientAddress}
              </AddressText>
              {copied ? (
                <CheckIcon
                  sx={{ fontSize: fontSize.xl, color: colors.status.success, flexShrink: 0 }}
                />
              ) : (
                <ContentCopyIcon
                  sx={{ fontSize: fontSize.xl, color: colors.text.secondary, flexShrink: 0 }}
                />
              )}
            </AddressContent>
          </BlurContainer>
        </AddressButton>

        {/* Fee Display — on estimation failure keep the row visible as a
            warning instead of hiding it; confirming stays enabled. */}
        {estimatedFee ? (
          <FeeText>{t('token.send.networkFeeAmount', { fee: estimatedFee })}</FeeText>
        ) : sendHook.feeEstimateFailed ? (
          <FeeText sx={{ color: colors.status.error }} data-testid="send-fee-estimate-failed">
            {t('send.fee_estimate_failed', 'Fee could not be estimated')}
          </FeeText>
        ) : null}

        {/* Error Message */}
        {isFailed && sendHook.error && (
          <ErrorText>{t(sendHook.error)}</ErrorText>
        )}
      </CenterContent>

      {/* Bottom Buttons */}
      <BottomButtons>
        <CancelButton
          onClick={isFailed ? onBack : onCancel}
          disabled={isSending}
          data-testid="send-confirm-cancel-button"
        >
          <CancelButtonText>{t('actions.cancel').toUpperCase()}</CancelButtonText>
        </CancelButton>

        <ConfirmButton
          onClick={isFailed ? handleRetry : handleConfirm}
          disabled={isSending}
          data-testid="send-confirm-button"
        >
          <ConfirmButtonGradient>
            {isSending ? (
              <SendingRow>
                <CircularProgress size={16} sx={{ color: colors.text.primary }} />
                <ConfirmButtonText>{t('general.sending')}</ConfirmButtonText>
              </SendingRow>
            ) : (
              <ConfirmButtonText>
                {(isFailed ? t('actions.retry') : t('actions.confirm')).toUpperCase()}
              </ConfirmButtonText>
            )}
          </ConfirmButtonGradient>
        </ConfirmButton>
      </BottomButtons>
    </Container>
  );
}
