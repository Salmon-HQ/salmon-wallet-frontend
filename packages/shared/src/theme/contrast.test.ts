import { describe, expect, it } from 'vitest';

import { neutral, salmon } from './palette';
import { border, state, status, surface, text } from './semantic';

/**
 * WCAG 2.1 relative luminance and contrast ratio.
 *
 * These tests are the reason the semantic layer exists. The palette they
 * replaced shipped a 2.07:1 border on the password field and a 3.66:1
 * placeholder, and nothing caught it — a design token is only as good as the
 * assertion that stops someone from quietly lowering it again.
 */
const luminance = (hex: string): number => {
  const normalized = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(normalized.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

/** WCAG 1.4.3 — normal-size body text */
const AA_TEXT = 4.5;
/** WCAG 1.4.11 — non-text boundaries that carry meaning */
const AA_NON_TEXT = 3;

describe('contrast: text on opaque surfaces', () => {
  const surfaces = [
    ['shelf', surface.shelf],
    ['raised', surface.raised],
    ['crest', surface.crest],
    ['bedrock', surface.bedrock],
  ] as const;

  const readableRoles = [
    ['primary', text.primary],
    ['secondary', text.secondary],
    ['tertiary', text.tertiary],
    ['accent', text.accent],
  ] as const;

  for (const [surfaceName, surfaceValue] of surfaces) {
    for (const [roleName, roleValue] of readableRoles) {
      it(`text.${roleName} meets AA on surface.${surfaceName}`, () => {
        expect(contrast(roleValue, surfaceValue)).toBeGreaterThanOrEqual(AA_TEXT);
      });
    }
  }
});

describe('contrast: the salmon fill rule', () => {
  it('allows text.onAccent on a salmon fill', () => {
    expect(contrast(text.onAccent, salmon[500])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('rejects white on a salmon fill, which is why text.onAccent exists', () => {
    expect(contrast(neutral[0], salmon[500])).toBeLessThan(AA_TEXT);
  });
});

describe('contrast: borders are per-plane', () => {
  it('border.default carries meaning on surface.shelf', () => {
    expect(contrast(border.default, surface.shelf)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('border.default is NOT sufficient above surface.shelf', () => {
    expect(contrast(border.default, surface.raised)).toBeLessThan(AA_NON_TEXT);
  });

  it('border.raised covers the planes border.default cannot', () => {
    expect(contrast(border.raised, surface.raised)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    expect(contrast(border.raised, surface.crest)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});

describe('contrast: status and state', () => {
  for (const [name, value] of Object.entries({
    success: status.success,
    danger: status.danger,
    warning: status.warning,
  })) {
    it(`status.${name} is readable as ink on surface.shelf`, () => {
      expect(contrast(value, surface.shelf)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  }

  it('the focus ring is visible on every opaque surface', () => {
    for (const plane of [surface.shelf, surface.raised, surface.crest, surface.bedrock]) {
      expect(contrast(state.focusVisible, plane)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    }
  });
});

describe('contrast: values this palette replaced', () => {
  it('rejects the retired border, which failed 1.4.11 on the password field', () => {
    expect(contrast('#404962', surface.shelf)).toBeLessThan(AA_NON_TEXT);
  });

  it('rejects the retired placeholder color', () => {
    expect(contrast('#6B6E7B', surface.shelf)).toBeLessThan(AA_TEXT);
  });
});
