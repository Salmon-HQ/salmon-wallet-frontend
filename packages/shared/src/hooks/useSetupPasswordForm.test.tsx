/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSetupPasswordForm } from './useSetupPasswordForm';
import type { UseSetupPasswordFormParams } from './useSetupPasswordForm';

const t = (key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;

const STRONG = 'Correct-Horse-Battery-9';

const setup = (overrides: Partial<UseSetupPasswordFormParams> = {}) => {
  const checkPassword = vi.fn(async () => true);
  const hook = renderHook(() =>
    useSetupPasswordForm({
      showSingleInput: false,
      protect: false,
      flowType: 'create',
      checkPassword,
      t,
      ...overrides,
    })
  );
  return { ...hook, checkPassword: overrides.checkPassword ?? checkPassword };
};

const type = (
  result: { current: ReturnType<typeof useSetupPasswordForm> },
  password: string,
  confirm?: string
) =>
  act(() => {
    result.current.handlePasswordChange(password);
    if (confirm !== undefined) result.current.handleConfirmPasswordChange(confirm);
  });

describe('useSetupPasswordForm, setting a new password', () => {
  it('stays closed until the password is valid and confirmed', async () => {
    const { result } = setup();
    expect(result.current.submitDisabled).toBe(true);

    type(result, 'short', 'short');
    expect(result.current.submitDisabled).toBe(true);
    expect(result.current.passwordError).toMatch(/^wallet\.create\.password_too_short/);

    type(result, STRONG, `${STRONG}x`);
    expect(result.current.submitDisabled).toBe(true);
    expect(result.current.confirmError).toBe('wallet.create.passwords_dont_match');
    await expect(act(() => result.current.begin())).resolves.toBe(false);
    expect(result.current.isLoading).toBe(false);

    type(result, STRONG, STRONG);
    expect(result.current.submitDisabled).toBe(false);
    expect(result.current.passwordError).toBeUndefined();
    expect(result.current.confirmError).toBeUndefined();
  });

  it('raises the wait without checking any existing password', async () => {
    const { result, checkPassword } = setup();
    type(result, STRONG, STRONG);
    await expect(act(() => result.current.begin())).resolves.toBe(true);
    expect(checkPassword).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
  });

  it('stays closed while the platform has nothing to protect', () => {
    const { result } = setup({ canSubmit: false });
    type(result, STRONG, STRONG);
    expect(result.current.submitDisabled).toBe(true);
  });

  it('names the action on the button', () => {
    expect(setup().result.current.buttonText).toBe('wallet.create_wallet');
    expect(setup({ flowType: 'recover' }).result.current.buttonText).toBe('wallet.recover_wallet');
    expect(setup({ protect: true }).result.current.buttonText).toBe('wallet.protect.button');
  });
});

describe('useSetupPasswordForm, verifying an existing password', () => {
  it('needs only one field and applies no strength rule', () => {
    const { result } = setup({ showSingleInput: true });
    type(result, 'x');
    expect(result.current.submitDisabled).toBe(false);
    expect(result.current.passwordError).toBeUndefined();
  });

  it('carries on once the password verifies', async () => {
    const { result, checkPassword } = setup({ showSingleInput: true });
    type(result, 'existing');
    await expect(act(() => result.current.begin())).resolves.toBe(true);
    expect(checkPassword).toHaveBeenCalledWith('existing');
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isChecking).toBe(false);
  });

  it('stops on a refused password and reopens when it is retyped', async () => {
    const { result } = setup({ showSingleInput: true, checkPassword: vi.fn(async () => false) });
    type(result, 'wrong');
    await expect(act(() => result.current.begin())).resolves.toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isChecking).toBe(false);
    expect(result.current.passwordError).toBe('wallet.create.invalid_password');
    expect(result.current.submitDisabled).toBe(true);

    type(result, 'another');
    expect(result.current.passwordError).toBeUndefined();
    expect(result.current.submitDisabled).toBe(false);
  });

  it('reports a check that throws and does not raise the wait', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = setup({
      showSingleInput: true,
      checkPassword: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    type(result, 'existing');
    await expect(act(() => result.current.begin())).resolves.toBe(false);
    expect(result.current.error).toBe('wallet.create.invalid_password');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isChecking).toBe(false);
    logged.mockRestore();
  });
});
