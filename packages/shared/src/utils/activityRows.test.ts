import { describe, expect, it } from 'vitest';
import { groupByDay, matchesFilter } from './activityRows';
import type { Transaction } from '../types';

const tx = (id: string, timestamp: number, type = 'send'): Transaction =>
  ({ id, timestamp, type, status: 'completed', inputs: [], outputs: [] }) as unknown as Transaction;

describe('matchesFilter', () => {
  it('keeps everything under all, and defines other by exclusion', () => {
    expect(matchesFilter('stake', 'all')).toBe(true);
    expect(matchesFilter('send', 'send')).toBe(true);
    expect(matchesFilter('receive', 'send')).toBe(false);
    expect(matchesFilter('swap', 'other')).toBe(true);
    expect(matchesFilter('never-seen', 'other')).toBe(true);
    expect(matchesFilter('send', 'other')).toBe(false);
  });
});

describe('groupByDay', () => {
  it('opens a label where the day changes, newest first', () => {
    const now = new Date(2026, 8, 2, 15, 0, 0).getTime();
    const todaySeconds = new Date(2026, 8, 2, 9, 0, 0).getTime() / 1000;
    const yesterdaySeconds = new Date(2026, 8, 1, 23, 0, 0).getTime() / 1000;

    const rows = groupByDay(
      [tx('a', todaySeconds), tx('b', todaySeconds - 60), tx('c', yesterdaySeconds)],
      now
    );

    expect(rows.map((row) => row.key)).toEqual([
      'activity-group-today',
      'a',
      'b',
      'activity-group-earlier',
      'c',
    ]);
  });

  it('returns no rows for no transactions', () => {
    expect(groupByDay([])).toEqual([]);
  });
});
