/**
 * ReceiveSheet - Dialog for receiving tokens (web/extension version)
 *
 * Migrated from packages/ui (React Native) to use MUI Dialog.
 * Features:
 * - QR code for wallet address
 * - Full address display (selectable)
 * - Copy address button
 * - Responsive QR code sizing
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import { CheckIcon, CopyIcon, iconSize } from '../../icons';
import {
  colors,
  getChainDisplayName,
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
  easing,
  useCopyFeedback,
} from '@salmon/shared';
import { useTranslation } from 'react-i18next';
import { QRCode } from '../QRCode';
import { BaseSheetDialog } from '../BaseSheetDialog';
import { FleshBackground } from '../FleshBackground';
import { WarningNotice } from '../WarningNotice';
import type { ReceiveSheetProps } from './types';

// ============================================================================
// Constants
// ============================================================================

const QR_SIZE_DEFAULT = componentSizes.qrCodeSize;

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

const ChainBadge = styled(Typography)({
  backgroundColor: colors.background.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: borderRadius.full,
  padding: `${spacing.xs}px ${spacing.md}px`,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  letterSpacing: letterSpacing.wide,
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
  fontSize: fontSize.bodyLg,
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
  blockchain,
  onCopy,
  className,
  style,
}: ReceiveSheetProps) {
  const { copied, trigger: showCopied, reset: resetCopied } = useCopyFeedback();
  const [qrSize, setQrSize] = useState<number>(QR_SIZE_DEFAULT);
  const contentRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // A deposit made on the wrong chain is gone for good, so the chain is named
  // twice: an opaque badge with a label (never a tint — DESIGN.md) and a
  // warning that says what "wrong network" costs.
  const chainName = getChainDisplayName(blockchain);

  // Reset copied state when dialog closes
  useEffect(() => {
    if (!visible) {
      resetCopied();
    }
  }, [visible, resetCopied]);

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
    showCopied();
  }, [onCopy, address, showCopied]);

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
          {/* Chain badge — opaque fill and a written label, so it survives a
              colorblind reader, a narrow column and a screenshot. */}
          <ChainBadge data-testid="receive-chain-badge">
            {t('token.send.blockchainAddress', { blockchain: chainName })}
          </ChainBadge>

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

          {/* Wrong-network deposits are unrecoverable, so say so here rather
              than leaving the chain to be inferred from the address format. */}
          <WarningNotice
            tone="warning"
            title={t('token.receive.networkOnlyTitle', { chain: chainName })}
          >
            {t('token.receive.networkOnlyBody', { chain: chainName })}
          </WarningNotice>

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
                <CheckIcon weight="bold" size={iconSize.md} color={colors.button.primaryText} />
              ) : (
                <CopyIcon weight="bold" size={iconSize.md} color={colors.button.primaryText} />
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
