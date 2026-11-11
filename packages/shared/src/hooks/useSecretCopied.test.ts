/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SECRET_CLIPBOARD_CLEAR_MS } from '../utils/secret-clipboard';
import { useSecretCopied } from './useSecretCopied';

describe('useSecretCopied', () => {
  afterEach(() => vi.useRealTimers());

  it('counts down the seconds until the clipboard is cleared, then ends', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSecretCopied());
    expect(result.current.secondsLeft).toBeNull();

    act(() => result.current.markCopied());
    expect(result.current.secondsLeft).toBe(SECRET_CLIPBOARD_CLEAR_MS / 1000);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.secondsLeft).toBe(SECRET_CLIPBOARD_CLEAR_MS / 1000 - 1);

    act(() => vi.advanceTimersByTime(SECRET_CLIPBOARD_CLEAR_MS - 1000));
    expect(result.current.secondsLeft).toBeNull();
  });
});
