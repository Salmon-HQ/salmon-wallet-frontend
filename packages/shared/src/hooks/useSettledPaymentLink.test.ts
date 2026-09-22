/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { PAYMENT_LINK_SETTLE_MS, useSettledPaymentLink } from './useSettledPaymentLink';

const LINK = 'solana:Dest1111111111111111111111111111111111?amount=10&memo=order-12';

describe('useSettledPaymentLink', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // Text can arrive a character at a time. Reading each prefix acted on a
  // half-typed link: a request for 1 on the way to 10, one without its memo.
  it('reads a link once, whole, after it stops changing', () => {
    const onSettled = vi.fn();
    const { rerender } = renderHook(({ text }) => useSettledPaymentLink(text, onSettled), {
      initialProps: { text: '' },
    });

    for (let end = 'solana:'.length; end <= LINK.length; end += 1) {
      rerender({ text: LINK.slice(0, end) });
      vi.advanceTimersByTime(50);
    }
    expect(onSettled).not.toHaveBeenCalled();

    vi.advanceTimersByTime(PAYMENT_LINK_SETTLE_MS);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith(LINK);
  });

  it('leaves anything that is not a payment link alone', () => {
    const onSettled = vi.fn();
    renderHook(() => useSettledPaymentLink('Dest1111111111111111111111111111111111', onSettled));

    vi.advanceTimersByTime(PAYMENT_LINK_SETTLE_MS * 2);
    expect(onSettled).not.toHaveBeenCalled();
  });
});
