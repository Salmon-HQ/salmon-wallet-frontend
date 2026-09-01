/**
 * The activity list's three non-list states: loading, empty, and failed.
 *
 * They are one file because they are the same slot on the same surface, and
 * keeping them out of the sheet leaves that file about the two steps it
 * actually orchestrates. `EmptyState`/`ErrorState` are thin aliases over the
 * shared `StateBlock` (D9, research-mobile.md §5) — kept here, under these
 * names, so `activity.tsx` and its tests stay untouched.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { borderRadius, semantic, spacing, vs } from '@salmon/shared';
import { ContentLoader, Rect } from '@salmon/shared';
import { StateBlock } from '../StateBlock';

/** The row the skeleton stands in for, at the kit's `ListRow` height. */
const SKELETON_ROW_HEIGHT = 92;

/**
 * Skeleton loader for a single transaction row — the kit row's shape:
 * leading mark, verb, counterparty, amount column, time.
 */
const TransactionItemSkeleton: React.FC = () => (
  <View style={styles.skeletonRow}>
    <ContentLoader
      speed={1.5}
      width="100%"
      height={SKELETON_ROW_HEIGHT}
      backgroundColor={semantic.skeleton.base}
      foregroundColor={semantic.skeleton.highlight}
    >
      {/* Token logo (main) */}
      <Rect x="18" y="26" rx="20" ry="20" width="40" height="40" />
      {/* Type badge on logo */}
      <Rect x="46" y="22" rx="9" ry="9" width="18" height="18" />

      {/* Type label */}
      <Rect x="72" y="26" rx="4" ry="4" width="70" height="16" />
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
 * Empty state when no transactions.
 *
 * The subtitle is overridable because "your transaction history will appear
 * here" is a lie under an active filter — the history is there, this slice of
 * it is not.
 */
export const EmptyState: React.FC<{ subtitle?: string }> = ({ subtitle }) => {
  const { t } = useTranslation();
  return (
    <StateBlock
      tone="empty"
      testID="activity-empty"
      title={t('transactions.noTransactions')}
      body={subtitle ?? t('transactions.emptySubtitle')}
    />
  );
};

/**
 * Error state with retry option
 */
export const ErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <StateBlock
      tone="error"
      title={t('transactions.loadError')}
      onRetry={onRetry}
      retryLabel={t('transactions.tapToRetry')}
      retryTestID="activity-retry-button"
    />
  );
};

const styles = StyleSheet.create({
  skeletonList: {
    paddingTop: vs(spacing.screenGutter),
  },
  skeletonRow: {
    backgroundColor: semantic.surface.membraneThin,
    borderRadius: borderRadius.r4,
    marginBottom: vs(spacing.md),
    overflow: 'hidden',
  },
});
