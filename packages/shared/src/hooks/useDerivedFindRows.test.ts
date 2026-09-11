/**
 * @vitest-environment jsdom
 *
 * The derived-accounts sheet's title, added to `useDerivedFindRows` so both
 * sheets (mobile, DOM) stop computing the same scanning/found ternary
 * themselves. `rows`/`checked`/`toggle` already had no dedicated test file —
 * this one only pins the new `title` behavior.
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDerivedFindRows } from './useDerivedFindRows';

const t = (key: string, options?: { number?: number; count?: number }) =>
  options?.count !== undefined
    ? `found:${options.count}`
    : options?.number !== undefined
      ? `name:${options.number}`
      : key;

// Shaped like `DerivedAccountFind` (`./useDerivedAccountsScan`) without
// importing that module — it drags in the account-factory/blockchain graph,
// which this title-only test has no reason to load.
const FIND = { index: 0, address: 'addr', balanceFormatted: '0 SOL', tokenCount: 0 };

// Hoisted to a stable reference: the hook's `finds` effect deps on this array
// by identity, and `renderHook`'s callback re-runs on every render it causes —
// a literal written inline there is a fresh array each time and loops forever.
const ONE_FIND = [FIND];
const TWO_FINDS = [FIND, FIND];
const NO_FINDS: (typeof FIND)[] = [];

describe('useDerivedFindRows — title', () => {
  it('names the wait while scanning, regardless of finds so far', () => {
    const { result } = renderHook(() => useDerivedFindRows(ONE_FIND, 0, t, true));
    expect(result.current.title).toBe('wallet.derived.scanning_title');
  });

  it('names the found count once the scan has answered', () => {
    const { result } = renderHook(() => useDerivedFindRows(TWO_FINDS, 0, t, false));
    expect(result.current.title).toBe('found:2');
  });

  it('defaults to not-scanning when the flag is omitted', () => {
    const { result } = renderHook(() => useDerivedFindRows(NO_FINDS, 0, t));
    expect(result.current.title).toBe('found:0');
  });
});
