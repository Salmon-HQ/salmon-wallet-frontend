import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from '../../utils/haptics';
import { borderWidth, colors, ms, vs, s, fontSize, fontFamilyNative, borderRadius, getShortAddress, spacing, } from '@salmon/shared';

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

/** Duration to show the copied state (ms) */
const COPIED_FEEDBACK_DURATION = 1500;

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
  const [copied, setCopied] = useState(false);

  const displayAddress = getTruncatedAddress(address, truncate);

  const handleCopy = useCallback(async () => {
    try {
      // Copy to clipboard
      await Clipboard.setStringAsync(address);

      // Trigger haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Show visual feedback
      setCopied(true);

      // Reset after duration
      setTimeout(() => {
        setCopied(false);
      }, COPIED_FEEDBACK_DURATION);
    } catch (error) {
      // Silently fail - clipboard might not be available in some environments
      console.warn('Failed to copy address:', error);
    }
  }, [address]);

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
          accessibilityLabel={t('transactions.detail.copyAddressLabel', { label })}
          accessibilityHint={t('transactions.detail.copyAddressHint')}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={16}
            color={copied ? colors.status.success : colors.text.secondary}
          />
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
  address: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.regular,
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
    backgroundColor: `${colors.status.success}20`,
  },
});

export default AddressCopyRow;
