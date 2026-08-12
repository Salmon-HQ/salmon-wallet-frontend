import { describe, expect, it } from 'vitest';
import { getShortAddress, truncateHash } from './address';

describe('address utils', () => {
  it('returns undefined for empty addresses', () => {
    expect(getShortAddress(undefined)).toBeUndefined();
    expect(getShortAddress(null)).toBeUndefined();
  });

  it('does not truncate already short addresses', () => {
    expect(getShortAddress('0x1234')).toBe('0x1234');
  });

  it('truncates long addresses with default chars', () => {
    expect(getShortAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x12...5678');
  });

  it('truncates long addresses with custom chars', () => {
    expect(getShortAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 6)).toBe(
      '7xKXtg...osgAsU'
    );
  });

  it('truncates hashes with default chars', () => {
    expect(
      truncateHash(
        '3z56JsXvaPB7rauJYoNDui4SjwZNGAZw9DDZML29qmm6u8WVMGTkiAc7dfYe7SdHFXNa7H9Hnas6uvnsyA9a7UJc'
      )
    ).toBe('3z56Js...9a7UJc');
  });

  it('returns short hashes untouched', () => {
    expect(truncateHash('abc123')).toBe('abc123');
  });
});
