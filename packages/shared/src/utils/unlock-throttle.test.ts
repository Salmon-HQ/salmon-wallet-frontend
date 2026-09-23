import { describe, expect, it } from 'vitest';
import { passwordCheckErrorKey, UnlockThrottledError } from './unlock-throttle';

describe('passwordCheckErrorKey', () => {
  it('says "wait" when the throttle refused the check', () => {
    expect(passwordCheckErrorKey(new UnlockThrottledError(5_000), 'errors.invalid_password')).toBe(
      'errors.password_throttled'
    );
  });

  it("keeps the caller's own key for any other failure", () => {
    expect(passwordCheckErrorKey(new Error('storage'), 'errors.password_check_failed')).toBe(
      'errors.password_check_failed'
    );
  });
});
