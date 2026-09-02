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
import { CheckIcon, CopyIcon, iconSize } from '../../icons';
import { useTranslation } from 'react-i18next';
import {
  chunkAddress,
  colors,
  semantic,
  spacing,
  componentSizes,
  fontFamily,
  fontWeight,
  useSendTransaction,
  copyToClipboard,
  borderRadius,
  borderWidth,
  fontSize,
  opacity,
  duration,
  easing,
  tabularNums,
  useCopyFeedback,
  formatTokenAmount,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import { PrimaryButton, SecondaryButton } from '../Button';
import type { StepConfirmationProps } from './types';

import { CopyTick } from '../CopyTick';
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
  ...tabularNums.css,
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

const AddressColumn = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '2px',
  flex: 1,
  minWidth: 0,
});

const AddressText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.regular,
  fontFamily: fontFamily.mono,
  color: colors.text.primary,
  textAlign: 'left',
  overflowWrap: 'anywhere',
});

const ResolvedFromText = styled(Typography)({
  fontSize: fontSize.xs,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  textAlign: 'left',
  overflowWrap: 'anywhere',
});

// Fee
const FeeText = styled(Typography)({
  ...tabularNums.css,
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
  color: semantic.status.danger,
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

// Layout only. The two controls in this row used to paint themselves: Cancel
// carried a salmon outline, a cancel fill and an outer glow, and Confirm was a
// `gradients.primaryCSS` box at `borderRadius.lg` — a flat rectangle where the
// shared button draws a flesh-textured pill. They differ by material now, not
// by shape.
const ButtonSlot = styled('div')({
  flex: 1,
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
  const { copied, trigger: showCopied } = useCopyFeedback();

  const sendHook = useSendTransaction({ account, blockchain });

  // What the transfer will actually pay. When a `.sol` domain was typed, the
  // resolved address is the destination — showing the domain here would ask
  // the user to sign for something this screen never displayed.
  const destinationAddress = resolvedRecipientAddress || recipientAddress;
  const resolvedFromDomain =
    resolvedRecipientAddress && resolvedRecipientAddress !== recipientAddress
      ? recipientAddress
      : null;

  // Amount display
  const amountDisplay = useMemo(() => {
    const numAmount = parseFloat(amount);
    // Rounding unchanged; the separator follows the app's language rather than
    // the host's, per PRODUCT.md's i18n constraint.
    return `${formatTokenAmount(Number(numAmount.toFixed(6)))} ${token.symbol}`;
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
    const success = await copyToClipboard(destinationAddress);
    if (success) {
      showCopied();
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
          // The tick is the only confirmation a sighted user gets; without the
          // label changing with it, a screen-reader user presses copy and is
          // told nothing happened.
          aria-label={copied ? t('actions.copied') : t('token.send.copyRecipientAddress')}
          data-testid="send-confirm-copy-address"
        >
          <BlurContainer style={{ borderRadius: borderRadius.md }}>
            <AddressContent>
              <AddressColumn>
                {/* Mono in 4-character chunks: fixed-width chunks are what let
                    the eye compare a prefix and suffix positionally. */}
                <AddressText title={destinationAddress} data-testid="send-confirm-address">
                  {chunkAddress(destinationAddress)}
                </AddressText>
                {resolvedFromDomain !== null && (
                  <ResolvedFromText data-testid="send-confirm-resolved-from">
                    {t('token.send.resolvedFrom', { domain: resolvedFromDomain })}
                  </ResolvedFromText>
                )}
              </AddressColumn>
              <CopyTick
                copied={copied}
                style={{ flexShrink: 0 }}
                copy={<CopyIcon size={iconSize.md} color={colors.text.secondary} />}
                tick={<CheckIcon size={iconSize.md} color={semantic.status.success} />}
              />
            </AddressContent>
          </BlurContainer>
        </AddressButton>

        {/* Fee Display — on estimation failure keep the row visible as a
            warning instead of hiding it; confirming stays enabled.

            The estimate arrives as a canonical numeric string from the chain
            layer, which is where it has to stay canonical — a fee that other
            code may compare or carry must not be language-shaped at the
            source. The language is applied here, at the one place it is read
            by a person, per PRODUCT.md's i18n constraint. */}
        {estimatedFee ? (
          <FeeText>
            {t('token.send.networkFeeAmount', { fee: formatTokenAmount(estimatedFee) })}
          </FeeText>
        ) : sendHook.feeEstimateFailed ? (
          <FeeText sx={{ color: semantic.status.danger }} data-testid="send-fee-estimate-failed">
            {t('send.fee_estimate_failed', 'Fee could not be estimated')}
          </FeeText>
        ) : null}

        {/* Error Message */}
        {isFailed && sendHook.error && <ErrorText>{t(sendHook.error)}</ErrorText>}
      </CenterContent>

      {/* Bottom Buttons */}
      <BottomButtons>
        <ButtonSlot>
          <SecondaryButton
            onPress={isFailed ? onBack : onCancel}
            disabled={isSending}
            testID="send-confirm-cancel-button"
            // Height is the only legal override: this row is shorter than a
            // screen's committing action. Radius, fill, border and bezel
            // belong to the button.
            style={{ height: componentSizes.buttonHeightMedium }}
          >
            {t('actions.cancel')}
          </SecondaryButton>
        </ButtonSlot>

        <ButtonSlot>
          <PrimaryButton
            onPress={isFailed ? handleRetry : handleConfirm}
            loading={isSending}
            disabled={isSending}
            testID="send-confirm-button"
            style={{ height: componentSizes.buttonHeightMedium, whiteSpace: 'nowrap' }}
          >
            {isFailed ? t('token.send.confirmAgain') : t('actions.confirm')}
          </PrimaryButton>
        </ButtonSlot>
      </BottomButtons>
    </Container>
  );
}
