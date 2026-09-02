/**
 * TransactionHistoryPage — Activity, CORE 08, on the DOM.
 *
 * The mobile twin is the route `apps/mobile/app/(app)/activity.tsx`. The list
 * is a screen because the second tap inside it changes what it is
 * (DESIGN.md §Sheets — the state rule): every row opens a transaction. The
 * detail stays a sheet over this screen — it shows one thing and the next
 * tap only dismisses it.
 *
 * Filtering is client-side over what has been loaded: the indexer has no type
 * filter, so a server round trip per chip would return the same page with
 * fewer rows in it. The selection is screen state and leaves with the screen.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ACTIVITY_FILTER_KEYS,
  GROUP_LABEL_KEYS,
  groupByDay,
  matchesFilter,
  spacing,
  type ActivityFilter,
  type Transaction,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { ButtonSpinner } from '../Button/ButtonSpinner';
import { SectionLabel } from '../SectionLabel';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { TransactionDetail } from '../TransactionDetail';
import { UnderlineTabs } from '../UnderlineTabs';
import { ActivityEmptyState, ActivityErrorState, TransactionListSkeleton } from './ActivityStates';
import { TransactionItem } from './TransactionItem';
import type { TransactionHistoryPageProps } from './types';

/** Trigger load more when within this many px of the bottom. */
const LOAD_MORE_THRESHOLD = 100;

export function TransactionHistoryPage({
  onBack,
  transactions,
  loading = false,
  loadingMore = false,
  onLoadMore,
  hasMore = false,
  hiddenBalance = false,
  contacts,
  onTransactionPress,
  onViewExplorer,
  onCopyHash,
  onShare,
  developerMode,
  networkId,
  error = null,
  onRetry,
  className,
  style,
}: TransactionHistoryPageProps): React.ReactElement {
  const { t } = useTranslation();
  const { accent } = useSemantic();

  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [detail, setDetail] = useState<Transaction | null>(null);

  const filterOptions = useMemo(
    () => ACTIVITY_FILTER_KEYS.map((key) => ({ key, label: t(`activity.filters.${key}`) })),
    [t]
  );

  const visible = useMemo(
    () => transactions.filter((tx) => matchesFilter(tx.type, filter)),
    [transactions, filter]
  );

  const rows = useMemo(() => groupByDay(visible), [visible]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || loadingMore || !onLoadMore) return;
      const target = event.currentTarget;
      const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (scrollBottom < LOAD_MORE_THRESHOLD) onLoadMore();
    },
    [hasMore, loadingMore, onLoadMore]
  );

  const handleRowPress = useCallback(
    (transaction: Transaction) => {
      onTransactionPress?.(transaction);
      setDetail(transaction);
    },
    [onTransactionPress]
  );

  return (
    <SettingsPanelContent
      testID="activity-screen"
      title={t('actions.activity')}
      subtitle={t('transactions.tapToViewDetails')}
      onBack={onBack}
      scrollable={false}
      className={className}
      style={style}
    >
      {/* Lateral choices take the travelling underline, never a boxed or
          filled container — DESIGN.md §Navigation. Same component as the
          home sub-tabs, one size down. */}
      <UnderlineTabs
        testID="activity-filters"
        tabs={filterOptions}
        activeKey={filter}
        onChange={(key) => setFilter(key as ActivityFilter)}
        size="sm"
        tabTestIDPrefix="activity-filters"
        style={{ alignSelf: 'flex-start' }}
      />

      {error && !loading && <ActivityErrorState onRetry={onRetry} />}

      {loading && !error && <TransactionListSkeleton count={6} />}

      {!loading && !error && visible.length === 0 && (
        <ActivityEmptyState subtitle={filter === 'all' ? undefined : t('activity.emptyFiltered')} />
      )}

      {!loading && !error && visible.length > 0 && (
        <div
          data-testid="activity-list"
          onScroll={handleScroll}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            // The component gap (DESIGN.md §Layout): 20 between every sibling
            // on the root content stack — a day label and each card alike.
            gap: spacing.screenGutter,
            paddingBottom: spacing.screenGutter,
          }}
        >
          {rows.map((row) =>
            row.kind === 'header' ? (
              <SectionLabel key={row.key} variant="group" testID={row.key}>
                {t(GROUP_LABEL_KEYS[row.group])}
              </SectionLabel>
            ) : (
              <TransactionItem
                key={row.key}
                transaction={row.transaction}
                onPress={handleRowPress}
                hiddenBalance={hiddenBalance}
                contacts={contacts}
              />
            )
          )}

          {loadingMore && (
            <div
              data-testid="activity-loading-more"
              style={{ display: 'flex', justifyContent: 'center', padding: `${spacing.lg}px 0` }}
            >
              <ButtonSpinner color={accent.fill} />
            </div>
          )}
        </div>
      )}

      {/* The detail is one state over the list — it shows a transaction and
          the next tap dismisses it, which is exactly what a sheet is for. */}
      <BottomSheetContainer
        visible={detail !== null}
        onClose={() => setDetail(null)}
        testID="activity-detail-sheet"
      >
        {detail && (
          <TransactionDetail
            transaction={detail}
            onViewExplorer={onViewExplorer}
            onCopyHash={onCopyHash}
            onShare={onShare}
            developerMode={developerMode}
            networkId={networkId}
          />
        )}
      </BottomSheetContainer>
    </SettingsPanelContent>
  );
}
