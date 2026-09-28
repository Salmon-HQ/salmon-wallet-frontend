/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBackupPanelLogic, SEED_WORD_MASK } from './useBackupPanelLogic';
import type { Account } from '../types/account';

// Public BIP39 test vector — never a real phrase.
const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function accountWithMnemonic(mnemonic: string | null): Account {
  return {
    secret: mnemonic === null ? { kind: 'privateKey' } : { kind: 'mnemonic', mnemonic },
  } as unknown as Account;
}

describe('useBackupPanelLogic', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('derives words and masks them until revealed', () => {
    const { result } = renderHook(() =>
      useBackupPanelLogic({
        activeAccount: accountWithMnemonic(TEST_MNEMONIC),
        copyToClipboard: vi.fn(),
      })
    );

    expect(result.current.hasNoMnemonic).toBe(false);
    expect(result.current.shownWords).toHaveLength(12);
    expect(result.current.shownWords.every((w) => w === SEED_WORD_MASK)).toBe(true);
  });

  it('an account with no mnemonic (imported from a private key) reports hasNoMnemonic', () => {
    const { result } = renderHook(() =>
      useBackupPanelLogic({ activeAccount: accountWithMnemonic(null), copyToClipboard: vi.fn() })
    );

    expect(result.current.hasNoMnemonic).toBe(true);
    expect(result.current.shownWords).toHaveLength(0);
  });

  it('without biometrics, reveal always opens the password gate', () => {
    const { result } = renderHook(() =>
      useBackupPanelLogic({
        activeAccount: accountWithMnemonic(TEST_MNEMONIC),
        copyToClipboard: vi.fn(),
      })
    );

    act(() => {
      void result.current.handleReveal();
    });

    expect(result.current.reauthVisible).toBe(true);
    expect(result.current.showSeedPhrase).toBe(false);
  });

  it('with biometrics verified, reveal skips the password gate and shows the words', async () => {
    const verifyBiometric = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useBackupPanelLogic({
        activeAccount: accountWithMnemonic(TEST_MNEMONIC),
        copyToClipboard: vi.fn(),
        biometricAvailable: true,
        verifyBiometric,
      })
    );

    await act(async () => {
      await result.current.handleReveal();
    });

    expect(result.current.showSeedPhrase).toBe(true);
    expect(result.current.shownWords[0]).toBe('abandon');
    expect(result.current.reauthVisible).toBe(false);
  });

  it('reauthenticating shows the phrase', async () => {
    const { result } = renderHook(() =>
      useBackupPanelLogic({
        activeAccount: accountWithMnemonic(TEST_MNEMONIC),
        copyToClipboard: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleReauthenticated();
    });

    expect(result.current.showSeedPhrase).toBe(true);
  });

  it('copy is a no-op until the phrase is shown', async () => {
    const copyToClipboard = vi.fn();
    const { result } = renderHook(() =>
      useBackupPanelLogic({ activeAccount: accountWithMnemonic(TEST_MNEMONIC), copyToClipboard })
    );

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(copyToClipboard).not.toHaveBeenCalled();
  });

  it('copy writes the mnemonic to the clipboard once revealed', async () => {
    const copyToClipboard = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useBackupPanelLogic({ activeAccount: accountWithMnemonic(TEST_MNEMONIC), copyToClipboard })
    );

    await act(async () => {
      await result.current.handleReauthenticated();
    });
    await act(async () => {
      await result.current.handleCopy();
    });

    expect(copyToClipboard).toHaveBeenCalledWith(TEST_MNEMONIC);
    expect(result.current.copyFailed).toBe(false);
  });

  it('a rejected copy surfaces the failure and reports the error', async () => {
    const error = new Error('clipboard denied');
    const copyToClipboard = vi.fn().mockRejectedValue(error);
    const onCopyError = vi.fn();
    const { result } = renderHook(() =>
      useBackupPanelLogic({
        activeAccount: accountWithMnemonic(TEST_MNEMONIC),
        copyToClipboard,
        onCopyError,
      })
    );

    await act(async () => {
      await result.current.handleReauthenticated();
    });
    await act(async () => {
      await result.current.handleCopy();
    });

    expect(result.current.copyFailed).toBe(true);
    expect(onCopyError).toHaveBeenCalledWith(error);
  });
});
