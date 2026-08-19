import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { CheckIcon, CopyIcon, iconSize } from '../../icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from '../../utils/haptics';
import {
  borderRadius,
  borderWidth,
  colors,
  fontFamilyNative,
  fontSize,
  getShortAddress,
  ms,
  s,
  semantic,
  spacing,
  vs,
} from '@salmon/shared';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';

// ============================================================================
// Types
// ============================================================================

export interface AddressCopyRowProps {
  /** Label for the address (e.g., "From", "To", "Contract") */
  label: string;
  /** The full address to display and copy */
  address: string;
  /** How to truncate the address */
  truncate?: 'short' | 'medium' | 'long' | false;
  /** Custom style */
  style?: ViewStyle;
}

// ============================================================================
// Constants
// ============================================================================

/** Character counts for each truncation mode */
const TRUNCATE_CHARS: Record<'short' | 'medium' | 'long', number> = {
  short: 4,
  medium: 6,
  long: 8,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get truncated address based on truncation mode
 */
function getTruncatedAddress(
  address: string,
  truncate: 'short' | 'medium' | 'long' | false
): string {
  if (truncate === false) {
    return address;
  }
  const chars = TRUNCATE_CHARS[truncate];
  return getShortAddress(address, chars) ?? address;
}

// ============================================================================
// Component
// ============================================================================

/**
 * AddressCopyRow - Displays an address with a copy button and haptic feedback
 *
 * Features:
 * - Label on the left
 * - Truncated address display
 * - Copy button on the right
 * - Copies to clipboard on press
 * - Haptic feedback on copy
 * - Visual feedback (checkmark) after copying
 *
 * @example
 * ```tsx
 * <AddressCopyRow
 *   label="From"
 *   address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
 *   truncate="medium"
 * />
 * ```
 */
export const AddressCopyRow: React.FC<AddressCopyRowProps> = ({
  label,
  address,
  truncate = 'medium',
  style,
}) => {
  const { t } = useTranslation();
  const { copied, scale: tickScale, trigger: showCopied } = useCopyFeedback();

  const displayAddress = getTruncatedAddress(address, truncate);

  const handleCopy = useCallback(async () => {
    try {
      // Copy to clipboard
      await Clipboard.setStringAsync(address);

      // Trigger haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Show visual feedback (auto-reverts after motionMs.feedbackHold)
      showCopied();
    } catch (error) {
      // Silently fail - clipboard might not be available in some environments
      console.warn('Failed to copy address:', error);
    }
  }, [address, showCopied]);

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Address and Copy Button */}
      <View style={styles.rightSection}>
        <Text style={styles.address} numberOfLines={1}>
          {displayAddress}
        </Text>

        <TouchableOpacity
          testID={`tx-detail-copy-address-${label}`}
          onPress={handleCopy}
          style={[styles.copyButton, copied && styles.copyButtonCopied]}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={
            copied
              ? t('actions.copied')
              : t('transactions.detail.copyAddressLabel', { label })
          }
          accessibilityHint={copied ? undefined : t('transactions.detail.copyAddressHint')}
        >
          {/* The copy control is the affordance in this row; the address beside it
              is data to read and stays neutral mono. */}
          {copied ? (
            <Animated.View style={{ transform: [{ scale: tickScale }] }}>
              <CheckIcon size={iconSize.sm} color={semantic.status.success} />
            </Animated.View>
          ) : (
            <CopyIcon size={iconSize.sm} color={semantic.text.accent} />
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: vs(spacing.md),
    paddingHorizontal: s(spacing.lg),
    backgroundColor: `${colors.background.card}60`,
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.thin,
    borderColor: colors.border.default,
  },
  label: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: s(spacing.md),
  },
  /**
   * Monospace-Is-For-Scanning Rule: an address is read positionally, prefix
   * against suffix, so its characters must hold a fixed width — Geist Mono at
   * the address size.
   */
  address: {
    fontSize: ms(fontSize.mono),
    fontFamily: fontFamilyNative.mono,
    color: colors.text.primary,
    marginRight: s(spacing.sm),
    flexShrink: 1,
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.background.card}80`,
  },
  copyButtonCopied: {
    backgroundColor: `${semantic.status.success}20`,
  },
});

export default AddressCopyRow;
