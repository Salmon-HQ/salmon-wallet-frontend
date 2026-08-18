/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComponentType, PropsWithChildren } from 'react';

import { LockPage } from './LockPage';

const mockGetSessionKey = vi.fn();
const mockStoreSessionKey = vi.fn();
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

vi.mock('../../utils/styled', () => ({
  styled: (Component: React.ElementType | ComponentType<unknown>) => () => {
    const StyledComponent = ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(Component as React.ElementType, sanitizeDomProps(props), children);
    return StyledComponent;
  },
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
  LockScreen: ({ onMount }: { onMount?: () => void }) => {
    React.useEffect(() => {
      void onMount?.();
    }, [onMount]);
    return <input placeholder="Password" data-testid="lock-password-input" />;
  },
}));

vi.mock('../../utils/sessionKeyCache', () => ({
  getSessionKey: () => mockGetSessionKey(),
  storeSessionKey: (...args: unknown[]) => mockStoreSessionKey(...args),
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
    fontSize: { xs: 12, sm: 14, md: 16, '2xl': 24 },
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
    mockGetSessionKey.mockResolvedValue(null);
    mockStoreSessionKey.mockResolvedValue(undefined);
    mockClearSessionKey.mockResolvedValue(undefined);
    mockGetStashItem.mockResolvedValue(null);
    mockThrottle.failedAttempts = 0;
    mockThrottle.remainingMs = 0;
    mockThrottle.remainingSeconds = 0;
  });

  it('requires explicit re-authentication on the lock screen even if a session key exists', async () => {
    const sessionKey = {
      key: [1, 2, 3],
      salt: 'salt',
      iterations: 210000,
      digest: 'sha512',
      expiresAt: Date.now() + 60_000,
    };

    mockGetSessionKey.mockResolvedValue(sessionKey);

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
});
