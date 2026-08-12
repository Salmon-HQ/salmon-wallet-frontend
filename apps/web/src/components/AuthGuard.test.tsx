/**
 * @vitest-environment jsdom
 *
 * AuthGuard init-failure gate: an init error with NO loaded accounts must
 * block (never redirect into onboarding), while an error with accounts
 * present must not block, and the lock screen keeps precedence.
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthGuard } from './AuthGuard';

const mockUseAccountsContext = vi.fn();
const mockRetryInit = vi.fn();

vi.mock('@salmon/shared', () => ({
  useAccountsContext: (...args: unknown[]) => mockUseAccountsContext(...args),
}));

vi.mock('@salmon/ui', () => ({
  LoadingScreen: () => <div data-testid="loading-screen" />,
  WalletInitErrorScreen: ({ onRetry }: { onRetry: () => void }) => (
    <button data-testid="wallet-init-error" onClick={onRetry} />
  ),
}));

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid={`navigate:${to}`} />,
  Outlet: () => <div data-testid="outlet" />,
}));

function setContext(
  state: Partial<{
    ready: boolean;
    locked: boolean;
    error: string | null;
    accounts: unknown[];
  }>
) {
  mockUseAccountsContext.mockReturnValue([
    { ready: true, locked: false, error: null, accounts: [], ...state },
    { retryInit: mockRetryInit },
  ]);
}

describe('AuthGuard init-failure gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('blocks with the init-error screen when init failed and no accounts loaded', () => {
    setContext({ error: 'init failed', accounts: [] });
    render(<AuthGuard />);

    expect(screen.getByTestId('wallet-init-error')).toBeTruthy();
    expect(screen.queryByTestId('navigate:/auth/select')).toBeNull();
  });

  it('does not block when accounts loaded despite a secondary error', () => {
    setContext({ error: 'secondary failure', accounts: [{ id: 'acc-1' }] });
    render(<AuthGuard />);

    expect(screen.queryByTestId('wallet-init-error')).toBeNull();
    expect(screen.getByTestId('outlet')).toBeTruthy();
  });

  it('gives the lock screen precedence over the init-error gate', () => {
    setContext({ locked: true, error: 'init failed', accounts: [] });
    render(<AuthGuard />);

    expect(screen.getByTestId('navigate:/lock')).toBeTruthy();
    expect(screen.queryByTestId('wallet-init-error')).toBeNull();
  });

  it('still routes to onboarding when there is no error and no accounts', () => {
    setContext({ error: null, accounts: [] });
    render(<AuthGuard />);

    expect(screen.getByTestId('navigate:/auth/select')).toBeTruthy();
  });

  it('wires the retry button to actions.retryInit', () => {
    setContext({ error: 'init failed', accounts: [] });
    render(<AuthGuard />);

    fireEvent.click(screen.getByTestId('wallet-init-error'));
    expect(mockRetryInit).toHaveBeenCalledTimes(1);
  });
});
