/**
 * @vitest-environment jsdom
 *
 * The fills under an amount card: Max puts the whole balance in the field and
 * says it was Max, so the transfer can send the whole raw balance; a typed
 * edit is the user's own amount.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAmountShortcuts } from './useAmountShortcuts';

const render = (balance: number, decimals: number) => {
  const setAmount = vi.fn();
  const { result } = renderHook(() =>
    useAmountShortcuts({ balance, decimals, setAmount, maxLabel: 'Max' })
  );
  return { result, setAmount };
};

describe('useAmountShortcuts', () => {
  it('fills the whole balance on Max, to the last unit, and says it was Max', () => {
    // 1.15 * 1e6 is 1149999.9999999998 in floating point.
    const { result, setAmount } = render(1.15, 6);
    act(() => result.current.select('max'));
    expect(setAmount).toHaveBeenLastCalledWith('1.15', 'max');
  });

  it('truncates a fraction of the balance to the token decimals, never rounding up', () => {
    const { result, setAmount } = render(0.000003, 6);
    act(() => result.current.select('50'));
    expect(setAmount).toHaveBeenLastCalledWith('0.000001', '50');
  });

  it('reports a typed amount as the user own, with no fill', () => {
    const { result, setAmount } = render(10, 6);
    act(() => result.current.select('max'));
    act(() => result.current.onAmountChange('9'));
    expect(setAmount).toHaveBeenLastCalledWith('9');
    expect(result.current.selected).toBe('');
  });
});
