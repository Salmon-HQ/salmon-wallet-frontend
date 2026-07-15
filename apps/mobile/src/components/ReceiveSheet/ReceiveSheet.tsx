import {
  colors,
  fontSize,
  letterSpacing,
  spacing,
  borderRadius,
  componentSizes,
  fontFamilyNative,
  ms,
  s,
  vs,
  lineHeight,
} from '@salmon/shared';
import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { ContentCopySvgIcon } from '../Icon/SvgIcons';
import QRCode from '../QRCode';
import type { ReceiveSheetProps } from './types';

// Layout constants
const CONTENT_PADDING_HORIZONTAL = 24;
const COPY_FEEDBACK_DURATION = 2000;

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
  onCopy,
  style,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();
  const { spaciousContentBottomPadding } = useBottomSheetChrome();

  // Calculate QR size: full width minus padding and border
  const qrSize = screenWidth - (CONTENT_PADDING_HORIZONTAL * 2) - (componentSizes.qrBorderWidth * 2);

  // Reset copied state when sheet closes
  useEffect(() => {
    if (!visible) {
      setCopied(false);
    }
  }, [visible]);

  const handleCopyPress = useCallback(() => {
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
  }, [onCopy]);

  const title = (
    <Text style={styles.title}>{t('token.receive.title')}</Text>
  );

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
        {/* QR Code Container */}
        <View style={styles.qrContainer} testID="receive-qr-code">
          <QRCode
            value={address}
            size={qrSize}
            backgroundColor={colors.button.primaryBackground}
            color={colors.button.primaryText}
          />
        </View>

        {/* Address */}
        <Text style={styles.address} selectable testID="receive-address">
          {address}
        </Text>

        {/* Copy Button */}
        <TouchableOpacity
          testID="receive-copy-button"
          style={styles.copyButton}
          onPress={handleCopyPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('token.receive.copyAddress')}
        >
          {copied ? (
            <Ionicons name="checkmark" size={ms(23)} color={colors.button.primaryText} />
          ) : (
            <ContentCopySvgIcon size={ms(23)} color={colors.button.primaryText} />
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
    fontSize: ms(fontSize.md),
    fontFamily: fontFamilyNative.bold,
    color: colors.button.primaryText,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});

export default ReceiveSheet;
