/**
 * SettingsSelectorList - Generic reusable list for settings selection screens
 *
 * Replaces the duplicated list rendering pattern across LanguageSelector,
 * NetworkSelector, CurrencySelector, and ExplorerSelector.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, iconSize } from '../../../icons';
import {
  colors,
  contentPadding,
  ContentLoader,
  Rect,
  spacing,
  borderRadius,
  borderWidth,
  fontFamilyNative,
  fontSize,
  semantic,
} from '@salmon/shared';

// Mirrors a rendered row: bodyLg text plus `spacing.md` padding either side.
const SKELETON_ROW_HEIGHT = 56;
const SKELETON_ROW_COUNT = 3;

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
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();

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
          accessibilityRole="button"
          accessibilityState={{ selected }}
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

          {selected && <CheckCircleIcon size={iconSize.lg} color={semantic.accent.ink} />}
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
    // The app's skeleton idiom: row-shaped ContentLoader rects in place of
    // the rows they stand in for, as the token list and chart already do.
    const skeletonWidth = windowWidth - contentPadding.screen * 2;
    const skeletonHeight =
      SKELETON_ROW_COUNT * SKELETON_ROW_HEIGHT + (SKELETON_ROW_COUNT - 1) * spacing.sm;
    return (
      <ContentLoader
        speed={1.5}
        width={skeletonWidth}
        height={skeletonHeight}
        viewBox={`0 0 ${skeletonWidth} ${skeletonHeight}`}
        backgroundColor={colors.skeleton.base}
        foregroundColor={colors.skeleton.highlight}
        accessibilityLabel={t('general.loading')}
      >
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <Rect
            key={index}
            x="0"
            y={index * (SKELETON_ROW_HEIGHT + spacing.sm)}
            rx={borderRadius.r3}
            ry={borderRadius.r3}
            width={skeletonWidth}
            height={SKELETON_ROW_HEIGHT}
          />
        ))}
      </ContentLoader>
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
    // Control Radius Rule: a settings list row is a control — r3, not r2.
    borderRadius: borderRadius.r3,
    padding: spacing.md,
    marginBottom: spacing.sm,
    // Constant border; selection only swaps its color. A border that appears
    // on selection shifted every row's content by 1px.
    borderWidth: borderWidth.thin,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: semantic.state.selectedEdge,
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
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
  },
  secondaryText: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.body,
  },
  emptyText: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.body,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
