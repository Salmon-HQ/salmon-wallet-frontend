import {
  colors,
  fontSize,
  getChainDisplayName,
  letterSpacing,
  spacing,
  borderRadius,
  componentSizes,
  fontFamilyNative,
  ms,
  s,
  vs,
  lineHeight,
  semantic,
} from '@salmon/shared';
import React, { useCallback, useEffect } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { FleshBackground } from '../FleshBackground';
import { WarningNotice } from '../WarningNotice';
import { ContentCopySvgIcon } from '../Icon/SvgIcons';
import QRCode from '../QRCode';
import type { ReceiveSheetProps } from './types';

// Layout constants
const CONTENT_PADDING_HORIZONTAL = 24;

/**
 * ReceiveSheet - Bottom sheet modal for receiving tokens
 *
 * Features:
 * - Slide-up animation from bottom
 * - Rounded top corners with border (26px radius)
 * - Drag handle indicator
 * - QR code for wallet address
 * - Full address display
 * - Copy address button
 * - Backdrop with tap-to-dismiss
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
export const ReceiveSheet: React.FC<ReceiveSheetProps> = ({
  visible,
  onClose,
  address,
  blockchain,
  onCopy,
  style,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const { copied, scale: tickScale, trigger: showCopied, reset: resetCopied } = useCopyFeedback();
  const { t } = useTranslation();
  const { spaciousContentBottomPadding } = useBottomSheetChrome();

  // Calculate QR size: full width minus padding and border
  const qrSize = screenWidth - CONTENT_PADDING_HORIZONTAL * 2 - componentSizes.qrBorderWidth * 2;

  // Reset copied state when sheet closes
  useEffect(() => {
    if (!visible) {
      resetCopied();
    }
  }, [visible, resetCopied]);

  const handleCopyPress = useCallback(async () => {
    try {
      const succeeded = await onCopy?.();
      if (succeeded) {
        showCopied();
      }
    } catch {
      // Copy failed — keep showing the copy icon so the feedback stays honest
    }
  }, [onCopy, showCopied]);

  const title = <Text style={styles.title}>{t('token.receive.title')}</Text>;

  // A deposit made on the wrong chain is gone for good, so the chain is named
  // twice: an opaque badge with a label (never a tint — DESIGN.md) and a
  // warning that says what "wrong network" costs.
  const chainName = getChainDisplayName(blockchain);

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      title={title}
      testID="receive-sheet"
      style={[styles.sheetContainer, style]}
    >
      {/* Content */}
      <View style={[styles.content, { paddingBottom: spaciousContentBottomPadding }]}>
        {/* Chain badge — opaque fill and a written label, so it survives a
            colorblind reader, a narrow column and a screenshot. */}
        <View style={styles.chainBadge} testID="receive-chain-badge">
          <Text style={styles.chainBadgeText}>
            {t('token.send.blockchainAddress', { blockchain: chainName })}
          </Text>
        </View>

        {/* QR Code Container */}
        <View style={styles.qrContainer} testID="receive-qr-code">
          {/* The QR is data, not an accent. Painting it salmon put two warm
              objects on one sheet — the code and the copy button — and the
              accent belongs on the control that acts. Neutral also maximises
              module contrast for a scanner: 16.37:1 instead of 6.50:1. */}
          <QRCode
            value={address}
            size={qrSize}
            backgroundColor={semantic.text.primary}
            color={semantic.depth.abyss}
          />
        </View>

        {/* Address */}
        <Text style={styles.address} selectable testID="receive-address">
          {address}
        </Text>

        {/* Wrong-network deposits are unrecoverable, so say so here rather
            than leaving the chain to be inferred from the address format. */}
        <WarningNotice
          tone="warning"
          title={t('token.receive.networkOnlyTitle', { chain: chainName })}
        >
          {t('token.receive.networkOnlyBody', { chain: chainName })}
        </WarningNotice>

        {/* Copy Button */}
        <TouchableOpacity
          testID="receive-copy-button"
          style={styles.copyButton}
          onPress={handleCopyPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={copied ? t('actions.copied') : t('token.receive.copyAddress')}
        >
          {/* The flesh: the myosepta of a cut fillet, pressed into the salmon
              fill. Every band is paler than the fill, so it can only raise the
              luminance under the label. */}
          <FleshBackground />
          {copied ? (
            <Animated.View style={{ transform: [{ scale: tickScale }] }}>
              <Ionicons name="checkmark" size={ms(23)} color={semantic.accent.onFill} />
            </Animated.View>
          ) : (
            <ContentCopySvgIcon size={ms(23)} color={semantic.accent.onFill} />
          )}
          <Text style={styles.copyButtonText} numberOfLines={1} ellipsizeMode="tail">
            {copied ? t('token.receive.copied') : t('token.receive.copyAddress')}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheetContainer>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    minHeight: undefined,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  title: {
    fontSize: ms(fontSize['2xl']),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: letterSpacing.wide,
    lineHeight: ms(24 * lineHeight.condensed),
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: s(CONTENT_PADDING_HORIZONTAL),
    gap: vs(componentSizes.receiveContentGap),
  },
  qrContainer: {
    borderRadius: ms(borderRadius.xl),
    borderWidth: componentSizes.qrBorderWidth,
    borderColor: colors.text.primary,
    overflow: 'hidden',
    marginTop: vs(spacing.headerPadding),
  },
  chainBadge: {
    backgroundColor: semantic.surface.raised,
    borderRadius: ms(borderRadius.full),
    borderWidth: 1,
    borderColor: semantic.border.raised,
    paddingVertical: vs(spacing.xs),
    paddingHorizontal: s(spacing.md),
  },
  chainBadgeText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.primary,
    letterSpacing: letterSpacing.wide,
  },
  address: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: letterSpacing.change,
    lineHeight: ms(14 * lineHeight.condensed),
  },
  copyButton: {
    flexDirection: 'row',
    // The flesh is drawn at absolute-fill; clip it to the pill's own radius.
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.button.primaryBackground,
    borderRadius: ms(borderRadius.lg),
    minWidth: s(componentSizes.copyButtonWidth),
    maxWidth: '100%',
    minHeight: vs(componentSizes.buttonHeightCompact),
    paddingVertical: vs(spacing.xs),
    paddingHorizontal: s(spacing.lg),
    gap: s(spacing.xs),
  },
  copyButtonText: {
    flexShrink: 1,
    fontSize: ms(fontSize.bodyLg),
    fontFamily: fontFamilyNative.bold,
    color: colors.button.primaryText,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});

export default ReceiveSheet;
