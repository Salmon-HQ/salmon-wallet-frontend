/**
 * ReceiveSheet - Dialog for receiving tokens (web/extension version)
 *
 * Migrated from packages/ui (React Native) to use MUI Dialog.
 * Features:
 * - QR code for wallet address
 * - Full address display (selectable)
 * - Copy address button
 * - ScalesBackground decorative pattern
 * - Responsive QR code sizing
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import {
  colors,
  palette,
  spacing,
  borderRadius,
  componentSizes,
  copyToClipboard,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  opacity,
  duration,
  durationMs,
  easing,
} from '@salmon/shared';
import { useTranslation } from 'react-i18next';
import { QRCode } from '../QRCode';
import { BaseSheetDialog } from '../BaseSheetDialog';
import { FleshBackground } from '../FleshBackground';
import type { ReceiveSheetProps } from './types';

// ============================================================================
// Constants
// ============================================================================

const QR_SIZE_DEFAULT = componentSizes.qrCodeSize;
const COPY_FEEDBACK_DURATION = durationMs.feedbackLong;

// ============================================================================
// Styled Components
// ============================================================================

const ContentWrapper = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: componentSizes.receiveContentGap,
  flex: 1,
});

const QRContainer = styled(Box)({
  borderRadius: borderRadius.xl,
  border: `${componentSizes.qrBorderWidth}px solid ${palette.neutral[0]}`,
  overflow: 'hidden',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const AddressText = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  textAlign: 'center',
  letterSpacing: letterSpacing.change,
  lineHeight: lineHeight.condensed,
  wordBreak: 'break-all',
  userSelect: 'text',
  cursor: 'text',
  padding: `0 ${spacing.md}px`,
});

const CopyButton = styled(ButtonBase)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.button.primaryBackground,
  borderRadius: borderRadius.lg,
  // The flesh is drawn at absolute-fill; clip it to the pill's own radius.
  overflow: 'hidden',
  width: componentSizes.copyButtonWidth,
  height: componentSizes.buttonHeightCompact,
  gap: spacing.xs,
  transition: `opacity ${duration.normal} ${easing.ease}`,
  '&:hover': {
    opacity: opacity.high,
  },
  '&:active': {
    opacity: opacity.medium,
  },
});

/** Sits above the flesh, never under it. Decoration is never a hit target. */
const OnFillContent = styled('span')({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing.xs,
});

const CopyButtonText = styled(Typography)({
  fontSize: fontSize.md,
  fontWeight: fontWeight.extraBold,
  color: colors.button.primaryText,
  textAlign: 'center',
  textTransform: 'capitalize',
});

// ============================================================================
// ReceiveSheet Component
// ============================================================================

/**
 * ReceiveSheet - Dialog for displaying a wallet's receive address with QR code.
 *
 * @example
 * ```tsx
 * <ReceiveSheet
 *   visible={isVisible}
 *   onClose={() => setIsVisible(false)}
 *   address="3NE4QmUT15PGZTPpqHjGH6VKUdXrpTKb82NGqYuQdXdL"
 *   onCopy={() => copyToClipboard(address)}
 * />
 * ```
 */
export function ReceiveSheet({
  visible,
  onClose,
  address,
  onCopy,
  className,
  style,
}: ReceiveSheetProps) {
  const [copied, setCopied] = useState(false);
  const [qrSize, setQrSize] = useState<number>(QR_SIZE_DEFAULT);
  const contentRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Reset copied state when dialog closes
  useEffect(() => {
    if (!visible) {
      setCopied(false);
    }
  }, [visible]);

  // Measure container width for responsive QR sizing
  useEffect(() => {
    if (!visible || !contentRef.current) return;

    const measure = () => {
      if (contentRef.current) {
        const width = contentRef.current.clientWidth;
        if (width > 0) {
          const padding = spacing.xl * 2;
          const border = componentSizes.qrBorderWidth * 2;
          setQrSize(Math.floor(width - padding - border));
        }
      }
    };

    // Measure after dialog animation settles
    const timer = setTimeout(measure, 50);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleCopy = useCallback(async () => {
    if (onCopy) {
      onCopy();
    } else {
      await copyToClipboard(address);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
  }, [onCopy, address]);

  return (
    <BaseSheetDialog
      visible={visible}
      onClose={onClose}
      size="small"
      colorScheme="dialog"
      ariaLabelledBy="receive-sheet-title"
      className={className}
      style={style}
    >
      <BaseSheetDialog.StandardHeader title={t('token.receive.title')} />

      <BaseSheetDialog.Content
        padding="xl"
        style={{ paddingTop: spacing.xl, paddingBottom: spacing['2xl'], flex: 1 }}
      >
        <ContentWrapper ref={contentRef} data-testid="receive-sheet">
          {/* QR Code */}
          <QRContainer data-testid="receive-qr-code">
            <QRCode
              value={address}
              size={qrSize}
              backgroundColor={palette.neutral[0]}
              color={palette.neutral[1000]}
            />
          </QRContainer>

          {/* Full Address */}
          <AddressText data-testid="receive-address">{address}</AddressText>

          {/* Copy Button */}
          <CopyButton
            onClick={handleCopy}
            aria-label={t('token.receive.copyAddress')}
            data-testid="receive-copy-button"
          >
            {/* The flesh: the myosepta of a cut fillet, pressed into the
                salmon fill. Every band is paler than the fill, so it can only
                raise the luminance under the label. */}
            <FleshBackground />
            <OnFillContent>
              {copied ? (
                <CheckIcon sx={{ fontSize: fontSize.xl, color: colors.button.primaryText }} />
              ) : (
                <ContentCopyIcon sx={{ fontSize: fontSize.xl, color: colors.button.primaryText }} />
              )}
              <CopyButtonText>
                {copied ? t('token.receive.copied') : t('token.receive.copyAddress')}
              </CopyButtonText>
            </OnFillContent>
          </CopyButton>
        </ContentWrapper>
      </BaseSheetDialog.Content>
    </BaseSheetDialog>
  );
}
