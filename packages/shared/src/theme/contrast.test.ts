import { describe, expect, it } from 'vitest';

import { neutral, salmon } from './palette';
import { accent, border, depth, state, status, surface, text } from './semantic';
import { colors } from './colors';

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

/**
 * The focus ring is drawn inset, as two bands: `state.focusVisible` over a
 * `depth.abyss` separator. Two bands rather than one because the ring has to
 * survive landing on a salmon-filled button, where the salmon band alone
 * vanishes. These assertions are what stop someone from "simplifying" the
 * ring back to a single band and silently failing 1.4.11 on every primary
 * button in the app.
 */
describe('contrast: the inset focus ring', () => {
  it('the salmon band carries the ring on dark surfaces', () => {
    expect(contrast(state.focusVisible, depth.column)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('the salmon band alone is NOT enough on a salmon fill', () => {
    expect(contrast(state.focusVisible, accent.fill)).toBeLessThan(AA_NON_TEXT);
  });

  it('the abyss band covers exactly that case', () => {
    expect(contrast(depth.abyss, accent.fill)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('one of the two bands always clears 3:1', () => {
    const grounds = [depth.column, surface.shelf, surface.raised, surface.crest, accent.fill];
    for (const ground of grounds) {
      const best = Math.max(
        Number(contrast(state.focusVisible, ground)),
        Number(contrast(depth.abyss, ground))
      );
      expect(best, `no band reaches 3:1 on ${ground}`).toBeGreaterThanOrEqual(AA_NON_TEXT);
    }
  });
});

/**
 * Fields that keep their own focus indicator instead of the theme ring
 * (`PasswordInput`/`InputAddress` wrappers, the recover textarea) all signal
 * focus by recoloring a 1px border to `colors.accent.primary`. WCAG 2.2
 * 1.4.11 asks that indicator for 3:1 against what sits either side of it.
 */
describe('contrast: component-owned focus borders', () => {
  const accentPrimary = colors.accent.primary;
  /** `colors.input.background` is rgba(64,73,98,.2); these are it composited. */
  const fillOverColumn = '#161B28';
  const fillOverShelf = '#1A1E2A';

  it('clears 3:1 against the ground outside the field', () => {
    expect(contrast(accentPrimary, depth.column)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    expect(contrast(accentPrimary, surface.shelf)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('clears 3:1 against the fill inside the field', () => {
    expect(contrast(accentPrimary, fillOverColumn)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    expect(contrast(accentPrimary, fillOverShelf)).toBeGreaterThanOrEqual(AA_NON_TEXT);
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
