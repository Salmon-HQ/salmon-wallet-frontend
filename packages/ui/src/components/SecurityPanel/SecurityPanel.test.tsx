/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { renderInMode } from '../../test/renderInMode';
import { SecurityPanel } from './SecurityPanel';

const mockChangePassword = vi.fn();
const mockOnPasswordChanged = vi.fn();
const mockLockAccounts = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : _key),
  }),
}));

// The real barrel, with only the accounts context and validator overridden
// so the password-change flow is deterministic under test.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useAccountsContext: () => [
    { requiredLock: true },
    { changePassword: mockChangePassword, lockAccounts: mockLockAccounts },
  ],
  validatePassword: () => ({ isValid: true, strength: 'strong' }),
  getPasswordIssue: () => null,
}));

vi.mock('../PasswordInput', () => ({
  PasswordInput: ({
    value,
    onChangeText,
    placeholder,
  }: {
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
  }) => (
    <input
      value={value}
      onChange={(event) => onChangeText(event.target.value)}
      placeholder={placeholder}
    />
  ),
  PasswordStrengthBar: () => <div>Password strong</div>,
}));

function fillPasswords(confirm = 'test-password-111') {
  fireEvent.change(screen.getByPlaceholderText('settings.security.current_password'), {
    target: { value: 'test-password-000' },
  });
  fireEvent.change(screen.getByPlaceholderText('settings.security.new_password'), {
    target: { value: 'test-password-111' },
  });
  fireEvent.change(screen.getByPlaceholderText('settings.security.confirm_password'), {
    target: { value: confirm },
  });
}

describe('SecurityPanel', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockChangePassword.mockResolvedValue(true);
    mockOnPasswordChanged.mockResolvedValue(undefined);
  });

  it('runs onPasswordChanged after a successful password change', async () => {
    renderInMode(
      'dark',
      <SecurityPanel onBack={() => {}} onPasswordChanged={mockOnPasswordChanged} />
    );

    fillPasswords();
    fireEvent.click(screen.getByTestId('security-change-password-button'));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('test-password-000', 'test-password-111');
    });

    expect(mockOnPasswordChanged).toHaveBeenCalledTimes(1);
  });

  it('keeps the change-password control disabled until all three fields are filled', () => {
    renderInMode('dark', <SecurityPanel onBack={() => {}} />);

    const button = screen.getByTestId('security-change-password-button');
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('settings.security.current_password'), {
      target: { value: 'test-password-000' },
    });
    fireEvent.change(screen.getByPlaceholderText('settings.security.new_password'), {
      target: { value: 'test-password-111' },
    });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('settings.security.confirm_password'), {
      target: { value: 'test-password-111' },
    });
    expect(button).toBeEnabled();
  });

  it('announces the success message politely rather than assertively', async () => {
    renderInMode(
      'dark',
      <SecurityPanel onBack={() => {}} onPasswordChanged={mockOnPasswordChanged} />
    );

    fillPasswords();
    fireEvent.click(screen.getByTestId('security-change-password-button'));

    const message = await screen.findByText('settings.security.password_changed');
    expect(message.closest('[role]')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('announces a validation error politely rather than assertively', async () => {
    renderInMode('dark', <SecurityPanel onBack={() => {}} />);

    fillPasswords('test-password-222');
    fireEvent.click(screen.getByTestId('security-change-password-button'));

    const message = await screen.findByText('settings.security.password_mismatch');
    expect(message.closest('[role]')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('answers "how protected am I" first, then reaches recovery, then locks', () => {
    const onNavigate = vi.fn();
    renderInMode('dark', <SecurityPanel onBack={() => {}} onNavigate={onNavigate} />);

    expect(screen.getByTestId('security-score')).toBeTruthy();

    fireEvent.click(screen.getByTestId('security-recovery-phrase'));
    expect(onNavigate).toHaveBeenCalledWith('backup');

    fireEvent.click(screen.getByTestId('security-lock-now-button'));
    expect(mockLockAccounts).toHaveBeenCalled();
  });
});
