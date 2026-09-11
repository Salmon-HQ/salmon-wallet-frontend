/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePrivateKeyPanelLogic } from './usePrivateKeyPanelLogic';

describe('usePrivateKeyPanelLogic', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts with nothing revealed and no reauth pending', () => {
    const { result } = renderHook(() => usePrivateKeyPanelLogic({ copyToClipboard: vi.fn() }));
    expect(result.current.revealedIndexes.size).toBe(0);
    expect(result.current.reauthIndex).toBeNull();
  });

  it('without biometrics, reveal always opens the password gate', async () => {
    const { result } = renderHook(() => usePrivateKeyPanelLogic({ copyToClipboard: vi.fn() }));

    await act(async () => {
      await result.current.handleReveal(0);
    });

    expect(result.current.reauthIndex).toBe(0);
    expect(result.current.revealedIndexes.has(0)).toBe(false);
  });

  it('with biometrics verified, reveal skips the password gate', async () => {
    const verifyBiometric = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      usePrivateKeyPanelLogic({
        copyToClipboard: vi.fn(),
        biometricAvailable: true,
        verifyBiometric,
      })
    );

    await act(async () => {
      await result.current.handleReveal(1);
    });

    expect(verifyBiometric).toHaveBeenCalledTimes(1);
    expect(result.current.revealedIndexes.has(1)).toBe(true);
    expect(result.current.reauthIndex).toBeNull();
  });

  it('with biometrics declined, falls through to the password gate', async () => {
    const verifyBiometric = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      usePrivateKeyPanelLogic({
        copyToClipboard: vi.fn(),
        biometricAvailable: true,
        verifyBiometric,
      })
    );

    await act(async () => {
      await result.current.handleReveal(2);
    });

    expect(result.current.reauthIndex).toBe(2);
    expect(result.current.revealedIndexes.has(2)).toBe(false);
  });

  it('reauthenticating reveals the index the sheet was standing in front of', async () => {
    const { result } = renderHook(() => usePrivateKeyPanelLogic({ copyToClipboard: vi.fn() }));

    await act(async () => {
      await result.current.handleReveal(3);
    });
    await act(async () => {
      await result.current.handleReauthenticated();
    });

    expect(result.current.revealedIndexes.has(3)).toBe(true);
  });

  it('copy is a no-op when the index has not been revealed', async () => {
    const copyToClipboard = vi.fn();
    const { result } = renderHook(() => usePrivateKeyPanelLogic({ copyToClipboard }));

    // Random string in place of a real key — this hook never sees real key
    // material in a test, only what the caller passes it.
    await act(async () => {
      await result.current.handleCopy('not-revealed-key', 0);
    });

    expect(copyToClipboard).not.toHaveBeenCalled();
  });

  it('copy writes to the clipboard and shows the feedback once revealed', async () => {
    const copyToClipboard = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePrivateKeyPanelLogic({ copyToClipboard }));

    await act(async () => {
      await result.current.revealKey(0);
    });
    await act(async () => {
      await result.current.handleCopy('key-under-test', 0);
    });

    expect(copyToClipboard).toHaveBeenCalledWith('key-under-test');
    expect(result.current.copiedIndex).toBe(0);
    expect(result.current.copyFailedIndex).toBeNull();
  });

  it('a rejected copy surfaces the failure at that index and reports the error', async () => {
    const error = new Error('clipboard denied');
    const copyToClipboard = vi.fn().mockRejectedValue(error);
    const onCopyError = vi.fn();
    const { result } = renderHook(() => usePrivateKeyPanelLogic({ copyToClipboard, onCopyError }));

    await act(async () => {
      await result.current.revealKey(0);
    });
    await act(async () => {
      await result.current.handleCopy('key-under-test', 0);
    });

    expect(result.current.copyFailedIndex).toBe(0);
    expect(onCopyError).toHaveBeenCalledWith(error);
  });

  it('resetRevealState clears reveal, copy and reauth state', async () => {
    const { result } = renderHook(() =>
      usePrivateKeyPanelLogic({ copyToClipboard: vi.fn().mockResolvedValue(undefined) })
    );

    await act(async () => {
      await result.current.revealKey(0);
      result.current.setReauthIndex(1);
    });
    act(() => result.current.resetRevealState());

    expect(result.current.revealedIndexes.size).toBe(0);
    expect(result.current.reauthIndex).toBeNull();
    expect(result.current.copyFailedIndex).toBeNull();
    expect(result.current.copiedIndex).toBeNull();
  });
});
