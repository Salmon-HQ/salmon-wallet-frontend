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
