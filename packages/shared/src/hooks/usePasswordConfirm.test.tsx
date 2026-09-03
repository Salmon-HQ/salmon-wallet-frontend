/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePasswordConfirm } from './usePasswordConfirm';

const t = (key: string, fallback: string) => `${key}|${fallback}`;

const setup = (over: Partial<Parameters<typeof usePasswordConfirm>[0]> = {}) => {
  const onConfirm = vi.fn(async () => {});
  const onClose = vi.fn();
  const params = { visible: true, requirePassword: true, onConfirm, onClose, t, ...over };
  const hook = renderHook((p) => usePasswordConfirm(p), { initialProps: params });
  return { ...hook, onConfirm, onClose, params };
};

describe('usePasswordConfirm', () => {
  it('asks for the password before it tries anything', async () => {
    const validatePassword = vi.fn(async () => true);
    const { result, onConfirm } = setup({ validatePassword });
    expect(result.current.canConfirm).toBe(false);
    await act(() => result.current.confirm());
    expect(result.current.passwordError).toBe('errors.password_required|Password is required');
    expect(validatePassword).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('refuses a wrong password and never runs the action', async () => {
    const { result, onConfirm, onClose } = setup({ validatePassword: async () => false });
    act(() => result.current.setPassword('nope'));
    await act(() => result.current.confirm());
    expect(result.current.passwordError).toBe('errors.invalid_password|Invalid password');
    expect(result.current.loading).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('runs the action with the checked password, then closes', async () => {
    const { result, onConfirm, onClose } = setup({ validatePassword: async () => true });
    act(() => result.current.setPassword('right'));
    await act(() => result.current.confirm());
    expect(onConfirm).toHaveBeenCalledWith('right');
    expect(onClose).toHaveBeenCalled();
  });

  it('passes no password when none is required, and clears the error as the user types', async () => {
    const { result, onConfirm } = setup({
      requirePassword: false,
      validatePassword: async () => false,
    });
    expect(result.current.canConfirm).toBe(true);
    await act(() => result.current.confirm());
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it('resets when the sheet opens again', async () => {
    const { result, rerender, params } = setup({ validatePassword: async () => false });
    act(() => result.current.setPassword('nope'));
    await act(() => result.current.confirm());
    expect(result.current.passwordError).toBeDefined();
    rerender({ ...params, visible: false });
    rerender({ ...params, visible: true });
    expect(result.current.password).toBe('');
    expect(result.current.passwordError).toBeUndefined();
  });
});
