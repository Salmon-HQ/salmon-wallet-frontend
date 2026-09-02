/**
 * The Activity list's two pure decisions: which rows a filter keeps, and where
 * a day begins.
 *
 * Shared because both the mobile route and the DOM page draw the same list:
 * a filter that silently drops a transaction type is worth testing once,
 * without mounting a screen on either platform to do it.
 */
import type { Transaction } from '../types';

// ============================================================================
// Filters
// ============================================================================

/** The four chips CORE 08 draws. */
export type ActivityFilter = 'all' | 'send' | 'receive' | 'other';

export const ACTIVITY_FILTER_KEYS: ActivityFilter[] = ['all', 'send', 'receive', 'other'];

/**
 * "Other" is defined by exclusion on purpose: a swap, a stake, a mint and a
 * type this build has never seen all belong in it, and enumerating the known
 * ones would silently drop whatever the indexer adds next.
 */
export function matchesFilter(type: string, filter: ActivityFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'other') return type !== 'send' && type !== 'receive';
  return type === filter;
}

// ============================================================================
// Day grouping
// ============================================================================

/** The two runs CORE 08 draws above the activity list. */
export type ActivityGroup = 'today' | 'earlier';

export const GROUP_LABEL_KEYS: Record<ActivityGroup, string> = {
  today: 'transactions.groupToday',
  earlier: 'transactions.groupEarlier',
};

/**
 * One entry in the flat list: a day label, or a transaction. The labels ride
 * in the same list as the rows so pagination and the footer keep working
 * unchanged.
 */
export type ActivityRow =
  | { kind: 'header'; key: string; group: ActivityGroup }
  | { kind: 'transaction'; key: string; transaction: Transaction };

/**
 * The rows arrive newest-first, so a single pass is enough — no sort, no
 * section list, and a group label is just another row in the same list.
 */
export function groupByDay(transactions: Transaction[], now = Date.now()): ActivityRow[] {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  // `Transaction.timestamp` is in seconds (see `formatRelativeTimeCompact`).
  const startOfTodaySeconds = midnight.getTime() / 1000;

  const items: ActivityRow[] = [];
  let openGroup: ActivityGroup | null = null;

  for (const transaction of transactions) {
    const group: ActivityGroup = transaction.timestamp >= startOfTodaySeconds ? 'today' : 'earlier';
    if (group !== openGroup) {
      openGroup = group;
      items.push({ kind: 'header', key: `activity-group-${group}`, group });
    }
    items.push({ kind: 'transaction', key: transaction.id, transaction });
  }

  return items;
}
