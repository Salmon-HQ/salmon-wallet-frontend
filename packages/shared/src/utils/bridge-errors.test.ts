import { describe, expect, it } from 'vitest';
import { classifyBridgeError } from './bridge-errors';

describe('classifyBridgeError', () => {
  it('maps a below-minimum provider rejection to the minimum message', () => {
    expect(
      classifyBridgeError(new Error('Bridge create exchange failed: amount is below the minimum')),
    ).toBe('bridge.errors.belowMinimum');
    expect(classifyBridgeError(new Error('Deposit amount is less than minimal'))).toBe(
      'bridge.errors.belowMinimum',
    );
  });

  it('maps an unreachable provider to the unavailable message', () => {
    expect(classifyBridgeError(new Error('Network error: Unable to reach the server'))).toBe(
      'bridge.errors.unavailable',
    );
    expect(classifyBridgeError(new Error('Bridge create exchange failed: pair is not available'))).toBe(
      'bridge.errors.unavailable',
    );
  });

  it('falls back to the generic message for unknown provider errors', () => {
    expect(classifyBridgeError(new Error('Failed to create bridge exchange'))).toBe(
      'bridge.errors.generic',
    );
    expect(classifyBridgeError(undefined)).toBe('bridge.errors.generic');
  });

  it('never reads a provider error as a chain fee problem', () => {
    expect(classifyBridgeError(new Error('insufficient funds for the requested exchange'))).toBe(
      'bridge.errors.generic',
    );
  });
});
