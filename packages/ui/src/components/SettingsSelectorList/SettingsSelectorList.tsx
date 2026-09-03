/**
 * SettingsSelectorList — the shared single-choice list for Language,
 * Currency, Explorer and Appearance, on the DOM.
 *
 * The mobile twin is
 * `apps/mobile/src/components/SettingsSelectors/SettingsSelectorList`: a
 * `ListRow` per choice, the chosen row marked by a trailing check in the
 * accent ink — a state rather than an action, never an accent fill on the
 * row (DESIGN.md §Navigation: a vertical set of exclusive choices does not
 * take the travelling underline).
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fontFamily, fontSize, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckCircleIcon, iconSize } from '../../icons';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { SkeletonRow } from '../SkeletonRow';
import type { SettingsSelectorListProps } from './types';

/** Mirrors a rendered card row, so the loading state does not jump on swap. */
const SKELETON_ROW_COUNT = 3;

/** The leading well every option row carries when a selector has no art of its own. */
const ROW_BUBBLE_SIZE = 40;

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
}: SettingsSelectorListProps<T>): React.ReactElement {
  const { t } = useTranslation();
  const { accent, text } = useSemantic();

  const renderItem = useCallback(
    (item: T) => {
      const selected = isSelected(item);
      const key = getKey(item);
      const primary = getPrimaryText(item);
      const secondary = getSecondaryText?.(item);

      // No art of its own (Explorer, Language): the row still carries a
      // leading well, filled with the same short code its subtitle already
      // states, rather than mixing bare and bubbled rows in one list.
      const leading = renderLeadingElement?.(item) ?? (
        <IconBubble size={ROW_BUBBLE_SIZE} tone="surface">
          {(secondary ?? primary).slice(0, 2).toUpperCase()}
        </IconBubble>
      );

      return (
        <ListRow
          key={key}
          testID={testIdPrefix ? `${testIdPrefix}-${key}` : undefined}
          onPress={() => onSelect(item)}
          leading={leading}
          title={primary}
          subtitle={secondary || undefined}
          trailing={
            selected ? (
              // The chosen row is a state, said by the glyph and by the name.
              <span
                data-testid={testIdPrefix ? `${testIdPrefix}-${key}-selected` : undefined}
                data-selected="true"
                style={{ display: 'inline-flex' }}
              >
                <CheckCircleIcon size={iconSize.lg} color={accent.ink} />
              </span>
            ) : undefined
          }
        />
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
      accent,
    ]
  );

  if (loading) {
    return (
      <SkeletonRow
        count={SKELETON_ROW_COUNT}
        leadingSize={ROW_BUBBLE_SIZE}
        accessibilityLabel={t('general.loading')}
      />
    );
  }

  if (items.length === 0 && emptyMessage) {
    return (
      <p
        style={{
          margin: 0,
          padding: spacing.xl,
          textAlign: 'center',
          fontFamily: fontFamily.sans,
          fontSize: fontSize.body,
          color: text.secondary,
        }}
      >
        {emptyMessage}
      </p>
    );
  }

  return <>{items.map(renderItem)}</>;
}
