import { describe, expect, it } from 'vitest';

import { neutral, salmon } from './palette';
import { accent, border, depth, scales, state, status, surface, text, water } from './semantic';
import { colors, isOpaqueColor } from './colors';
import { shadowsCSS } from './shadows';
import { componentSizes } from './spacing';
import { fontSize } from './typography';

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
/** DESIGN.md — the ceiling for any stroke that carries no meaning at all */
const MOTIF_CEILING = 1.4;

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

/**
 * The water column: the ground's depth ramp and the marine snow suspended in
 * it. Two separate guarantees, and they fail in opposite directions.
 *
 * The **ramp** is a background colour, so the danger is that it drops text
 * below AA somewhere along its length. It cannot: both stops are neutrals and
 * the bottom stop is the darker of the two, so every role that clears AA at
 * the top clears it by more at the bottom. Asserted rather than assumed,
 * because someone will eventually want a lighter floor.
 *
 * The **snow** is a motif, so the danger is the opposite — that it climbs
 * until it reads as content. DESIGN.md caps any non-informational stroke at
 * 1.4:1, and every floc in `depthField.ts` is a multiplier ≤ 1 on this one
 * token (asserted in `depthField.test.ts`), so pinning the token pins the
 * whole field.
 */
describe('contrast: the water column', () => {
  /** Straight alpha in sRGB — what both renderers actually do. */
  const composite = (over: string, under: string, alpha: number): string => {
    const rgb = (hex: string) =>
      [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16));
    const [a, b] = [rgb(over), rgb(under)];
    return `#${a
      .map((channel, i) =>
        Math.round(channel * alpha + b[i] * (1 - alpha))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')}`;
  };

  const [rampTop, rampFloor] = water.gradient;
  /** `water.snow` is `rgba(199, 211, 232, 0.12)`. */
  const SNOW_HEX = '#C7D3E8';
  const SNOW_ALPHA = 0.12;

  it('the ramp starts on the ground the apps already paint', () => {
    // A different top stop would seam against every header, overlay and sheet
    // backdrop still painting `colors.background.primary`.
    expect(rampTop.toLowerCase()).toBe(colors.background.primary.toLowerCase());
  });

  it('the ramp only ever deepens', () => {
    expect(luminance(rampFloor)).toBeLessThan(luminance(rampTop));
  });

  const readableRoles = [
    ['primary', text.primary],
    ['secondary', text.secondary],
    ['tertiary', text.tertiary],
    ['accent', text.accent],
  ] as const;

  for (const [roleName, roleValue] of readableRoles) {
    it(`text.${roleName} clears AA at every point on the ramp`, () => {
      expect(contrast(roleValue, rampTop)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(roleValue, rampFloor)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  }

  it('the brightest floc stays decoration on the lightest ground it can land on', () => {
    const over = composite(SNOW_HEX, rampTop, SNOW_ALPHA);
    expect(contrast(over, rampTop)).toBeLessThan(MOTIF_CEILING);
  });

  it('and on the darkest, where the ratio is highest', () => {
    const over = composite(SNOW_HEX, rampFloor, SNOW_ALPHA);
    expect(contrast(over, rampFloor)).toBeLessThan(MOTIF_CEILING);
  });

  it('the deep field it frames is under the same ceiling', () => {
    // Sanity: the snow is meant to sit beside the scales, not out-read them.
    const scalesOver = composite('#C7D3E8', depth.column, 0.06);
    const snowOver = composite(SNOW_HEX, depth.column, SNOW_ALPHA);
    expect(contrast(scalesOver, depth.column)).toBeLessThan(MOTIF_CEILING);
    expect(contrast(snowOver, depth.column)).toBeLessThan(MOTIF_CEILING);
  });

  it('the deep field stays under the ceiling at the floor it fades to', () => {
    // The scales no longer fade to nothing, they fade to `deepFieldFloor`, so
    // the bottom of the column carries a real stroke and it has to be measured
    // rather than assumed harmless because it is faint.
    const alpha = 0.06 * scales.deepFieldFloor;
    for (const ground of [rampTop, rampFloor]) {
      expect(contrast(composite('#C7D3E8', ground, alpha), ground)).toBeLessThan(MOTIF_CEILING);
    }
  });
});

/**
 * The motif runs the height of the column now, so what keeps it off a number
 * is no longer a crop — it is that the content on top of it is opaque. That
 * makes the opacity of a list row a *contrast* property, not a style choice,
 * and it belongs in the file that stops someone quietly lowering one.
 *
 * DESIGN.md: content is opaque by default and translucency is a privilege of
 * floating chrome; plane P2 (shelf / raised / crest — "all lists, cards,
 * inputs, content") is marked "Opaque — the default". A translucent row would
 * put the water column behind an amount, which The Scales Exclusion Rule
 * forbids however faint the motif is.
 */
describe('contrast: content that occludes the motif', () => {
  it('the list-row fill is opaque', () => {
    expect(isOpaqueColor(colors.background.tokenItem)).toBe(true);
  });

  it('the list-row fill is distinct from every stop of the ground ramp', () => {
    // `surface.shelf` would have been the system's default choice, but it is
    // the ramp's own top stop — a row painted in it disappears into the ground
    // at the top of the column.
    for (const stop of water.gradient) {
      expect(colors.background.tokenItem.toLowerCase()).not.toBe(stop.toLowerCase());
    }
  });

  it('every text role on a list row still clears AA', () => {
    for (const role of [text.primary, text.secondary, text.tertiary, text.accent]) {
      expect(contrast(role, colors.background.tokenItem)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('recognises the translucent tiers as translucent, so they keep their blur', () => {
    expect(isOpaqueColor(surface.membraneThin)).toBe(false);
    expect(isOpaqueColor(surface.membraneThick)).toBe(false);
    expect(isOpaqueColor(border.hairline)).toBe(false);
    expect(isOpaqueColor(surface.bedrock)).toBe(true);
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

/**
 * The bezel — the 1px lit rim and 1px underside a filled control wears so it
 * reads as a body rather than a rectangle.
 *
 * Two things are worth pinning, and neither is "does it look nice". The first
 * is that the rim is decoration: it carries no meaning, so it must stay under
 * the motif ceiling rather than competing with a real border. The second is
 * the reason the underside must stay exactly 1px: `rgba(3, 6, 12, 0.50)` over a
 * salmon fill composites to `#813129`, where `text.onAccent` measures 2.28:1 —
 * well under AA. That is harmless while the shade is a single edge pixel and a
 * label glyph is nineteen pixels above it, and it stops being harmless the
 * moment someone "makes the inner shadow more visible" by adding blur or
 * spread. So the geometry is asserted, not just the colour.
 */
describe('contrast: the bezel', () => {
  /** `inset 0 ±1px 0 rgba(...)` — offsets and alphas, straight from the token. */
  const insets = [...shadowsCSS.bezel.matchAll(/inset 0 (-?\d+)px (\d+) rgba\(([^)]+)\)/g)].map(
    (match) => ({
      offsetY: Number(match[1]),
      blur: Number(match[2]),
      rgba: match[3].split(',').map(Number) as [number, number, number, number],
    })
  );

  /** Straight-alpha compositing in sRGB, which is what both renderers do. */
  const composite = ([r, g, b, alpha]: [number, number, number, number], under: string): string => {
    const base = [0, 2, 4].map((i) => parseInt(under.replace('#', '').slice(i, i + 2), 16));
    return `#${[r, g, b]
      .map((channel, i) =>
        Math.round(channel * alpha + base[i] * (1 - alpha))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')}`;
  };

  it('is one lit pixel above and one dark pixel below, with no blur or spread', () => {
    expect(insets).toHaveLength(2);
    expect(insets.map((inset) => inset.offsetY)).toEqual([1, -1]);
    for (const inset of insets) {
      expect(inset.blur).toBe(0);
    }
  });

  it('keeps the lit rim decorative on a salmon fill', () => {
    const lit = composite(insets[0].rgba, salmon[500]);
    expect(contrast(lit, salmon[500])).toBeLessThan(MOTIF_CEILING);
  });

  it('leaves the label sitting on the fill, never on the darkened underside', () => {
    const shaded = composite(insets[1].rgba, salmon[500]);
    // The row the underside darkens is genuinely too dark for the ink…
    expect(contrast(text.onAccent, shaded)).toBeLessThan(AA_TEXT);
    // …which is fine only because a centred label never reaches it. One line of
    // `fontSize.md` in a `buttonHeight` pill leaves this much clearance below
    // the glyph box, and the shade is `Math.abs(offsetY)` pixels tall.
    const clearance = (componentSizes.buttonHeight - fontSize.md) / 2;
    expect(clearance).toBeGreaterThan(Math.abs(insets[1].offsetY));
  });
});
