/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePasswordConfirm } from './usePasswordConfirm';
import { UnlockThrottledError } from '../utils/unlock-throttle';

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

  // A refusal for waiting is not a wrong password. Saying "Invalid password"
  // to someone who typed the right one sends them guessing again, which only
  // lengthens the wait.
  it('says to wait, not that the password is wrong, while a penalty stands', async () => {
    const { result, onConfirm } = setup({
      validatePassword: async () => {
        throw new UnlockThrottledError(5_000);
      },
    });
    act(() => result.current.setPassword('right-password-000'));
    await act(() => result.current.confirm());
    expect(result.current.passwordError?.startsWith('errors.password_throttled|')).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
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

  it('stays open and shows the error text when the action fails, until the next try', async () => {
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error('not stored'));
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, onClose } = setup({
      requirePassword: false,
      onConfirm,
      errorText: 'Could not save',
    });
    await act(() => result.current.confirm());
    quiet.mockRestore();

    expect(result.current.actionError).toBe('Could not save');
    expect(result.current.loading).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    let finish = () => {};
    onConfirm.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      })
    );
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.confirm();
    });
    expect(result.current.actionError).toBeUndefined();
    await act(async () => {
      finish();
      await pending;
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('says nothing about a failed action when the sheet has no error text', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, onClose } = setup({
      requirePassword: false,
      onConfirm: vi.fn().mockRejectedValueOnce(new Error('boom')),
    });
    await act(() => result.current.confirm());
    quiet.mockRestore();

    expect(result.current.actionError).toBeUndefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  // Two taps in one tick both read the `loading` of the render before them,
  // and after success the button is live again while the sheet slides out:
  // either way the action (a reset, a removal) would run twice.
  it('runs the action once for two presses in the same tick, and not again while it leaves', async () => {
    const { result, onConfirm, onClose } = setup({ requirePassword: false });
    await act(async () => {
      void result.current.confirm();
      await result.current.confirm();
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(() => result.current.confirm());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('runs the action again after it failed, and once more after the sheet reopens', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error('storage gone'));
    const { result, rerender, params } = setup({ requirePassword: false, onConfirm });
    await act(() => result.current.confirm());
    quiet.mockRestore();
    await act(() => result.current.confirm());
    expect(onConfirm).toHaveBeenCalledTimes(2);

    rerender({ ...params, visible: false });
    rerender({ ...params, visible: true });
    await act(() => result.current.confirm());
    expect(onConfirm).toHaveBeenCalledTimes(3);
  });

  it('clears the action error when the sheet opens again', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, rerender, params } = setup({
      requirePassword: false,
      onConfirm: vi.fn().mockRejectedValueOnce(new Error('boom')),
      errorText: 'Could not save',
    });
    await act(() => result.current.confirm());
    quiet.mockRestore();
    expect(result.current.actionError).toBe('Could not save');

    rerender({ ...params, visible: false });
    rerender({ ...params, visible: true });
    expect(result.current.actionError).toBeUndefined();
  });
});
