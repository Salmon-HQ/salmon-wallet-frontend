/**
 * The activity list's three non-list states: loading, empty, and failed.
 *
 * The mobile twin is `apps/mobile/src/components/Activity/ActivityStates.tsx`:
 * the same slot on the same surface, the empty and error states thin aliases
 * over the kit's `StateBlock`, the skeleton the kit row's shape.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { spacing } from '@salmon/shared';

import { SkeletonRow } from '../SkeletonRow';
import { StateBlock } from '../StateBlock';

/** The kit row's leading mark size (`transactionTypes.LEADING_SIZE`). */
const SKELETON_LEADING_SIZE = 40;
/** Amount column width the real row reserves (`AMOUNT_COLUMN_MIN_WIDTH`). */
const SKELETON_TRAILING_WIDTH = 90;

/**
 * Skeleton loader for the transaction list — the kit row's shape: leading
 * mark, verb, counterparty, amount column.
 */
export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div data-testid="activity-skeleton" style={{ paddingTop: spacing.screenGutter }}>
      <SkeletonRow
        leadingSize={SKELETON_LEADING_SIZE}
        trailingWidth={SKELETON_TRAILING_WIDTH}
        count={count}
      />
    </div>
  );
}

/**
 * Empty state when no transactions.
 *
 * The subtitle is overridable because "your transaction history will appear
 * here" is a lie under an active filter — the history is there, this slice of
 * it is not.
 */
export function ActivityEmptyState({ subtitle }: { subtitle?: string }) {
  const { t } = useTranslation();
  return (
    <StateBlock
      tone="empty"
      testID="activity-empty"
      title={t('transactions.noTransactions')}
      body={subtitle ?? t('transactions.emptySubtitle')}
    />
  );
}

/** Error state with retry option */
export function ActivityErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <StateBlock
      tone="error"
      testID="activity-error"
      title={t('transactions.loadError')}
      onRetry={onRetry}
      retryLabel={t('transactions.tapToRetry')}
      retryTestID="activity-retry-button"
    />
  );
}
