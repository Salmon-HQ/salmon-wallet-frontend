import { describe, expect, it } from 'vitest';

import { withAlpha } from './withAlpha';

describe('withAlpha', () => {
  it('rewrites a 6-digit hex at the given alpha', () => {
    expect(withAlpha('#F6F8FB', 0)).toBe('rgba(246, 248, 251, 0)');
  });

  it('expands a 3-digit hex', () => {
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });

  it('replaces the alpha of an rgba() string', () => {
    expect(withAlpha('rgba(11, 15, 25, 0.48)', 0)).toBe('rgba(11, 15, 25, 0)');
  });

  it('never yields the black tint a transparent stop carries', () => {
    expect(withAlpha('#070911', 0)).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('rejects colours it cannot read rather than guessing', () => {
    expect(() => withAlpha('transparent', 0)).toThrow();
    expect(() => withAlpha('#F6F8FB', 2)).toThrow();
  });
});
