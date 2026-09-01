import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Text, StyleSheet, ViewStyle } from 'react-native';
import { CheckIcon, CopyIcon, iconSize } from '../../icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from '../../utils/haptics';
import { fontFamilyNative, fontSize, getShortAddress, ms, type Semantic } from '@salmon/shared';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';

// The copy control is the kit's 32-ish well; `IconBubble`'s closed union has
// no 32, so this takes the nearest step (36) rather than growing a tenth size
// for one caller.
const COPY_BUBBLE_SIZE = 36;

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
  const styles = useThemedStyles(stylesFor);
  const { status, text } = useSemantic();
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
    <KeyValueRow
      style={style}
      label={label}
      // Monospace-Is-For-Scanning Rule: an address is read positionally,
      // prefix against suffix, so its characters must hold a fixed width —
      // Geist Mono at the address size. `KeyValueRow`'s own value style is
      // bold body, so the address arrives as a node rather than a string.
      value={
        <Text style={styles.address} numberOfLines={1}>
          {displayAddress}
        </Text>
      }
      action={
        <IconBubble
          testID={`tx-detail-copy-address-${label}`}
          size={COPY_BUBBLE_SIZE}
          tone={copied ? 'success-tint' : 'surface'}
          onPress={handleCopy}
          accessibilityLabel={
            copied ? t('actions.copied') : t('transactions.detail.copyAddressLabel', { label })
          }
        >
          {copied ? (
            <Animated.View style={{ transform: [{ scale: tickScale }] }}>
              <CheckIcon size={iconSize.sm} color={status.success} />
            </Animated.View>
          ) : (
            <CopyIcon size={iconSize.sm} color={text.accent} />
          )}
        </IconBubble>
      }
    />
  );
};

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    /**
     * Monospace-Is-For-Scanning Rule: an address is read positionally, prefix
     * against suffix, so its characters must hold a fixed width — Geist Mono at
     * the address size.
     */
    address: {
      fontSize: ms(fontSize.mono),
      fontFamily: fontFamilyNative.mono,
      color: t.text.primary,
      flexShrink: 1,
    },
  });

export default AddressCopyRow;
