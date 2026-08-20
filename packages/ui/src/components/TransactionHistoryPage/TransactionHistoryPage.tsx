/**
 * TransactionHistoryPage - the Activity surface
 *
 * Two steps in one page: the list, and one transaction's detail. Pressing a
 * row does not stack a dialog on top of the page — the list sinks, the beat
 * passes, and the detail floats up in its place, inside the page that was
 * already open, and back is the mirror (DESIGN.md §The sink and the float —
 * the transition verb).
 *
 * DESIGN.md §Motion's rule that a surface's content never speaks the verb is
 * about the surface arriving and leaving; a step change inside a page that is
 * already on screen is the other event, and it does speak it. So the first
 * view is placed rather than played: the step frame's animation is suppressed
 * until a step has actually happened.
 *
 * Features:
 * - Scrollable transaction list with infinite scroll
 * - In-place detail step with a mirrored back, on the header, Escape and the
 *   browser's own back
 * - Loading skeletons
 * - Empty and error states
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import { ArrowsClockwiseIcon, ReceiptIcon } from '../../icons';
import { colors, spacing, borderRadius, fontSize, fontWeight, opacity } from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import { PageShell } from '../PageShell';
import { SinkFloat } from '../SinkFloat';
import { TransactionDetail } from '../TransactionDetail';
import { TransactionItem } from './TransactionItem';
import type { TransactionHistoryPageProps, Transaction } from './types';

// ============================================================================
// Styled Components
// ============================================================================

// Skeleton styles
const SkeletonItem = styled(Box)({
  padding: `${spacing.lg}px ${spacing.lg}px`,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.md,
});

const SkeletonInfoSection = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
});

const SkeletonRightSection = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: spacing.xs,
});

// Empty state styles
const EmptyContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing['5.5xl']}px ${spacing.lg}px`,
});

const EmptyTitle = styled(Typography)({
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
  marginTop: spacing.lg,
  marginBottom: spacing.base,
});

const EmptySubtitle = styled(Typography)({
  fontSize: fontSize.base,
  color: colors.text.secondary,
  textAlign: 'center',
});

// Error state styles
const ErrorContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing['5.5xl']}px ${spacing.lg}px`,
});

const ErrorTitle = styled(Typography)({
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
  marginBottom: spacing.base,
});

const RetryButton = styled(Button)({
  backgroundColor: colors.accent.primary,
  color: colors.text.primary,
  textTransform: 'none',
  fontWeight: fontWeight.medium,
  padding: `${spacing.sm}px ${spacing['2xl']}px`,
  borderRadius: borderRadius.md,
  '&:hover': {
    backgroundColor: colors.accent.primary,
    opacity: opacity.soft,
  },
});

// Loading more indicator
const LoadingMoreContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  padding: `${spacing.lg}px 0`,
});

// ============================================================================
// Skeleton Components
// ============================================================================

const TransactionItemSkeleton: React.FC = () => (
  <BlurContainer
    borderColor={colors.border.subtle}
    style={{ borderRadius: borderRadius.lg, marginBottom: spacing.md, overflow: 'hidden' }}
  >
    <SkeletonItem>
      <Skeleton
        variant="circular"
        width={40}
        height={40}
        sx={{ bgcolor: colors.skeleton.base, flexShrink: 0 }}
      />
      <SkeletonInfoSection>
        <Box sx={{ display: 'flex', gap: `${spacing.sm}px`, alignItems: 'center' }}>
          <Skeleton
            variant="rounded"
            width={70}
            height={14}
            sx={{ bgcolor: colors.skeleton.base }}
          />
          <Skeleton
            variant="rounded"
            width={50}
            height={12}
            sx={{ bgcolor: colors.skeleton.base }}
          />
        </Box>
        <Skeleton
          variant="rounded"
          width={100}
          height={12}
          sx={{ bgcolor: colors.skeleton.base }}
        />
      </SkeletonInfoSection>
      <SkeletonRightSection>
        <Skeleton variant="rounded" width={80} height={14} sx={{ bgcolor: colors.skeleton.base }} />
        <Skeleton variant="rounded" width={60} height={12} sx={{ bgcolor: colors.skeleton.base }} />
        <Skeleton variant="rounded" width={40} height={10} sx={{ bgcolor: colors.skeleton.base }} />
      </SkeletonRightSection>
    </SkeletonItem>
  </BlurContainer>
);

const TransactionListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <Box>
    {Array.from({ length: count }).map((_, index) => (
      <TransactionItemSkeleton key={`skeleton-${index}`} />
    ))}
  </Box>
);

// ============================================================================
// State Components
// ============================================================================

const EmptyState: React.FC = () => {
  const { t } = useTranslation();
  return (
    <EmptyContainer data-testid="activity-empty">
      <ReceiptIcon size={fontSize['5xl']} color={colors.text.tertiary} />
      <EmptyTitle>{t('transactions.noTransactions')}</EmptyTitle>
      <EmptySubtitle>{t('transactions.emptySubtitle')}</EmptySubtitle>
    </EmptyContainer>
  );
};

const ErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <ErrorContainer>
      <ErrorTitle>{t('transactions.loadError')}</ErrorTitle>
      {onRetry && (
        <RetryButton
          onClick={onRetry}
          startIcon={<ArrowsClockwiseIcon />}
          data-testid="activity-retry-button"
        >
          {t('transactions.tapToRetry')}
        </RetryButton>
      )}
    </ErrorContainer>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * The first view is placed, not played: an inline `animation: none` outranks
 * the frame's own rule, and it is dropped the moment a step happens.
 */
const PLACED_STYLE: React.CSSProperties = { animation: 'none' };

/** Marks the history entry the detail step pushes, so back returns to the list. */
const DETAIL_HISTORY_KEY = 'salmonActivityDetail';

export function TransactionHistoryPage({
  onBack,
  transactions,
  loading = false,
  loadingMore = false,
  onLoadMore,
  hasMore = false,
  hiddenBalance = false,
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Which step is on screen: the list, or one transaction's detail.
  const [detail, setDetail] = useState<Transaction | null>(null);
  // Whether a step has happened on this surface. Until one has, the step
  // frame is placed rather than played — the page's own arrival is not its
  // content's event.
  const [stepped, setStepped] = useState(false);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (detail || !hasMore || loadingMore || !onLoadMore) return;

      const target = event.currentTarget;
      const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

      // Trigger load more when within 100px of the bottom
      if (scrollBottom < 100) {
        onLoadMore();
      }
    },
    [detail, hasMore, loadingMore, onLoadMore]
  );

  const handleTransactionPress = useCallback(
    (transaction: Transaction) => {
      onTransactionPress?.(transaction);
      // A step starts at the top of its own content.
      scrollRef.current?.scrollTo({ top: 0 });
      setStepped(true);
      setDetail(transaction);
      // The step is a place the surface can be, so the platform's own back
      // affordance has somewhere to return from.
      // ponytail: an entry pushed here outlives an unmount that happens while
      // the detail is open, costing one dead back press; route the step
      // through the app's router if that ever matters.
      window.history.pushState({ [DETAIL_HISTORY_KEY]: true }, '');
    },
    [onTransactionPress]
  );

  // Back is the mirror, and it never leaves the surface: it pops the entry the
  // step pushed, and the listener below is what actually shows the list again.
  const handleBackToList = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    window.history.back();
  }, []);

  // Escape and the browser's back button are the same gesture as the header's.
  useEffect(() => {
    if (!detail) return undefined;

    const handlePopState = () => setDetail(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      window.history.back();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [detail]);

  const handleScrollContentRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
  }, []);

  return (
    <PageShell
      title={t('actions.activity')}
      onBack={detail ? handleBackToList : onBack}
      scrollContentStyle={{
        padding: `${spacing.md}px ${spacing.lg}px ${spacing.xl}px`,
      }}
      scrollContentProps={{ onScroll: handleScroll as React.UIEventHandler<HTMLDivElement> }}
      scrollContentRef={handleScrollContentRef}
      style={style}
      className={className}
    >
      <SinkFloat
        transitionKey={detail ? `detail:${detail.id}` : 'list'}
        style={stepped ? undefined : PLACED_STYLE}
      >
        {detail ? (
          <Box data-testid="activity-detail-step">
            <TransactionDetail
              transaction={detail}
              onViewExplorer={onViewExplorer}
              onCopyHash={onCopyHash}
              onShare={onShare}
              developerMode={developerMode}
              networkId={networkId}
            />
          </Box>
        ) : (
          <Box data-testid="activity-list-step">
            {/* Error State */}
            {error && !loading && <ErrorState onRetry={onRetry} />}

            {/* Loading State */}
            {loading && !error && <TransactionListSkeleton count={6} />}

            {/* Empty State */}
            {!loading && !error && transactions.length === 0 && <EmptyState />}

            {/* Transaction List */}
            {!loading && !error && transactions.length > 0 && (
              <Box data-testid="activity-list">
                {transactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onPress={handleTransactionPress}
                    hiddenBalance={hiddenBalance}
                  />
                ))}

                {/* Loading more indicator */}
                {loadingMore && (
                  <LoadingMoreContainer>
                    <CircularProgress size={24} sx={{ color: colors.accent.primary }} />
                  </LoadingMoreContainer>
                )}
              </Box>
            )}
          </Box>
        )}
      </SinkFloat>
    </PageShell>
  );
}
