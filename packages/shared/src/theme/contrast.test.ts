import { describe, expect, it } from 'vitest';

import { neutral, salmon } from './palette';
import { AVATAR_COLORS } from '../types/settings';
import {
  accent,
  border,
  createSemantic,
  depth,
  scales,
  state,
  status,
  surface,
  text,
  water,
} from './semantic';
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

/** Straight-alpha composite of an `rgba()` token over an opaque hex. */
const compositeOver = (translucent: string, backdrop: string): string => {
  const [r, g, b, alpha] = translucent
    .match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/)!
    .slice(1)
    .map(Number);
  const base = [0, 2, 4].map((i) => parseInt(backdrop.replace('#', '').slice(i, i + 2), 16));
  return `#${[r, g, b]
    .map((channel, i) =>
      Math.round(channel * alpha + base[i] * (1 - alpha))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
};

/** WCAG 1.4.3 — normal-size body text */
const AA_TEXT = 4.5;
/** WCAG 1.4.11 — non-text boundaries that carry meaning */
const AA_NON_TEXT = 3;
/** DESIGN.md — the ceiling for any stroke that carries no meaning at all */
const MOTIF_CEILING = 1.4;

/**
 * The two modes, for the blocks whose guarantee is a property of the *system*
 * rather than of the deep water: a text role has to clear AA on the surface it
 * sits on whichever end of the ramp the app is reading (spec 021).
 *
 * The blocks that stay dark-only below are the ones whose subject is the dark
 * material itself — the membrane tiers, the water column and its snow, the
 * two-band focus ring, the bezel. Those are re-tuned in the light material
 * pass; asserting them against light tokens today would assert a mode that
 * does not render.
 */
const MODES = [
  ['dark', createSemantic('dark')],
  ['light', createSemantic('light')],
] as const;

describe.each(MODES)('contrast: text on opaque surfaces (%s)', (_mode, tokens) => {
  const surfaces = [
    ['shelf', tokens.surface.shelf],
    ['raised', tokens.surface.raised],
    ['crest', tokens.surface.crest],
    ['bedrock', tokens.surface.bedrock],
  ] as const;

  const readableRoles = [
    ['primary', tokens.text.primary],
    ['secondary', tokens.text.secondary],
    ['tertiary', tokens.text.tertiary],
    ['accent', tokens.text.accent],
  ] as const;

  for (const [surfaceName, surfaceValue] of surfaces) {
    for (const [roleName, roleValue] of readableRoles) {
      it(`text.${roleName} meets AA on surface.${surfaceName}`, () => {
        expect(contrast(roleValue, surfaceValue)).toBeGreaterThanOrEqual(AA_TEXT);
      });
    }
  }

  it('every readable role clears AA on the app ground too', () => {
    for (const [, roleValue] of readableRoles) {
      expect(contrast(roleValue, tokens.depth.column)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

/**
 * The card material. `Card`'s `surface` tone (and everything built on it —
 * `ListRow`, `TokenListItem`) grounds on `membraneThin` instead of the
 * opaque `surface.raised` (2026-09-01, owner: what lies under a card must
 * show through a little). A card's real backdrop is the app's own ground,
 * not an arbitrary bright image the way a floating sheet's can be, so the
 * worst case that governs the card material's alpha is `water.gradient`'s
 * own lighter stop — the brightest the column ever paints behind a card.
 *
 * This is what let `membraneThin` and `membraneThick` drop from 0.62/0.80
 * to 0.48/0.66: body text stays comfortably above AA against the ground a
 * card actually sits on, at either gradient stop.
 */
describe('contrast: the membrane tiers over the water column', () => {
  /** A straight-alpha composite of a translucent token over an opaque one. */
  const composite = (translucent: string, backdrop: string): string => {
    const [r, g, b, alpha] = translucent
      .match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/)!
      .slice(1)
      .map(Number);
    const base = [0, 2, 4].map((i) => parseInt(backdrop.replace('#', '').slice(i, i + 2), 16));
    return `#${[r, g, b]
      .map((channel, i) =>
        Math.round(channel * alpha + base[i] * (1 - alpha))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')}`;
  };

  for (const [tier, tierValue] of [
    ['membraneThin', surface.membraneThin],
    ['membraneThick', surface.membraneThick],
  ] as const) {
    for (const groundStop of water.gradient) {
      it(`text.primary meets AA on ${tier} over the water column`, () => {
        expect(contrast(text.primary, composite(tierValue, groundStop))).toBeGreaterThanOrEqual(
          AA_TEXT
        );
      });
    }
  }
});

/**
 * The card material on a light ground.
 *
 * The dark block above measures a deep-neutral membrane against the water
 * column; the light one is the same test with the ink inverted — white at high
 * alpha over `depth.column`, which is the only ground a light card ever sits
 * on (the water ramp is dark-only until the material's own pass). Body text
 * has to clear AA on both tiers, and the tiers have to stay distinguishable
 * from the ground they float over, or a card stops reading as an object.
 */
describe('contrast: the membrane tiers on a light ground', () => {
  const light = createSemantic('light');

  for (const [tier, tierValue] of [
    ['membraneThin', light.surface.membraneThin],
    ['membraneThick', light.surface.membraneThick],
  ] as const) {
    const ground = compositeOver(tierValue, light.depth.column);

    it(`text.primary meets AA on ${tier}`, () => {
      expect(contrast(light.text.primary, ground)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it(`text.secondary meets AA on ${tier}`, () => {
      expect(contrast(light.text.secondary, ground)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  }
});

/**
 * The coral deep field — the one part of the underwater material that crosses
 * into light (owner, 2026-09-01).
 *
 * Same two bounds the dark field is held to, on the other ground: visible on a
 * real display, and under the decorative ceiling so it can be painted behind
 * type without becoming a data channel. The alpha is doubled because light
 * neutrals sit at the compressed end of the luminance curve — 0.03 coral on
 * `neutral-25` lands on the floor rather than above it.
 */
describe('contrast: the coral deep field on a light ground', () => {
  const light = createSemantic('light');
  const field = compositeOver(light.scales.deepFieldStroke, light.depth.column);

  it('stays under the decorative ceiling', () => {
    expect(contrast(field, light.depth.column)).toBeLessThan(MOTIF_CEILING);
  });

  it('clears the visibility floor', () => {
    expect(contrast(field, light.depth.column)).toBeGreaterThanOrEqual(1.03);
  });

  it('is still under the ceiling at the floor it fades to', () => {
    const [r, g, b, alpha] = light.scales.deepFieldStroke
      .match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/)!
      .slice(1)
      .map(Number);
    const faded = `rgba(${r}, ${g}, ${b}, ${alpha * light.scales.deepFieldFloor})`;
    expect(contrast(compositeOver(faded, light.depth.column), light.depth.column)).toBeLessThan(
      MOTIF_CEILING
    );
  });
});

describe.each(MODES)('contrast: the salmon fill rule (%s)', (_mode, tokens) => {
  it('allows text.onAccent on a salmon fill', () => {
    expect(contrast(tokens.text.onAccent, tokens.accent.fill)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('rejects white on a salmon fill, which is why text.onAccent exists', () => {
    expect(contrast(neutral[0], tokens.accent.fill)).toBeLessThan(AA_TEXT);
  });

  it('keeps the fill and its ink identical in both modes', () => {
    // DESIGN.md §Two modes: the CTA is the same object in daylight and at depth.
    expect(tokens.accent.fill).toBe(salmon[500]);
    expect(tokens.text.onAccent).toBe(neutral[1000]);
  });
});

/**
 * The status-fill rule — the general form of the salmon rule above.
 *
 * A `*-500` step is *ink*: it is chosen to be readable on the deep neutrals, so
 * it is light, so it cannot also be a fill under light ink. The destructive
 * button in every confirmation dialog was filled `danger-500` and labelled
 * `text.primary`: **2.50:1**, worse than the white-on-salmon pairing DESIGN.md
 * bans outright at 3.06:1, on the one control in the app that deletes a wallet.
 *
 * The fills are the `*-700` steps, and `text.primary` is what they carry.
 */
describe.each(MODES)('contrast: the status fill rule (%s)', (_mode, tokens) => {
  const fills = [
    ['success', tokens.status.successFill],
    ['danger', tokens.status.dangerFill],
    ['warning', tokens.status.warningFill],
  ] as const;

  /**
   * The ink a status fill carries. The fills are invariant `700` steps, so in
   * both modes the label on one is *light* ink — in light mode that is **not**
   * `text.primary`, which is `neutral-850` there and measures 2.69:1 on the
   * success fill. `status.onFill` is that ink, invariant like the fills, and
   * this is the assertion that keeps the pair legible in both modes.
   */
  const fillInk = tokens.status.onFill;

  for (const [name, fill] of fills) {
    it(`the destructive label meets AA on the ${name} fill`, () => {
      expect(contrast(fillInk, fill)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  }

  it('the destructive fill is at least as legible as the primary CTA', () => {
    // The safe path wears the salmon fill on a danger dialog, so the two labels
    // are read side by side. The destructive one must not be the fainter of the
    // pair — quieter in weight is the point, quieter in legibility is a bug.
    expect(contrast(fillInk, tokens.status.dangerFill)).toBeGreaterThanOrEqual(
      contrast(tokens.text.onAccent, tokens.accent.fill)
    );
  });
});

describe('contrast: a status ink is never a fill', () => {
  for (const [name, ink] of [
    ['success', status.success],
    ['danger', status.danger],
    ['warning', status.warning],
  ] as const) {
    it(`rejects light ink on the ${name} *ink* step used as a fill`, () => {
      // Both the ink this system has and plain white fail here. A status ink is
      // never a fill; reach for `status.${name}Fill` instead.
      expect(contrast(text.primary, ink)).toBeLessThan(AA_TEXT);
      expect(contrast(neutral[0], ink)).toBeLessThan(AA_TEXT);
    });
  }
});

describe('contrast: borders are per-plane (dark)', () => {
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

/**
 * The light mode's boundaries — the asymmetry DESIGN.md:312 predicted, now
 * measured. On a white card the mirrored neutral steps are worthless: the
 * `.pen`'s card hairline (`neutral-100`) measures 1.19:1, which is fine
 * because a card edge is decoration, and useless for anything a user has to
 * find. Every boundary that carries meaning — a field's edge, a step dot, an
 * emphasis border, a selected edge — steps to `neutral-500` or deeper, and
 * that is what this block pins.
 */
describe('contrast: the light mode boundaries', () => {
  const light = createSemantic('light');
  const grounds = [
    ['surface.shelf', light.surface.shelf],
    ['surface.raised', light.surface.raised],
    ['surface.crest', light.surface.crest],
    ['depth.column', light.depth.column],
  ] as const;

  const boundaries = [
    ['border.raised', light.border.raised],
    ['border.strong', light.border.strong],
    ['input.edge', light.input.edge],
    ['step.inactive', light.step.inactive],
    ['step.active', light.step.active],
    ['state.selectedEdge', light.state.selectedEdge],
    ['state.focusVisible', light.state.focusVisible],
  ] as const;

  for (const [boundaryName, boundary] of boundaries) {
    for (const [groundName, ground] of grounds) {
      it(`${boundaryName} clears 3:1 on ${groundName}`, () => {
        expect(contrast(boundary, ground)).toBeGreaterThanOrEqual(AA_NON_TEXT);
      });
    }
  }

  it('border.default stays the decorative hairline it is drawn as', () => {
    // Not a failure: 1.4.11 exempts decoration. It is recorded so nobody
    // "fixes" a card edge by promoting the token every card in the app reads.
    expect(contrast(light.border.default, light.surface.shelf)).toBeLessThan(AA_NON_TEXT);
  });
});

describe.each(MODES)('contrast: status and state (%s)', (_mode, tokens) => {
  for (const [name, value] of Object.entries({
    success: tokens.status.success,
    danger: tokens.status.danger,
    warning: tokens.status.warning,
  })) {
    it(`status.${name} is readable as ink on surface.shelf`, () => {
      expect(contrast(value, tokens.surface.shelf)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it(`status.${name} is readable as ink on its own tint`, () => {
      const tint = tokens.status[`${name}Tint` as 'successTint' | 'dangerTint' | 'warningTint'];
      const ground = tint.startsWith('rgba') ? compositeOver(tint, tokens.surface.shelf) : tint;
      expect(contrast(value, ground)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  }

  it('the focus ring is visible on every opaque surface', () => {
    for (const plane of [
      tokens.surface.shelf,
      tokens.surface.raised,
      tokens.surface.crest,
      tokens.surface.bedrock,
    ]) {
      expect(contrast(tokens.state.focusVisible, plane)).toBeGreaterThanOrEqual(AA_NON_TEXT);
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
  /**
   * Read out of `water.snow` rather than restated. A copy of the alpha here
   * goes stale silently the first time the token is tuned, and then this
   * suite is asserting the ceiling against a value nothing renders.
   */
  const SNOW_HEX = '#C7D3E8';
  const SNOW_ALPHA = Number(/,\s*([\d.]+)\s*\)/.exec(water.snow)?.[1]);

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
    const scalesOver = composite('#C7D3E8', depth.column, 0.03);
    const snowOver = composite(SNOW_HEX, depth.column, SNOW_ALPHA);
    expect(contrast(scalesOver, depth.column)).toBeLessThan(MOTIF_CEILING);
    expect(contrast(snowOver, depth.column)).toBeLessThan(MOTIF_CEILING);
  });

  it('the deep field stays under the ceiling at the floor it fades to', () => {
    // The scales no longer fade to nothing, they fade to `deepFieldFloor`, so
    // the bottom of the column carries a real stroke and it has to be measured
    // rather than assumed harmless because it is faint.
    const alpha = 0.03 * scales.deepFieldFloor;
    for (const ground of [rampTop, rampFloor]) {
      expect(contrast(composite('#C7D3E8', ground, alpha), ground)).toBeLessThan(MOTIF_CEILING);
    }
  });

  it('the deep field still clears the visibility floor on an OLED at full brightness', () => {
    // Halved 2026-09-01 (owner: the field should read as farther away). The
    // floor is ~1.03:1 on `depth.column` — below that the stroke is
    // indistinguishable from the ground on the darkest real display.
    const scalesOver = composite('#C7D3E8', depth.column, 0.03);
    expect(contrast(scalesOver, depth.column)).toBeGreaterThanOrEqual(1.03);
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

  it('the status tints stay washes, never opaque fills', () => {
    // A tint carries no text contrast of its own — the ink on top does. What
    // makes that safe is that the tint stays translucent over an opaque
    // surface; an opaque value here would be a fill wearing a tint's name.
    for (const tint of [
      status.successTint,
      status.dangerTint,
      status.warningTint,
      status.warningTintBorder,
    ]) {
      expect(isOpaqueColor(tint)).toBe(false);
    }
  });
});

/**
 * The warning notice stays a wash on an opaque plane — it is not a membrane.
 *
 * DESIGN.md §The five planes puts "all lists, cards, inputs, content" on P2,
 * opaque by default, and reserves translucency for the floating chrome of P3.
 * A notice is content, and the 10% status tint it wears does not make it a
 * membrane: §Colors' status entry defines the tints as washes that sit *under*
 * status ink and "never carry text contrast of their own" — the opaque plane
 * beneath still supplies the ratio.
 *
 * The arithmetic is what closes the argument, so it lives here rather than in
 * a component comment. The notice's title is its status ink at `fontSize.sm`,
 * which is small text under 1.4.3. Measured against the worst-case composites
 * §The scrim floor derives each tier from — the tint over pure white — the
 * danger step fails AA on the thick tier and both status steps fail on the
 * thin one. Re-grounding the notice on the membrane material would therefore
 * demote the one component whose job is that security state is impossible to
 * miss.
 */
describe('contrast: why the warning notice is not a membrane', () => {
  /** A straight-alpha composite of a translucent token over an opaque one. */
  const composite = (translucent: string, backdrop: string): string => {
    const [r, g, b, alpha] = translucent
      .match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/)!
      .slice(1)
      .map(Number);
    const base = [0, 2, 4].map((i) => parseInt(backdrop.replace('#', '').slice(i, i + 2), 16));
    return `#${[r, g, b]
      .map((channel, i) =>
        Math.round(channel * alpha + base[i] * (1 - alpha))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')}`;
  };

  const WHITE = '#FFFFFF';

  it('keeps both status inks above AA on the tinted wash it wears today', () => {
    expect(
      contrast(status.danger, composite(status.dangerTint, surface.shelf))
    ).toBeGreaterThanOrEqual(AA_TEXT);
    expect(
      contrast(status.warning, composite(status.warningTint, surface.shelf))
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('drops the danger ink below AA on the thick tier, which is the notice title', () => {
    expect(contrast(status.danger, composite(surface.membraneThick, WHITE))).toBeLessThan(AA_TEXT);
  });

  it('drops both status inks below AA on the thin tier', () => {
    const thin = composite(surface.membraneThin, WHITE);
    expect(contrast(status.danger, thin)).toBeLessThan(AA_TEXT);
    expect(contrast(status.warning, thin)).toBeLessThan(AA_TEXT);
  });
});

/**
 * The tab bar on the thermocline — retired (§Navigation, 2026-09-01), and
 * this block with it in spirit: the tab bar is gone, so nothing composites
 * ink over `membraneThick` against an arbitrary bright backdrop any more.
 * `accent.inkOnMembrane` and the numbers below stay in `semantic.ts` and
 * here as a contract surface with no live consumer, same standing as the
 * refraction tokens — removing them outright needs a human's sign-off.
 *
 * What changed under this block (2026-09-01): `membraneThick` dropped from
 * 0.80 to 0.66 so cards show the water column through them (§Cards,
 * `contrast: the membrane tiers over the water column` above). That alpha
 * is chosen for the tier's live consumer — a card over its own dark ground
 * — not for a pure-white worst case, so the old pure-white guarantee this
 * block used to assert no longer holds. The assertions below now record
 * that honestly instead of pinning a guarantee nothing ships any more.
 */
describe('contrast: the tab bar on the thermocline (retired)', () => {
  /** `surface.membraneThick` composited over white, straight alpha in sRGB. */
  const membrane = (() => {
    const [r, g, b, alpha] = surface.membraneThick
      .match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/)!
      .slice(1)
      .map(Number);
    return `#${[r, g, b]
      .map((channel) =>
        Math.round(channel * alpha + 255 * (1 - alpha))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')}`;
  })();

  it('no longer clears AA text on the old pure-white worst case, thin as the tier now is', () => {
    expect(contrast(accent.inkOnMembrane, membrane)).toBeLessThan(AA_TEXT);
    expect(contrast(text.secondary, membrane)).toBeLessThan(AA_TEXT);
  });

  it('no longer clears the graphics threshold either, at 0.66', () => {
    expect(contrast(accent.ink, membrane)).toBeLessThan(AA_NON_TEXT);
    expect(contrast(text.tertiary, membrane)).toBeLessThan(AA_NON_TEXT);
  });
});

/**
 * Account avatars carry `text.primary` initials on a depth-ramp fill. The
 * rainbow palette this replaced put white initials on amber (#F59E0B, 1.86:1)
 * and lime (#84CC16, 1.90:1) — decoration passing itself off as identity.
 * Every step of the ramp must hold AA for the initials, or an account's only
 * label in the switcher is illegible.
 */
describe('contrast: avatar initials on the depth ramp', () => {
  for (const fill of AVATAR_COLORS) {
    it(`text.primary meets AA on avatar fill ${fill}`, () => {
      expect(contrast(text.primary, fill)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  }

  it('no avatar step is a card surface, so avatars never dissolve into their row', () => {
    for (const fill of AVATAR_COLORS) {
      expect(fill.toLowerCase()).not.toBe(surface.shelf.toLowerCase());
      expect(fill.toLowerCase()).not.toBe(surface.raised.toLowerCase());
    }
  });
});

/**
 * The eight `colors.*` groups migrated to `semantic.ts` in the 2026-09-01
 * cleanup (`specs/020-codebase-cleanup`). Each pairing below is the one an
 * ink actually sits on at a live call site.
 */
describe.each(MODES)('contrast: the migrated colors.* groups (%s)', (_mode, tokens) => {
  it('input.placeholder meets AA on input.ground', () => {
    expect(contrast(tokens.input.placeholder, tokens.input.ground)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('scanner.hint meets AA on scanner.ground', () => {
    expect(contrast(tokens.scanner.hint, tokens.scanner.ground)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('step.active clears the 3:1 UI-boundary floor on depth.column', () => {
    expect(contrast(tokens.step.active, tokens.depth.column)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('skeleton.highlight is visibly distinct from skeleton.base', () => {
    // Not a WCAG ratio — a shimmer that doesn't move isn't a shimmer. 1.3:1 is
    // the smallest step that reads as motion rather than a rounding error, and
    // it is the floor in both modes: light neutrals sit at the compressed end
    // of the luminance curve, so the light pair is two ramp steps apart rather
    // than one to buy the same visible movement.
    expect(contrast(tokens.skeleton.highlight, tokens.skeleton.base)).toBeGreaterThanOrEqual(1.3);
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
    // `fontSize.bodyLg` in a `buttonHeight` pill leaves this much clearance below
    // the glyph box, and the shade is `Math.abs(offsetY)` pixels tall.
    const clearance = (componentSizes.buttonHeight - fontSize.bodyLg) / 2;
    expect(clearance).toBeGreaterThan(Math.abs(insets[1].offsetY));
  });
});
