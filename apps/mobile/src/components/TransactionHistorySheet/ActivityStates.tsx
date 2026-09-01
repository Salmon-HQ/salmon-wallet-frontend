/**
 * The activity list's three non-list states: loading, empty, and failed.
 *
 * They are one file because they are the same slot on the same surface, and
 * keeping them out of the sheet leaves that file about the two steps it
 * actually orchestrates.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  colors,
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  semantic,
  spacing,
  vs,
} from '@salmon/shared';
import { ContentLoader, Rect } from '@salmon/shared';

/** The row the skeleton stands in for, at the kit's `ListRow` height. */
const SKELETON_ROW_HEIGHT = 92;

/**
 * Skeleton loader for a single transaction row — the kit row's shape:
 * leading mark, verb + protocol chip, description, amount column, time.
 */
const TransactionItemSkeleton: React.FC = () => (
  <View style={styles.skeletonRow}>
    <ContentLoader
      speed={1.5}
      width="100%"
      height={SKELETON_ROW_HEIGHT}
      backgroundColor={colors.skeleton.base}
      foregroundColor={colors.skeleton.highlight}
    >
      {/* Token logo (main) */}
      <Rect x="18" y="26" rx="20" ry="20" width="40" height="40" />
      {/* Type badge on logo */}
      <Rect x="46" y="22" rx="9" ry="9" width="18" height="18" />

      {/* Type label */}
      <Rect x="72" y="26" rx="4" ry="4" width="70" height="16" />
      {/* Source badge */}
      <Rect x="148" y="27" rx="4" ry="4" width="50" height="14" />
      {/* Description */}
      <Rect x="72" y="50" rx="4" ry="4" width="100" height="14" />

      {/* Amount line 1 (right side) */}
      <Rect x="75%" y="24" rx="4" ry="4" width="25%" height="14" />
      {/* Amount line 2 (right side) */}
      <Rect x="78%" y="42" rx="4" ry="4" width="22%" height="14" />
      {/* Time (right side) */}
      <Rect x="85%" y="62" rx="4" ry="4" width="15%" height="12" />
    </ContentLoader>
  </View>
);

/**
 * Skeleton loader for multiple transaction rows
 */
export const TransactionListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View style={styles.skeletonList}>
    {Array.from({ length: count }).map((_, index) => (
      <TransactionItemSkeleton key={`skeleton-${index}`} />
    ))}
  </View>
);

/**
 * Empty state when no transactions
 */
export const EmptyState: React.FC = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.centred} testID="activity-empty">
      <Text style={styles.title}>{t('transactions.noTransactions')}</Text>
      <Text style={styles.body}>{t('transactions.emptySubtitle')}</Text>
    </View>
  );
};

/**
 * Error state with retry option
 */
export const ErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.centred}>
      <Text style={styles.title}>{t('transactions.loadError')}</Text>
      {onRetry && (
        <TouchableWithoutFeedback onPress={onRetry}>
          <View style={styles.retryButton} testID="activity-retry-button">
            <Text style={styles.retryText}>{t('transactions.tapToRetry')}</Text>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonList: {
    paddingTop: vs(spacing.sm),
  },
  skeletonRow: {
    backgroundColor: semantic.surface.membraneThin,
    borderRadius: borderRadius.r4,
    marginBottom: vs(spacing.md),
    overflow: 'hidden',
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: vs(spacing.md),
    paddingVertical: vs(spacing['5.5xl']),
  },
  title: {
    fontSize: s(fontSize.heading),
    lineHeight: s(fontSize.heading) * lineHeight.snug,
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
  },
  body: {
    fontSize: s(fontSize.body),
    lineHeight: s(fontSize.body) * lineHeight.snug,
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: vs(spacing.md),
    paddingHorizontal: s(spacing['2xl']),
    backgroundColor: semantic.accent.fill,
    borderRadius: borderRadius.r3,
  },
  retryText: {
    fontSize: s(fontSize.body),
    fontFamily: fontFamilyNative.bold,
    color: semantic.accent.onFill,
  },
});
