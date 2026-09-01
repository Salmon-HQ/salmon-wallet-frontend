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
import { CheckIcon, CopyIcon } from '../../icons';
import { useTranslation } from 'react-i18next';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { BrandMark } from '../BrandMark';
import { Thermocline } from '../Thermocline';
import { FleshBackground } from '../FleshBackground';
import { WarningNotice } from '../WarningNotice';
import QRCode from '../QRCode';
import type { ReceiveSheetProps } from './types';

// Layout constants
const CONTENT_PADDING_HORIZONTAL = 24;

// Brand mark inside the QR: the knockout (quiet zone behind the mark) covers
// 24% of the code's width — under the ~30% of modules a level-H code can lose
// and still scan — and the mark sits inside it with breathing room.
const QR_LOGO_KNOCKOUT_RATIO = 0.24;
const QR_LOGO_MARK_RATIO = 0.66; // of the knockout, so the mark never touches modules

/**
 * ReceiveSheet - Bottom sheet modal for receiving tokens
 *
 * Features:
 * - Slide-up animation from bottom
 * - Rounded top corners with border (26px radius)
 * - Drag handle indicator
 * - QR code for wallet address
 * - Copy address button (the only path to the address string)
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
  const qrLogoKnockoutSize = Math.round(qrSize * QR_LOGO_KNOCKOUT_RATIO);

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
      // The sheet's ground is the thermocline at its thick tier — a sheet is
      // the one surface Android may blur (at most one per screen), and thick
      // is what lets the secondary copy below keep its contrast floor.
      background={<Thermocline tier="thick" style={styles.thermocline} />}
    >
      {/* Content */}
      <View style={[styles.content, { paddingBottom: spaciousContentBottomPadding }]}>
        {/* The badge labels the QR, not the sheet, so the two travel as one
            group: a tight gap inside it, the content gap outside it. */}
        <View style={styles.qrGroup}>
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
              // The centered mark hides modules, so the code carries level-H
              // redundancy — a wallet QR must stay scannable before it looks good.
              ecLevel="H"
            />
            {/* The salmon mark, centered on its own knockout so no module
              collides with it. Same inks as the code: knockout is the code's
              ground, mark is the module ink. */}
            <View style={styles.qrLogoOverlay} pointerEvents="none">
              <View
                testID="receive-qr-logo"
                style={[
                  styles.qrLogoKnockout,
                  {
                    width: qrLogoKnockoutSize,
                    height: qrLogoKnockoutSize,
                    borderRadius: qrLogoKnockoutSize / 4,
                  },
                ]}
              >
                <BrandMark
                  size={Math.round(qrLogoKnockoutSize * QR_LOGO_MARK_RATIO)}
                  color={semantic.depth.abyss}
                />
              </View>
            </View>
          </View>
        </View>

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
              <CheckIcon weight="bold" size={ms(23)} color={semantic.accent.onFill} />
            </Animated.View>
          ) : (
            <CopyIcon weight="bold" size={ms(23)} color={semantic.accent.onFill} />
          )}
          {/* The written address is gone from the sheet, so this control is the
              only path to the string: the copied state has to be announced,
              not only painted. */}
          <Text
            style={styles.copyButtonText}
            numberOfLines={1}
            ellipsizeMode="tail"
            accessibilityLiveRegion="polite"
          >
            {copied ? t('token.receive.copied') : t('token.receive.copyAddress')}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheetContainer>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    maxHeight: '92%',
    overflow: 'hidden',
  },
  // The material fills the sheet and clips itself to the sheet's own top
  // corners; the refraction strip rides its top edge.
  thermocline: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: borderRadius.card,
    borderTopRightRadius: borderRadius.card,
  },
  title: {
    fontSize: ms(fontSize.headline),
    fontFamily: fontFamilyNative.semiBold,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: letterSpacing.snug,
    lineHeight: ms(24 * lineHeight.condensed),
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: s(CONTENT_PADDING_HORIZONTAL),
    gap: vs(componentSizes.receiveContentGap),
  },
  // The badge sits `spacing.md` over the QR it labels — clearly tighter than
  // the content gap that separates the group from the sheet title above it.
  qrGroup: {
    alignItems: 'center',
    gap: vs(spacing.md),
    marginTop: vs(spacing.headerPadding),
  },
  qrContainer: {
    borderRadius: ms(borderRadius.xl),
    borderWidth: componentSizes.qrBorderWidth,
    borderColor: colors.text.primary,
    overflow: 'hidden',
  },
  qrLogoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLogoKnockout: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semantic.text.primary,
  },
  chainBadge: {
    backgroundColor: semantic.surface.raised,
    // A text chip takes the chip step, not a pill: the Control Radius Rule
    // reserves `full` for what genuinely is a circle (avatars, toggles).
    borderRadius: ms(borderRadius.r1),
    borderWidth: 1,
    borderColor: semantic.border.raised,
    paddingVertical: vs(spacing.xs),
    paddingHorizontal: s(spacing.md),
  },
  chainBadgeText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.primary,
    letterSpacing: letterSpacing.label,
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
  },
});

export default ReceiveSheet;
