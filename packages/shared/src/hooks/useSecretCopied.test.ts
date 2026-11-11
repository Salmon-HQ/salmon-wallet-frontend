/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SECRET_CLIPBOARD_CLEAR_MS } from '../utils/secret-clipboard';
import { useSecretCopied } from './useSecretCopied';

describe('useSecretCopied', () => {
  afterEach(() => vi.useRealTimers());

  it('holds until the clipboard is cleared, and a new copy restarts the wait', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSecretCopied());
    expect(result.current.copied).toBe(false);

    act(() => result.current.markCopied());
    act(() => vi.advanceTimersByTime(SECRET_CLIPBOARD_CLEAR_MS - 1000));
    act(() => result.current.markCopied());
    act(() => vi.advanceTimersByTime(SECRET_CLIPBOARD_CLEAR_MS - 1000));
    expect(result.current.copied).toBe(true);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.copied).toBe(false);
  });
});
