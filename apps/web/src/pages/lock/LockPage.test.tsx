/**
 * @vitest-environment jsdom
 */

import React from 'react';
import type { ComponentType, PropsWithChildren } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LockPage } from './LockPage';

const mockGetSessionKey = vi.fn();
const mockStoreSessionKey = vi.fn();
const mockClearSessionKey = vi.fn();
const mockGetStashItem = vi.fn();

// Mutable so a test can put the page into its throttled state.
const mockThrottle = { failedAttempts: 0, remainingMs: 0, remainingSeconds: 0, refresh: vi.fn() };
const mockNavigate = vi.fn();
const mockUnlockWithCachedKey = vi.fn();
const mockUnlockAccounts = vi.fn();
const mockRemoveAllAccounts = vi.fn();

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

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@salmon/ui', () => ({
  styled: (Component: React.ElementType | ComponentType<unknown>) => () => {
    const StyledComponent = ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(Component as React.ElementType, sanitizeDomProps(props), children);
    return StyledComponent;
  },
  PrimaryButton: ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => (
    <button {...sanitizeDomProps(props)}>{children}</button>
  ),
  ConfirmDialog: () => null,
  LoadingScreen: () => null,
  WarningNotice: ({ title, children }: PropsWithChildren<{ title?: string }>) => (
    <div role="alert">
      <span>{title}</span>
      <span>{children}</span>
    </div>
  ),
  WaterColumn: () => null,
  waterColumnHost: { position: 'relative', isolation: 'isolate' },
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
    componentSizes: { inputRadius: 12 },
    STASH_KEYS: { DERIVED_KEY: 'derivedKey' },
    getStashItem: (...args: unknown[]) => mockGetStashItem(...args),
    useUnlockThrottle: () => mockThrottle,
    useAccountsContext: () => [
      null,
      {
        unlockWithCachedKey: mockUnlockWithCachedKey,
        unlockAccounts: mockUnlockAccounts,
        removeAllAccounts: mockRemoveAllAccounts,
      },
    ],
  };
});

describe('Web LockPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionKey.mockResolvedValue(null);
    mockStoreSessionKey.mockResolvedValue(undefined);
    mockClearSessionKey.mockResolvedValue(undefined);
    mockGetStashItem.mockResolvedValue(null);
    mockUnlockWithCachedKey.mockResolvedValue(true);
    mockUnlockAccounts.mockResolvedValue(true);
    mockRemoveAllAccounts.mockResolvedValue(undefined);
    mockThrottle.failedAttempts = 0;
    mockThrottle.remainingMs = 0;
    mockThrottle.remainingSeconds = 0;
  });

  it('says why the prompt stopped accepting attempts, instead of going quiet', async () => {
    mockThrottle.failedAttempts = 4;
    mockThrottle.remainingMs = 5000;
    mockThrottle.remainingSeconds = 5;

    render(<LockPage />);

    // Label, not a dead form.
    expect(await screen.findByTestId('lock-throttle-notice')).toBeTruthy();
    expect(screen.getByTestId('lock-password-input')).toHaveProperty('disabled', true);
  });

  it('requires explicit re-authentication on the lock screen even if a session key exists', async () => {
    mockGetSessionKey.mockResolvedValue({
      key: [1, 2, 3],
      salt: 'salt',
      iterations: 210000,
      digest: 'sha512',
      expiresAt: Date.now() + 60_000,
    });

    render(<LockPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    });

    expect(mockUnlockWithCachedKey).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clears any cached session key as soon as the lock screen mounts', async () => {
    render(<LockPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    });

    expect(mockClearSessionKey).toHaveBeenCalledTimes(1);
  });
});
