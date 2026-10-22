import { describe, expect, it } from 'vitest';
import { sanitizeDecimalInput } from './decimal-input';

describe('sanitizeDecimalInput', () => {
  it('accepts a comma as the decimal separator', () => {
    expect(sanitizeDecimalInput('0,5')).toBe('0.5');
    expect(sanitizeDecimalInput('1.234,56'.replace('.', ''))).toBe('1234.56');
  });

  it('keeps dot input unchanged', () => {
    expect(sanitizeDecimalInput('0.5')).toBe('0.5');
    expect(sanitizeDecimalInput('123')).toBe('123');
  });

  it('collapses extra separators into one decimal point', () => {
    expect(sanitizeDecimalInput('1.2.3')).toBe('1.23');
    expect(sanitizeDecimalInput('1,2,3')).toBe('1.23');
    expect(sanitizeDecimalInput('1.2,3')).toBe('1.23');
  });

  it('strips everything that is not a digit or separator', () => {
    expect(sanitizeDecimalInput('1a2b,5')).toBe('12.5');
    expect(sanitizeDecimalInput('$ 3,50')).toBe('3.50');
    expect(sanitizeDecimalInput('')).toBe('');
  });
});

// Option (a), owner: a digit past the token's places is simply not taken —
// no message, the field keeps what it had. The send's own refusal of a finer
// amount stays behind it as the backstop.
describe("sanitizeDecimalInput within the token's places", () => {
  it('takes no fraction digit past the token decimals', () => {
    expect(sanitizeDecimalInput('1.1234567', 6)).toBe('1.123456');
    expect(sanitizeDecimalInput('0.123', 2)).toBe('0.12');
    expect(sanitizeDecimalInput('0,999', 2)).toBe('0.99');
  });

  it('keeps everything up to the limit, the separator included', () => {
    expect(sanitizeDecimalInput('1.123456', 6)).toBe('1.123456');
    expect(sanitizeDecimalInput('1.', 6)).toBe('1.');
    expect(sanitizeDecimalInput('', 6)).toBe('');
  });

  it('takes no separator at all for a token with no decimals', () => {
    expect(sanitizeDecimalInput('5.', 0)).toBe('5');
    expect(sanitizeDecimalInput('5,3', 0)).toBe('5');
    expect(sanitizeDecimalInput('12', 0)).toBe('12');
  });

  it('limits nothing when no places are given', () => {
    expect(sanitizeDecimalInput('1.1234567890123')).toBe('1.1234567890123');
  });
});
