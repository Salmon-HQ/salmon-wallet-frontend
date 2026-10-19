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
    const result = validateEvent('send_completed', {
      chain: 'solana',
      success: true,
    });
    expect(result).toEqual({
      event: 'send_completed',
      props: { chain: 'solana', success: true },
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

describe('the success prop', () => {
  // Every caller passes a boolean. A string there is either a mistake or a
  // value smuggled through a key whose name the guardrail trusts.
  it('takes a boolean and refuses a free-form string', () => {
    expect(() => validateEvent('send_completed', { success: true })).not.toThrow();
    expect(() => validateEvent('send_completed', { success: 'user-42-declined' })).toThrow(
      AnalyticsValidationError
    );
  });

  // The backend rejects a string `success` too; the two sides agree on both outcomes.
  it('takes false and refuses the string "true"', () => {
    expect(validateEvent('memo_sent', { success: false }).props).toEqual({ success: false });
    expect(() => validateEvent('memo_sent', { success: 'true' })).toThrow(/must be a boolean/);
  });
});

describe('the powerup prop', () => {
  it('takes a Powerup id from the registry list', () => {
    expect(validateEvent('powerup_installed', { powerup: 'memo' }).props).toEqual({
      powerup: 'memo',
    });
  });

  it('refuses a Powerup that is not in the list', () => {
    expect(() => validateEvent('powerup_installed', { powerup: 'jupiter' })).toThrow(/not one of/);
  });
});
