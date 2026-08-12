/**
 * Guardrail tests. These are the anonymity contract — if one of these regresses,
 * a wallet address or raw amount could leave the device.
 */

import { describe, it, expect } from 'vitest';
import {
  validateEvent,
  safeValidateEvent,
  isAddressLike,
  AnalyticsValidationError,
} from './schema';

describe('isAddressLike', () => {
  it('flags a base58 Solana address', () => {
    expect(isAddressLike('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM')).toBe(true);
  });

  it('flags an EVM hex address', () => {
    expect(isAddressLike('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(true);
  });

  it('does not flag short categorical values', () => {
    expect(isAddressLike('solana')).toBe(false);
    expect(isAddressLike('10-100')).toBe(false);
  });
});

describe('validateEvent', () => {
  it('accepts a known event with allow-listed categorical props', () => {
    const result = validateEvent('swap_completed', {
      from_chain: 'solana',
      to_chain: 'ethereum',
      success: true,
    });
    expect(result).toEqual({
      event: 'swap_completed',
      props: { from_chain: 'solana', to_chain: 'ethereum', success: true },
    });
  });

  it('rejects an unknown event name', () => {
    expect(() => validateEvent('stole_the_seed')).toThrow(AnalyticsValidationError);
  });

  it('rejects a prop key that is not allow-listed', () => {
    expect(() => validateEvent('send_completed', { address: 'solana' } as never)).toThrow(
      /not allow-listed/
    );
  });

  it('rejects an address-shaped value', () => {
    expect(() =>
      validateEvent('send_completed', {
        chain: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      })
    ).toThrow(/address\/mint/);
  });

  it('rejects a raw numeric value (magnitudes must be bucketed strings)', () => {
    expect(() => validateEvent('send_completed', { amount_bucket: 42 as never })).toThrow(
      /string or boolean/
    );
  });

  it('rejects a value outside a closed enum', () => {
    expect(() => validateEvent('send_completed', { chain: 'dogecoin' })).toThrow(/not one of/);
  });

  it('drops null/undefined props instead of failing', () => {
    const result = validateEvent('send_completed', {
      chain: 'solana',
      success: undefined as never,
    });
    expect(result.props).toEqual({ chain: 'solana' });
  });
});

describe('safeValidateEvent', () => {
  it('returns null instead of throwing on invalid input', () => {
    expect(safeValidateEvent('nope')).toBeNull();
  });
});
