/**
 * SettingsSelectorList - the shared single-choice list for Language,
 * Currency, Explorer and Network.
 *
 * A vertical set of mutually exclusive choices is not a lateral one, so it
 * does not take the travelling underline (DESIGN.md §Navigation) — it is a
 * Card-per-row list and the chosen row is marked by a trailing check in the
 * accent ink, a state rather than an action, never an accent fill on the row.
 */

import React, { useCallback } from 'react';
import { Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, iconSize } from '../../../icons';
import {
  colors,
  contentPadding,
  ContentLoader,
  Rect,
  spacing,
  borderRadius,
  fontFamilyNative,
  fontSize,
  s,
  semantic,
  vs,
} from '@salmon/shared';
import { IconBubble } from '../../IconBubble';
import { ListRow } from '../../ListRow';

/** Mirrors a rendered card row, so the loading state does not jump on swap. */
const SKELETON_ROW_HEIGHT = 72;
const SKELETON_ROW_COUNT = 3;

/** The leading well every option row carries when a selector has no art of its own. */
const ROW_BUBBLE_SIZE = 40;

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
      const key = getKey(item);

      // No art of its own (Explorer, Network): the row still carries a
      // leading well, filled with the same short code its subtitle already
      // states, rather than mixing bare and bubbled rows in one list.
      const leading = renderLeadingElement?.(item) ?? (
        <IconBubble size={ROW_BUBBLE_SIZE} tone="surface">
          {(getSecondaryText?.(item) ?? getPrimaryText(item)).slice(0, 2).toUpperCase()}
        </IconBubble>
      );

      return (
        <ListRow
          key={key}
          testID={testIdPrefix ? `${testIdPrefix}-${key}` : undefined}
          onPress={() => onSelect(item)}
          leading={leading}
          title={getPrimaryText(item)}
          subtitle={getSecondaryText?.(item)}
          trailing={
            selected ? <CheckCircleIcon size={iconSize.lg} color={semantic.accent.ink} /> : undefined
          }
        />
      );
    },
    [isSelected, getKey, onSelect, getPrimaryText, getSecondaryText, renderLeadingElement, testIdPrefix]
  );

  if (loading) {
    // The app's skeleton idiom: row-shaped ContentLoader rects in place of
    // the rows they stand in for, as the token list and chart already do.
    const skeletonWidth = windowWidth - contentPadding.screen * 2;
    const skeletonHeight =
      SKELETON_ROW_COUNT * SKELETON_ROW_HEIGHT + (SKELETON_ROW_COUNT - 1) * spacing.xl;
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
            y={index * (SKELETON_ROW_HEIGHT + spacing.xl)}
            rx={borderRadius.r4}
            ry={borderRadius.r4}
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
  emptyText: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: s(fontSize.body),
    textAlign: 'center',
    padding: vs(spacing.xl),
  },
});
