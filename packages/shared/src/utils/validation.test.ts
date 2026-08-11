import { describe, expect, it } from 'vitest';
import { getMessageType, getValidationState, VALIDATION_MESSAGES } from './validation';
import type { ValidationResult } from '../types/validation';

describe('validation utils', () => {
  it('exposes expected message mappings', () => {
    expect(VALIDATION_MESSAGES.network_error).toBe('send.validation.network_error');
    expect(VALIDATION_MESSAGES.same_address).toBe('send.validation.same_address');
    expect(VALIDATION_MESSAGES.no_funds).toBe('send.validation.no_funds');
  });

  it('maps null validation results to idle unless validating', () => {
    expect(getValidationState(null, false)).toBe('idle');
    expect(getValidationState(null, true)).toBe('loading');
  });

  it('maps success warning and error results to ui states', () => {
    const success: ValidationResult = { type: 'SUCCESS', code: 'valid' };
    const warning: ValidationResult = { type: 'WARNING', code: 'no_info' };
    const error: ValidationResult = { type: 'ERROR', code: 'invalid' };

    expect(getValidationState(success, false)).toBe('valid');
    expect(getValidationState(warning, false)).toBe('warning');
    expect(getValidationState(error, false)).toBe('invalid');
  });

  it('maps message types correctly', () => {
    expect(getMessageType(null)).toBeNull();
    expect(getMessageType({ type: 'SUCCESS', code: 'valid' })).toBeNull();
    expect(getMessageType({ type: 'WARNING', code: 'no_info' })).toBe('warning');
    expect(getMessageType({ type: 'ERROR', code: 'invalid' })).toBe('error');
  });
});
