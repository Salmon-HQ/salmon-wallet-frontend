/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SecurityPanel } from './SecurityPanel';

const mockChangePassword = vi.fn();
const mockOnPasswordChanged = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@salmon/shared', () => ({
  colors: {
    text: { secondary: '#999', primary: '#fff', disabled: '#666' },
    accent: { primary: '#0f0' },
    interactive: { hoverStrong: '#222' },
    status: {
      errorBackground: '#300',
      error: '#f00',
      successBackground: '#030',
      success: '#0f0',
    },
  },
  spacing: { xs: 4, md: 16, lg: 20, xl: 24 },
  borderRadius: { md: 8 },
  fontSize: { sm: 14 },
  fontWeight: { semibold: 600 },
  letterSpacing: { wider: '0.08em' },
  opacity: { soft: 0.9 },
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
      target: { value: 'old-password' },
    });
    fireEvent.change(screen.getByPlaceholderText('settings.security.new_password'), {
      target: { value: 'new-password-123' },
    });
    fireEvent.change(screen.getByPlaceholderText('settings.security.confirm_password'), {
      target: { value: 'new-password-123' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'settings.security.change_password_button' })
    );

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('old-password', 'new-password-123');
    });

    expect(mockOnPasswordChanged).toHaveBeenCalledTimes(1);
  });
});
