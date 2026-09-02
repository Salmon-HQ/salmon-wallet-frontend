/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { SecurityPanel } from './SecurityPanel';

const mockChangePassword = vi.fn();
const mockOnPasswordChanged = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

// The real barrel, with only the accounts context and validator overridden
// so the password-change flow is deterministic under test.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useAccountsContext: () => [null, { changePassword: mockChangePassword }],
  validatePassword: () => ({ isValid: true, strength: 'strong' }),
}));

vi.mock('../../utils/styled', async () => {
  const emotion = await import('@emotion/styled');
  return { styled: emotion.default };
});

vi.mock('../SettingsPanelContent', () => ({
  SettingsPanelContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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
}));

vi.mock('../PasswordInput/PasswordStrengthBar', () => ({
  PasswordStrengthBar: () => <div>Password strong</div>,
}));

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
    render(<SecurityPanel onBack={() => {}} onPasswordChanged={mockOnPasswordChanged} />);

    fireEvent.change(screen.getByPlaceholderText('settings.security.current_password'), {
      target: { value: 'test-password-000' },
    });
    fireEvent.change(screen.getByPlaceholderText('settings.security.new_password'), {
      target: { value: 'test-password-111' },
    });
    fireEvent.change(screen.getByPlaceholderText('settings.security.confirm_password'), {
      target: { value: 'test-password-111' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'settings.security.change_password_button' })
    );

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('test-password-000', 'test-password-111');
    });

    expect(mockOnPasswordChanged).toHaveBeenCalledTimes(1);
  });

  it('keeps the change-password control disabled until all three fields are filled', () => {
    render(<SecurityPanel onBack={() => {}} />);

    const button = screen.getByRole('button', {
      name: 'settings.security.change_password_button',
    });
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
    render(<SecurityPanel onBack={() => {}} onPasswordChanged={mockOnPasswordChanged} />);

    fireEvent.change(screen.getByPlaceholderText('settings.security.current_password'), {
      target: { value: 'test-password-000' },
    });
    fireEvent.change(screen.getByPlaceholderText('settings.security.new_password'), {
      target: { value: 'test-password-111' },
    });
    fireEvent.change(screen.getByPlaceholderText('settings.security.confirm_password'), {
      target: { value: 'test-password-111' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'settings.security.change_password_button' })
    );

    const message = await screen.findByText('settings.security.password_changed');
    expect(message.closest('[role]')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('announces a validation error politely rather than assertively', async () => {
    render(<SecurityPanel onBack={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('settings.security.current_password'), {
      target: { value: 'test-password-000' },
    });
    fireEvent.change(screen.getByPlaceholderText('settings.security.new_password'), {
      target: { value: 'test-password-111' },
    });
    fireEvent.change(screen.getByPlaceholderText('settings.security.confirm_password'), {
      target: { value: 'test-password-222' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'settings.security.change_password_button' })
    );

    const message = await screen.findByText('settings.security.password_mismatch');
    expect(message.closest('[role]')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
