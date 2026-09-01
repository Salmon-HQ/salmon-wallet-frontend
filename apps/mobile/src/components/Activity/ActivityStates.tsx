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
import { spacing, vs } from '@salmon/shared';
import { SkeletonRow } from '../Skeleton';
import { StateBlock } from '../StateBlock';

/** The kit row's leading mark size (`transactionTypes.LEADING_SIZE`). */
const SKELETON_LEADING_SIZE = 40;
/** Amount column width the real row reserves (`AMOUNT_COLUMN_MIN_WIDTH`). */
const SKELETON_TRAILING_WIDTH = 90;

/**
 * Skeleton loader for the transaction list — the kit row's shape: leading
 * mark, verb, counterparty, amount column.
 */
export const TransactionListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View style={styles.skeletonList}>
    <SkeletonRow
      leadingSize={SKELETON_LEADING_SIZE}
      trailingWidth={SKELETON_TRAILING_WIDTH}
      count={count}
    />
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
});
