/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PropsWithChildren } from 'react';

import { LockPage } from './LockPage';

const mockClearSessionKey = vi.fn();
const mockGetStashItem = vi.fn();

// Mutable so a test can put the page into its throttled state.
const mockThrottle = { failedAttempts: 0, remainingMs: 0, remainingSeconds: 0, refresh: vi.fn() };

function sanitizeDomProps(props: Record<string, unknown>) {
  const next = { ...props };
  delete next.loading;
  delete next.fullWidth;
  for (const key of Object.keys(next)) {
    if (key.startsWith('$')) {
      delete next[key];
    }
  }
  return next;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Second arg is a fallback string on most calls and an interpolation
    // options object on a few; only a string may be rendered.
    t: (_key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : _key),
  }),
}));

vi.mock('../../components', () => ({
  PrimaryButton: ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => (
    <button {...sanitizeDomProps(props)}>{children}</button>
  ),
  ConfirmDialog: () => null,
  LoadingScreen: () => null,
  WarningNotice: () => null,
  WaterColumn: () => null,
  waterColumnHost: { position: 'relative', isolation: 'isolate' },
  // The screen itself is `@salmon/ui`'s and is tested there. What is this
  // file's to prove is the adapter: that it clears the cached key on mount and
  // never unlocks from one.
  LockScreen: ({ onMount, onUnlocked }: { onMount?: () => void; onUnlocked?: () => void }) => {
    React.useEffect(() => {
      void onMount?.();
    }, [onMount]);
    return (
      <>
        <input placeholder="Password" data-testid="lock-password-input" />
        <button onClick={() => void onUnlocked?.()}>unlocked</button>
      </>
    );
  },
}));

vi.mock('../../utils/sessionKeyCache', () => ({
  clearSessionKey: () => mockClearSessionKey(),
}));

vi.mock('@salmon/shared', () => {
  const colors = {
    background: { primary: '#000', secondary: '#111' },
    text: { primary: '#fff', secondary: '#aaa' },
    input: { background: '#222', border: '#333' },
    status: { error: '#f00' },
    accent: { primary: '#0f0' },
  };

  return {
    colors,
    fontFamily: { sans: 'sans-serif' },
    fontSize: { xs: 12, sm: 14, bodyLg: 16, '2xl': 24 },
    fontWeight: { semibold: 600 },
    spacing: { xs: 4, sm: 8, lg: 16, '2xl': 32, '3xl': 48 },
    componentSizes: {
      lockScreenLogoSizeExtension: 80,
      inputPaddingVertical: 12,
      inputRadius: 12,
    },
    STASH_KEYS: { DERIVED_KEY: 'derivedKey' },
    getStashItem: (...args: unknown[]) => mockGetStashItem(...args),
    useUnlockThrottle: () => mockThrottle,
  };
});

describe('Extension LockPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClearSessionKey.mockResolvedValue(undefined);
    mockGetStashItem.mockResolvedValue(null);
    mockThrottle.failedAttempts = 0;
    mockThrottle.remainingMs = 0;
    mockThrottle.remainingSeconds = 0;
  });

  it('requires explicit re-authentication on the lock screen, never a cached key', async () => {
    const onUnlock = vi.fn().mockResolvedValue(true);
    const onUnlockWithCachedKey = vi.fn().mockResolvedValue(true);
    const onRemoveAllAccounts = vi.fn().mockResolvedValue(undefined);

    render(
      <LockPage
        onUnlock={onUnlock}
        onUnlockWithCachedKey={onUnlockWithCachedKey}
        onRemoveAllAccounts={onRemoveAllAccounts}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    });

    expect(onUnlockWithCachedKey).not.toHaveBeenCalled();
  });

  it('clears any cached session key as soon as the lock screen mounts', async () => {
    const onUnlock = vi.fn().mockResolvedValue(true);
    const onUnlockWithCachedKey = vi.fn().mockResolvedValue(true);
    const onRemoveAllAccounts = vi.fn().mockResolvedValue(undefined);

    render(
      <LockPage
        onUnlock={onUnlock}
        onUnlockWithCachedKey={onUnlockWithCachedKey}
        onRemoveAllAccounts={onRemoveAllAccounts}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    });

    expect(mockClearSessionKey).toHaveBeenCalledTimes(1);
  });

  // Where storage.session is missing (Firefox before 115), the session area
  // falls back to storage.local: on disk, beside the vault. The background
  // stash already holds the key in memory, and this page has no use for it.
  it('never reads the derived vault key out of the stash after an unlock', async () => {
    mockGetStashItem.mockResolvedValue({
      key: [1, 2, 3],
      salt: 'salt',
      iterations: 220000,
      digest: 'sha512',
      expiresAt: Date.now() + 60_000,
    });
    const onUnlockExited = vi.fn();

    render(
      <LockPage
        onUnlock={vi.fn().mockResolvedValue(true)}
        onRemoveAllAccounts={vi.fn().mockResolvedValue(undefined)}
        onUnlockExited={onUnlockExited}
      />
    );
    fireEvent.click(screen.getByText('unlocked'));

    await waitFor(() => expect(onUnlockExited).toHaveBeenCalled());
    expect(mockGetStashItem).not.toHaveBeenCalled();
  });
});
