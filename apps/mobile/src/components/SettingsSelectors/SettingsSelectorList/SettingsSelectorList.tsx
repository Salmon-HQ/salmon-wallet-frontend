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
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, iconSize } from '../../../icons';
import { fontFamilyNative, fontSize, s, semantic, spacing, vs } from '@salmon/shared';
import { IconBubble } from '../../IconBubble';
import { ListRow } from '../../ListRow';
import { SkeletonRow } from '../../Skeleton';

/** Mirrors a rendered card row, so the loading state does not jump on swap. */
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
  /** Optional secondary display text (return undefined to omit the row's subtitle) */
  getSecondaryText?: (item: T) => string | undefined;
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
    // SkeletonRow's default shape (leading well + two lines) already mirrors
    // this list's rows (D1, research-mobile.md §2 D2).
    return (
      <SkeletonRow
        count={SKELETON_ROW_COUNT}
        leadingSize={ROW_BUBBLE_SIZE}
        accessibilityLabel={t('general.loading')}
      />
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
