/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddressValidation } from './useAddressValidation';
import type { ValidationResult } from '../types/validation';

const VALID_ADDRESS = 'So11111111111111111111111111111111111111112';
const DOMAIN = 'nachomileo.sol';

describe('useAddressValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('stays idle for empty input and reports idle validation state', () => {
    const onValidation = vi.fn();
    const account = {
      validateDestinationAccount: vi.fn(),
    };

    const { result } = renderHook(() =>
      useAddressValidation('', account as any, { onValidation }),
    );

    expect(result.current.validationState).toBe('idle');
    expect(result.current.validationResult).toBeNull();
    expect(result.current.isValid).toBe(false);
    expect(account.validateDestinationAccount).not.toHaveBeenCalled();
    expect(onValidation).toHaveBeenCalledWith({
      isValid: false,
      state: 'idle',
      result: null,
    });
  });

  it('validates after debounce and exposes resolved domain data', async () => {
    const onValidation = vi.fn();
    const validationResult: ValidationResult = {
      type: 'SUCCESS',
      code: 'valid',
      addressType: 'DOMAIN',
      resolvedAddress: VALID_ADDRESS,
    };
    const account = {
      validateDestinationAccount: vi.fn().mockResolvedValue(validationResult),
    };

    const { result } = renderHook(() =>
      useAddressValidation(DOMAIN, account as any, { debounceMs: 100, onValidation }),
    );

    expect(result.current.validationState).toBe('idle');

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(account.validateDestinationAccount).toHaveBeenCalledWith(DOMAIN);
    expect(result.current.validationState).toBe('valid');
    expect(result.current.validationResult).toEqual(validationResult);
    expect(result.current.isValid).toBe(true);
    expect(result.current.resolvedAddress).toBe(VALID_ADDRESS);
    expect(result.current.isDomain).toBe(true);
    expect(result.current.message).toBeNull();
    expect(result.current.messageType).toBeNull();
    expect(onValidation).toHaveBeenLastCalledWith({
      isValid: true,
      state: 'valid',
      result: validationResult,
      resolvedAddress: VALID_ADDRESS,
      isDomain: true,
    });
  });

  it('maps warning results to warning state and warning message', async () => {
    const validationResult: ValidationResult = {
      type: 'WARNING',
      code: 'no_info',
      addressType: 'PUBLIC_KEY',
    };
    const account = {
      validateDestinationAccount: vi.fn().mockResolvedValue(validationResult),
    };

    const { result } = renderHook(() =>
      useAddressValidation(VALID_ADDRESS, account as any, { debounceMs: 50 }),
    );

    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(result.current.validationState).toBe('warning');
    expect(result.current.isValid).toBe(true);
    expect(result.current.message).toBe('send.validation.no_info');
    expect(result.current.messageType).toBe('warning');
  });

  it('maps validation errors to invalid state and error message', async () => {
    const validationResult: ValidationResult = {
      type: 'ERROR',
      code: 'same_address',
    };
    const account = {
      validateDestinationAccount: vi.fn().mockResolvedValue(validationResult),
    };

    const { result } = renderHook(() =>
      useAddressValidation(VALID_ADDRESS, account as any, { debounceMs: 50 }),
    );

    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(result.current.validationState).toBe('invalid');
    expect(result.current.isValid).toBe(false);
    expect(result.current.message).toBe('send.validation.same_address');
    expect(result.current.messageType).toBe('error');
  });

  it('returns network_error when validation throws', async () => {
    const onValidation = vi.fn();
    const account = {
      validateDestinationAccount: vi.fn().mockRejectedValue(new Error('rpc down')),
    };

    const { result } = renderHook(() =>
      useAddressValidation(VALID_ADDRESS, account as any, { debounceMs: 50, onValidation }),
    );

    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(result.current.validationState).toBe('invalid');
    expect(result.current.validationResult).toEqual({
      type: 'ERROR',
      code: 'network_error',
    });
    expect(result.current.message).toBe('send.validation.network_error');
    expect(onValidation).toHaveBeenLastCalledWith({
      isValid: false,
      state: 'invalid',
      result: {
        type: 'ERROR',
        code: 'network_error',
      },
    });
  });

  it('does not validate when account is missing', async () => {
    const onValidation = vi.fn();

    const { result } = renderHook(() =>
      useAddressValidation(VALID_ADDRESS, undefined, { debounceMs: 50, onValidation }),
    );

    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(result.current.validationState).toBe('idle');
    expect(result.current.validationResult).toBeNull();
    expect(onValidation).not.toHaveBeenCalled();
  });
});
