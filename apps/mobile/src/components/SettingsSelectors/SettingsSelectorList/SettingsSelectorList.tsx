/**
 * SettingsSelectorList - Generic reusable list for settings selection screens
 *
 * Replaces the duplicated list rendering pattern across LanguageSelector,
 * NetworkSelector, CurrencySelector, and ExplorerSelector.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  fontFamilyNative,
  fontSize,
} from '@salmon/shared';

// ============================================================================
// Types
// ============================================================================

export interface SettingsSelectorListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Extract unique key per item */
  getKey: (item: T) => string;
  /** Whether an item is currently selected */
  isSelected: (item: T) => boolean;
  /** Callback when an item is pressed */
  onSelect: (item: T) => void;
  /** Primary display text */
  getPrimaryText: (item: T) => string;
  /** Optional secondary display text */
  getSecondaryText?: (item: T) => string;
  /** Optional custom element before the text (e.g., currency symbol) */
  renderLeadingElement?: (item: T) => React.ReactNode;
  /** Show loading spinner instead of items */
  loading?: boolean;
  /** Message shown when items is empty and not loading */
  emptyMessage?: string;
  /**
   * Prefix for a per-item `testID` (e.g. `language-option`). Each row gets
   * `${testIdPrefix}-${getKey(item)}` so Maestro flows select options by value.
   */
  testIdPrefix?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SettingsSelectorList<T>({
  items,
  getKey,
  isSelected,
  onSelect,
  getPrimaryText,
  getSecondaryText,
  renderLeadingElement,
  loading,
  emptyMessage,
  testIdPrefix,
}: SettingsSelectorListProps<T>) {
  const renderItem = useCallback(
    (item: T) => {
      const selected = isSelected(item);

      return (
        <TouchableOpacity
          key={getKey(item)}
          testID={testIdPrefix ? `${testIdPrefix}-${getKey(item)}` : undefined}
          style={[styles.option, selected && styles.optionSelected]}
          onPress={() => onSelect(item)}
          activeOpacity={0.7}
        >
          <View style={styles.info}>
            {renderLeadingElement?.(item)}
            <View style={[styles.textContainer, renderLeadingElement && styles.textWithLeading]}>
              <Text style={styles.primaryText} numberOfLines={1} ellipsizeMode="tail">
                {getPrimaryText(item)}
              </Text>
              {getSecondaryText && (
                <Text style={styles.secondaryText} numberOfLines={1} ellipsizeMode="tail">
                  {getSecondaryText(item)}
                </Text>
              )}
            </View>
          </View>

          {selected && <Ionicons name="checkmark-circle" size={24} color={colors.accent.primary} />}
        </TouchableOpacity>
      );
    },
    [
      isSelected,
      getKey,
      onSelect,
      getPrimaryText,
      getSecondaryText,
      renderLeadingElement,
      testIdPrefix,
    ]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent.primary} />
      </View>
    );
  }

  if (items.length === 0 && emptyMessage) {
    return <Text style={styles.emptyText}>{emptyMessage}</Text>;
  }

  return <>{items.map(renderItem)}</>;
}

export default SettingsSelectorList;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionSelected: {
    borderWidth: borderWidth.thin,
    borderColor: colors.accent.primary,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  textWithLeading: {
    gap: spacing.xxs,
  },
  primaryText: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.md,
  },
  secondaryText: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.base,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.base,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
