/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FLOAT_IN_MS, SINK_OUT_MS } from './sinkFloat';
import type { FocusModePhase } from './useFocusModePhase';
import { SUB_TAB_SETTLE_MS, useSettledSubTab } from './useSettledSubTab';

type Key = 'portfolio' | 'nfts' | 'memo';
const isFocusTab = (key: Key) => key === 'memo';

function setup(target: Key, focusPhase: FocusModePhase, isReduceMotionEnabled = false) {
  return renderHook(
    (p: { target: Key; focusPhase: FocusModePhase; isReduceMotionEnabled: boolean }) =>
      useSettledSubTab({ ...p, isFocusTab }),
    { initialProps: { target, focusPhase, isReduceMotionEnabled } }
  );
}

describe('useSettledSubTab', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('settles a switch within a mode once the underline has slid and the outgoing content sank', () => {
    const { result, rerender } = setup('portfolio', 'shown');
    rerender({ target: 'nfts', focusPhase: 'shown', isReduceMotionEnabled: false });
    expect(result.current).toBe('portfolio');
    act(() => vi.advanceTimersByTime(SUB_TAB_SETTLE_MS - 1));
    expect(result.current).toBe('portfolio');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('nfts');
  });

  it('waits for the focus clock to land, then for the row to rise, before a Powerup settles', () => {
    const { result, rerender } = setup('portfolio', 'shown');
    rerender({ target: 'memo', focusPhase: 'shown', isReduceMotionEnabled: false });
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current).toBe('portfolio');
    rerender({ target: 'memo', focusPhase: 'sinking', isReduceMotionEnabled: false });
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current).toBe('portfolio');
    rerender({ target: 'memo', focusPhase: 'gone', isReduceMotionEnabled: false });
    act(() => vi.advanceTimersByTime(SINK_OUT_MS - 1));
    expect(result.current).toBe('portfolio');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('memo');
  });

  it('on the way back, waits for the row to come down before Portfolio settles', () => {
    const { result, rerender } = setup('memo', 'gone');
    rerender({ target: 'portfolio', focusPhase: 'returning', isReduceMotionEnabled: false });
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current).toBe('memo');
    rerender({ target: 'portfolio', focusPhase: 'shown', isReduceMotionEnabled: false });
    act(() => vi.advanceTimersByTime(FLOAT_IN_MS));
    expect(result.current).toBe('portfolio');
  });

  it('a change of mind cancels the pending settle', () => {
    const { result, rerender } = setup('portfolio', 'shown');
    rerender({ target: 'nfts', focusPhase: 'shown', isReduceMotionEnabled: false });
    rerender({ target: 'portfolio', focusPhase: 'shown', isReduceMotionEnabled: false });
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current).toBe('portfolio');
  });

  it('settles at once under reduce motion', () => {
    const { result, rerender } = setup('portfolio', 'shown', true);
    rerender({ target: 'memo', focusPhase: 'shown', isReduceMotionEnabled: true });
    expect(result.current).toBe('memo');
  });
});
