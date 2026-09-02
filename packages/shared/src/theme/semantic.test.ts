import { describe, expect, it } from 'vitest';

import { createSemantic, semantic } from './semantic';
import { danger, neutral, salmon, success, warning } from './palette';

/**
 * The deep-water token set exactly as the hand-written layer shipped it,
 * captured before `createSemantic` replaced it (spec 021, step 1).
 *
 * This is the whole safety net of the resolver refactor: the light mode is a
 * new mapping, and the one thing it is not allowed to do is move a dark value.
 * Anything that changes here is a repaint of the shipped product and needs to
 * be an intentional, separate commit.
 */
const DARK_SNAPSHOT = {
  depth: { abyss: '#070911', column: '#0B0F19' },
  water: {
    gradient: ['#10131C', '#070911'],
    fadeTop: ['#10131C', 'rgba(16, 19, 28, 0)'],
    fadeBottom: ['rgba(7, 9, 17, 0)', '#070911'],
    snow: 'rgba(199, 211, 232, 0.09)',
    light: '#9FE0EF',
    crestShadow: { color: '#070911', alpha: 0.9 },
  },
  surface: {
    shelf: '#10131C',
    raised: '#161C2D',
    raisedFade: ['#161C2D', 'rgba(22, 28, 45, 0)'],
    crest: '#1B2233',
    membraneThin: 'rgba(11, 15, 25, 0.48)',
    membraneThick: 'rgba(11, 15, 25, 0.66)',
    bedrock: '#0B0F19',
  },
  text: {
    primary: '#EDF1F7',
    secondary: '#A7B1C4',
    tertiary: '#8B96AD',
    disabled: '#6F7B95',
    accent: '#FF5C45',
    onAccent: '#070911',
    onScrim: '#EDF1F7',
    onScrimSecondary: '#A7B1C4',
  },
  border: {
    default: '#58637B',
    raised: '#6F7B95',
    strong: '#8B96AD',
    hairline: 'rgba(199, 211, 232, 0.10)',
  },
  status: {
    success: '#33D6A6',
    danger: '#FF6B85',
    warning: '#FFB020',
    successFill: '#14795C',
    dangerFill: '#A32036',
    warningFill: '#7A5205',
    onFill: '#EDF1F7',
    successTint: 'rgba(76, 175, 80, 0.1)',
    dangerTint: 'rgba(239, 68, 68, 0.1)',
    warningTint: 'rgba(255, 171, 0, 0.1)',
    warningTintBorder: 'rgba(255, 171, 0, 0.3)',
  },
  change: { positive: '#33D6A6', negative: '#FF6B85', neutral: '#8B96AD' },
  state: {
    hover: 'rgba(199, 211, 232, 0.06)',
    press: 'rgba(199, 211, 232, 0.10)',
    focusVisible: '#FF9E8B',
    focusRingWidth: 2,
    focusRingOffset: 2,
    selectedFill: 'rgba(255, 92, 69, 0.12)',
    selectedEdge: '#FF5C45',
    disabledOpacity: 0.45,
  },
  accent: {
    ink: '#FF5C45',
    inkOnMembrane: '#FF9E8B',
    tint: 'rgba(255, 92, 69, 0.10)',
    tintHover: 'rgba(255, 92, 69, 0.15)',
    fill: '#FF5C45',
    onFill: '#070911',
  },
  scales: {
    deepFieldStroke: 'rgba(199, 211, 232, 0.03)',
    deepFieldScale: 3.2,
    deepFieldFloor: 0.35,
    fishStroke: 'rgba(7, 9, 17, 0.10)',
    fishScale: 1,
    refractionScale: 0.5,
    refractionSweep: ['#9FE0EF', '#FF9E8B', '#7BEFCB'],
  },
  flesh: { band: '#FFF1EE' },
  skeleton: { base: '#161C2D', highlight: '#2C3547' },
  input: { ground: '#161C2D', edge: '#58637B', placeholder: '#8B96AD' },
  overlay: {
    backdrop: 'rgba(7, 9, 17, 0.7)',
    highlight: 'rgba(255, 255, 255, 0.2)',
    scrim: 'rgba(7, 9, 17, 0.9)',
  },
  sheet: { handle: '#8B96AD' },
  step: { active: '#FF5C45', inactive: '#58637B' },
  scanner: { ground: '#070911', frame: '#161C2D', corner: '#8B96AD', hint: '#A7B1C4' },
  chain: {
    hintInk: {
      bitcoin: '#F59E0B',
      solana: '#8B5CF6',
      ethereum: '#6366F1',
      'bitcoin-testnet': '#F59E0B',
      'solana-devnet': '#8B5CF6',
      'ethereum-sepolia': '#6366F1',
    },
  },
};

/** Every leaf as `group.token`, so two modes can be diffed path by path. */
const flatten = (tokens: Record<string, Record<string, unknown>>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(tokens).flatMap(([group, entries]) =>
      // `JSON.stringify` rather than `String`: a group whose leaves are
      // themselves records — `chain.*`, keyed by chain — collapses to
      // "[object Object]" under `String`, and two modes that really differ
      // would compare equal.
      Object.entries(entries).map(([name, value]) => [`${group}.${name}`, JSON.stringify(value)])
    )
  );

const dark = createSemantic('dark');
const light = createSemantic('light');

describe('createSemantic: the dark mode is unmoved', () => {
  it('resolves byte-for-byte to the set the hand-written layer shipped', () => {
    expect(dark).toEqual(DARK_SNAPSHOT);
  });

  it('is what the static `semantic` export still is', () => {
    expect(semantic).toEqual(DARK_SNAPSHOT);
  });

  it('keeps the water ramp a two-stop tuple, which the gradient renderers need', () => {
    expect(dark.water.gradient).toHaveLength(2);
    expect(light.water.gradient).toHaveLength(2);
  });
});

/**
 * The fades (spec 022). A fade that ends on `'transparent'` passes through
 * black on its way to nothing — invisible on deep water, a dirty band on a
 * pale ground. Every fade here ends on *its own colour* at alpha 0, and the
 * ramp it derives from is real in both modes.
 */
describe('createSemantic: the fades end on their own colour', () => {
  /** `rgba(r, g, b, 0)` for the hex the stop beside it carries. */
  const zeroOf = (hex: string): string => {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, 0)`;
  };

  for (const [modeName, tokens] of [
    ['dark', dark],
    ['light', light],
  ] as const) {
    it(`resolves every fade in ${modeName} mode`, () => {
      const [top, topEnd] = tokens.water.fadeTop;
      expect(top).toBe(tokens.water.gradient[0]);
      expect(topEnd).toBe(zeroOf(tokens.water.gradient[0]));

      const [floorStart, floor] = tokens.water.fadeBottom;
      expect(floor).toBe(tokens.water.gradient[1]);
      expect(floorStart).toBe(zeroOf(tokens.water.gradient[1]));

      const [sheet, sheetEnd] = tokens.surface.raisedFade;
      expect(sheet).toBe(tokens.surface.raised);
      expect(sheetEnd).toBe(zeroOf(tokens.surface.raised));
    });

    it(`never lets a fade end on 'transparent' in ${modeName} mode`, () => {
      for (const fade of [
        tokens.water.fadeTop,
        tokens.water.fadeBottom,
        tokens.surface.raisedFade,
      ]) {
        expect(fade).toHaveLength(2);
        expect(fade).not.toContain('transparent');
      }
    });
  }

  it('builds a real light ramp rather than two identical stops', () => {
    expect(light.water.gradient[0]).toBe(neutral[25]);
    expect(light.water.gradient[1]).toBe(neutral[50]);
    expect(light.water.gradient[0]).not.toBe(light.water.gradient[1]);
  });
});

describe('createSemantic: what the light mode is allowed to change', () => {
  it('has exactly the same token paths as the dark mode', () => {
    expect(Object.keys(flatten(light))).toEqual(Object.keys(flatten(dark)));
  });

  /**
   * The frozen difference list. Adding a light value to a token that is
   * supposed to be mode-invariant — the brand fill, the scanner overlay, the
   * underwater material — is the failure this catches, in both directions.
   */
  it('differs from dark on exactly the tokens the spec maps', () => {
    const flatDark = flatten(dark);
    const flatLight = flatten(light);
    const differing = Object.keys(flatDark).filter((path) => flatDark[path] !== flatLight[path]);

    expect(differing.sort()).toEqual(
      [
        'accent.ink',
        'accent.tint',
        'accent.tintHover',
        'border.default',
        'border.hairline',
        'border.strong',
        'change.negative',
        'change.neutral',
        'change.positive',
        'depth.abyss',
        'depth.column',
        'input.edge',
        'input.ground',
        'input.placeholder',
        'overlay.backdrop',
        'overlay.highlight',
        'overlay.scrim',
        'scales.deepFieldStroke',
        'sheet.handle',
        'skeleton.base',
        'skeleton.highlight',
        'state.focusVisible',
        'state.hover',
        'state.press',
        'state.selectedEdge',
        'status.danger',
        'status.dangerTint',
        'status.success',
        'status.successTint',
        'status.warning',
        'status.warningTint',
        'status.warningTintBorder',
        'step.active',
        'step.inactive',
        'surface.bedrock',
        'surface.crest',
        'surface.membraneThick',
        'surface.membraneThin',
        'surface.raised',
        'surface.raisedFade',
        'surface.shelf',
        'text.accent',
        'text.disabled',
        'text.primary',
        'text.secondary',
        'text.tertiary',
        'water.crestShadow',
        'water.fadeBottom',
        'water.fadeTop',
        'water.gradient',
      ].sort()
    );
  });

  it('maps the grounds and surfaces to the light end of the same ramp', () => {
    expect(light.depth.column).toBe(neutral[25]);
    expect(light.depth.abyss).toBe(neutral[50]);
    expect(light.surface.shelf).toBe(neutral[0]);
    expect(light.surface.raised).toBe(neutral[0]);
    // Deviation from the spec table's neutral-25: that step is `depth.column`
    // itself, and `text.tertiary` drops to 4.01:1 on it.
    expect(light.surface.crest).toBe(neutral[0]);
    expect(light.surface.bedrock).toBe(neutral[0]);
  });

  it('maps the text roles the way the spec table does', () => {
    expect(light.text.primary).toBe(neutral[850]);
    // One step deeper than the spec table on both: `neutral-500` measures
    // 4.25:1 on white and misses AA, which forces tertiary to 600 and
    // secondary to 700 to stay a step above it.
    expect(light.text.secondary).toBe(neutral[700]);
    expect(light.text.tertiary).toBe(neutral[600]);
    expect(light.text.disabled).toBe(neutral[400]);
    expect(light.text.accent).toBe(salmon[700]);
  });

  it('takes the 700 status steps as ink and the 50 steps as their washes', () => {
    expect(light.status.success).toBe(success[700]);
    expect(light.status.danger).toBe(danger[700]);
    expect(light.status.warning).toBe(warning[700]);
    expect(light.status.successTint).toBe(success[50]);
    expect(light.status.dangerTint).toBe(danger[50]);
    expect(light.status.warningTint).toBe(warning[50]);
  });

  it('steps every meaningful boundary to neutral-500 or deeper', () => {
    expect(light.input.edge).toBe(neutral[500]);
    expect(light.step.inactive).toBe(neutral[500]);
    expect(light.border.raised).toBe(neutral[500]);
    // Deviation from the spec table's neutral-200: `border.strong` carries
    // meaning (chip outlines, hover edges), and neutral-200 is 1.30:1 on white.
    expect(light.border.strong).toBe(neutral[600]);
  });

  it('keeps the overlays at the dark mode alphas, with a neutral-900 ink', () => {
    for (const [key, value] of Object.entries(light.overlay)) {
      const alpha = /,\s*([\d.]+)\s*\)$/.exec(value)?.[1];
      const darkAlpha = /,\s*([\d.]+)\s*\)$/.exec(
        dark.overlay[key as keyof typeof dark.overlay]
      )?.[1];
      expect(alpha).toBe(darkAlpha);
      expect(value.startsWith('rgba(22, 28, 45')).toBe(true);
    }
  });
});

describe('createSemantic: the invariants a mode switch may not touch', () => {
  it('keeps the brand fill and the only ink allowed on it', () => {
    for (const tokens of [dark, light]) {
      expect(tokens.accent.fill).toBe(salmon[500]);
      expect(tokens.accent.onFill).toBe(neutral[1000]);
      expect(tokens.text.onAccent).toBe(neutral[1000]);
    }
  });

  it('keeps the status fills on the 700 steps in both modes', () => {
    for (const tokens of [dark, light]) {
      expect(tokens.status.successFill).toBe(success[700]);
      expect(tokens.status.dangerFill).toBe(danger[700]);
      expect(tokens.status.warningFill).toBe(warning[700]);
      expect(tokens.status.onFill).toBe(neutral[50]);
    }
  });

  it('keeps the camera overlay dark whatever the app is wearing', () => {
    expect(light.scanner).toEqual(dark.scanner);
  });

  it('draws the deep field in coral on a light ground', () => {
    // The one part of the material that crosses into light (owner,
    // 2026-09-01). Cold near-white on a pale ground is nothing; the brand's
    // own hue at a low alpha is a scale field.
    expect(dark.scales.deepFieldStroke).toBe('rgba(199, 211, 232, 0.03)');
    expect(light.scales.deepFieldStroke).toBe('rgba(255, 92, 69, 0.06)');
    expect(light.scales.deepFieldScale).toBe(dark.scales.deepFieldScale);
    expect(light.scales.deepFieldFloor).toBe(dark.scales.deepFieldFloor);
  });

  it('keeps the rest of the underwater material untouched until its own pass', () => {
    expect(light.scales.refractionSweep).toEqual(dark.scales.refractionSweep);
    expect(light.flesh).toEqual(dark.flesh);
    // The ramp, the fades derived from it (spec 022) and the crest's flank
    // (calibrated per ground, 2026-09-02) are the light pass; everything
    // else about the water is untouched.
    const {
      gradient: _lr,
      fadeTop: _lt,
      fadeBottom: _lb,
      crestShadow: _lc,
      ...lightWater
    } = light.water;
    const {
      gradient: _dr,
      fadeTop: _dt,
      fadeBottom: _db,
      crestShadow: _dc,
      ...darkWater
    } = dark.water;
    expect(lightWater).toEqual(darkWater);
  });

  it('inverts the membrane ink rather than leaving the card dark on a light ground', () => {
    // The first light screenshot showed every card as a grey slab: a
    // deep-neutral alpha over `neutral-25` (owner, 2026-09-01). A card on a
    // pale ground is white at high alpha — the ground still shows through.
    expect(light.surface.membraneThin).toBe('rgba(255, 255, 255, 0.85)');
    expect(light.surface.membraneThick).toBe('rgba(255, 255, 255, 0.95)');
  });
});
