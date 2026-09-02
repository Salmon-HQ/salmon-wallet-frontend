/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useChangePassword } from './useChangePassword';

const t = (key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;

const STRONG = 'Correct-Horse-Battery-9';

const setup = (changePassword = vi.fn(async () => true)) => {
  const onPasswordChanged = vi.fn(async () => {});
  const hook = renderHook(() => useChangePassword({ changePassword, onPasswordChanged, t }));
  return { ...hook, changePassword, onPasswordChanged };
};

const fill = (
  result: { current: ReturnType<typeof useChangePassword> },
  next: string,
  confirm = next
) =>
  act(() => {
    result.current.setCurrentPassword('old-password-1');
    result.current.setNewPassword(next);
    result.current.setConfirmPassword(confirm);
  });

describe('useChangePassword', () => {
  it('refuses a mismatch before touching the vault', async () => {
    const { result, changePassword } = setup();
    fill(result, STRONG, `${STRONG}x`);
    await act(() => result.current.submit());
    expect(result.current.error).toBe('settings.security.password_mismatch');
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('refuses a weak password with the reason', async () => {
    const { result, changePassword } = setup();
    fill(result, 'short');
    await act(() => result.current.submit());
    expect(result.current.error.startsWith('wallet.create.password_too_')).toBe(true);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('changes the password, tells the caller, clears the fields and says so', async () => {
    const { result, changePassword, onPasswordChanged } = setup();
    fill(result, STRONG);
    await act(() => result.current.submit());
    expect(changePassword).toHaveBeenCalledWith('old-password-1', STRONG);
    expect(onPasswordChanged).toHaveBeenCalled();
    expect(result.current.success).toBe(true);
    expect(result.current.currentPassword).toBe('');
    expect(result.current.canSubmit).toBe(false);
  });

  it('reports a wrong current password, whether the vault says no or throws', async () => {
    const { result } = setup(vi.fn(async () => false));
    fill(result, STRONG);
    await act(() => result.current.submit());
    expect(result.current.error).toBe('settings.security.wrong_password');

    const thrown = setup(vi.fn(async () => Promise.reject(new Error('locked'))));
    fill(thrown.result, STRONG);
    await act(() => thrown.result.current.submit());
    expect(thrown.result.current.error).toBe('settings.security.wrong_password');
    expect(thrown.result.current.loading).toBe(false);
  });

  it('clears the error as soon as any field changes', async () => {
    const { result } = setup();
    fill(result, STRONG, 'other');
    await act(() => result.current.submit());
    expect(result.current.error).not.toBe('');
    act(() => result.current.setConfirmPassword(STRONG));
    expect(result.current.error).toBe('');
  });
});
