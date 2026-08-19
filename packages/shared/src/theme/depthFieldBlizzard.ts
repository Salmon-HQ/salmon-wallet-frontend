/**
 * Marine snow, "blizzard" variant — the same field with a foreground.
 *
 * Diagnosis this variant answers (against photographs of real marine snow):
 * the shipped field reads as "dirty screen" — every particle a hard,
 * similar-sized dot, uniformly sprinkled, with nothing in the near field.
 * The one-distance law of `depthField.ts` (size projective, opacity
 * Beer–Lambert, both from a single `z`) is correct and is **kept**; what was
 * wrong is the *range* — the whole distribution is compressed into the far
 * field. Three additions fix that, each behind a documented constant:
 *
 *  1. **Heroes.** A handful of near flocs per tile (≈ one screen), an order
 *     nearer than the old near plane. They are soft — a radial opacity
 *     gradient, not a hard disc — and slightly irregular (per-hero squash and
 *     rotation), because a 8dp hard circle reads as a defect, not a particle.
 *  2. **A mid-field lift.** Extra flocs between the heroes and the old field,
 *     still on the exact one-distance law.
 *  3. **Clustering.** The added flocs pool into patches instead of being
 *     uniformly sprinkled. Real snow arrives in patches; uniform is what the
 *     eye reads as noise. The baked base field is left untouched (its tests
 *     pin it), so the patchiness comes from where the *new* density lands.
 *
 * Elongation (a subtle fall-streak on the heroes only) exists as a constant
 * and ships at 0: on some panels a stretched blob reads as a scratch. Raise
 * `heroElongation` to try it; delete nothing.
 *
 * Everything here is generated **once, at module scope, from a fixed seed** —
 * the same "the drawing is a constant" contract the baked field honours: no
 * render-time randomness, so the DOM can still serialise it to a data URI and
 * both platforms draw identical fields. It is generated rather than baked
 * because every knob above is meant to be turned; literals would freeze them.
 *
 * The brightness cap holds: every opacity is a multiplier ≤ 1 on
 * `water.snow`, heroes included — a hero's *peak* is the token, and its
 * radial fade only ever goes below it.
 */
import {
  depthFieldTile,
  depthRamp,
  depthRampOpacity,
  marineSnow,
  marineSnowTiled,
  type SnowFloc,
} from './depthField';

/** Which snow field a renderer draws. Debug switches pick one. */
export type SnowVariant = 'current' | 'blizzard';

/**
 * The blizzard's tuneable constants. All distances are optical (`z`, where
 * size is `depthRamp.rxNear / z` — smaller `z` is nearer); all lengths are
 * tile units (≈ dp × 440/columnWidth; ≈ 1.13 × dp on a 390dp phone).
 */
export const blizzard = {
  /**
   * Optical distance range of the heroes — `z < 1` is nearer than the old
   * near plane. 0.35–0.6 projects to rx ≈ 4.3–7.3 tile units: a soft blob
   * whose readable core is roughly 6–10dp across on a phone column.
   */
  heroZNear: 0.35,
  heroZFar: 0.6,
  /** Heroes per tile. One tile ≈ one screen, so this is the per-screen quota. */
  heroCount: 3,
  /**
   * Radial softness: the fraction of a hero's radius that stays at peak
   * opacity before the fade to transparent begins. Smaller = softer.
   */
  heroCoreStop: 0.25,
  /**
   * Vertical fall-streak on the heroes only, as a fraction added to `ry`.
   * Ships at 0 — on-device a stretched blob can read as a scratch. Try 0.4
   * for a visible streak.
   */
  heroElongation: 0,
  /** Extra mid-field flocs added over the 218-floc base (moderate: ~1.3× total). */
  midCount: 70,
  /** Optical distance range of the added mid flocs — the gap the old field left. */
  midZNear: 1.05,
  midZFar: 2.2,
  /** How many patches the added flocs pool into. */
  clusterCount: 6,
  /** Patch radius (Gaussian σ), tile units. */
  clusterRadius: 70,
  /** Share of added flocs assigned to a patch; the rest stay uniform. */
  clusterIntensity: 0.8,
} as const;

/** Deterministic PRNG — fixed seed, so the field is a constant. */
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const round2 = (v: number): number => Math.round(v * 100) / 100;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * The one-distance law, read back from a rounded radius: the opacity this
 * floc's own size implies. Clamped at 1 for `z < 1` — nearer than the old
 * near plane can only saturate the token, never exceed it.
 */
const lawOpacity = (rx: number): number =>
  round2(Math.min(1, depthRampOpacity(depthRamp.rxNear / rx)));

/** One hero: a floc plus its rotation (degrees, about its own centre). */
export type HeroFloc = readonly [
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  opacity: number,
  rotation: number,
];

const { width: W, height: H } = depthFieldTile;
const rand = mulberry32(0x5a1704);

/** The patches the clustered flocs pool around. Exported so tests can see them. */
export const blizzardClusterCenters: ReadonlyArray<readonly [number, number]> = Array.from(
  { length: blizzard.clusterCount },
  () => [round2(20 + rand() * (W - 40)), round2(rand() * H)] as const
);

/** Box–Muller, one gaussian sample. */
const gaussian = (): number => {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const makeMidFlocs = (): SnowFloc[] =>
  Array.from({ length: blizzard.midCount }, () => {
    const z = blizzard.midZNear + rand() * (blizzard.midZFar - blizzard.midZNear);
    const rx = round2(depthRamp.rxNear / z);
    const ry = round2(rx * (0.6 + rand() * 0.35));
    let cx: number;
    let cy: number;
    if (rand() < blizzard.clusterIntensity) {
      const [px, py] = blizzardClusterCenters[Math.floor(rand() * blizzardClusterCenters.length)];
      cx = px + gaussian() * blizzard.clusterRadius;
      cy = py + gaussian() * blizzard.clusterRadius;
    } else {
      cx = rand() * W;
      cy = rand() * H;
    }
    // Kept clear of every tile edge, so no new floc needs a wrapped twin and
    // none is ever bisected by the tile clip.
    cx = round2(clamp(cx, rx + 0.5, W - rx - 0.5));
    cy = round2(clamp(cy, ry + 0.5, H - ry - 0.5));
    return [cx, cy, rx, ry, lawOpacity(rx)] as const;
  });

const makeHeroes = (): HeroFloc[] =>
  Array.from({ length: blizzard.heroCount }, (_, i) => {
    const z = blizzard.heroZNear + rand() * (blizzard.heroZFar - blizzard.heroZNear);
    const rx = round2(depthRamp.rxNear / z);
    const ry = round2(rx * (0.72 + rand() * 0.2) * (1 + blizzard.heroElongation));
    // Stratified down the tile: one hero per band, so a screen always shows
    // the quota instead of all three clumping into one corner.
    const band = H / blizzard.heroCount;
    const cy = round2(clamp(band * i + ry + rand() * (band - 2 * ry), ry + 0.5, H - ry - 0.5));
    const cx = round2(rx + 0.5 + rand() * (W - 2 * rx - 1));
    const rotation = round2((rand() * 2 - 1) * 18);
    return [cx, cy, rx, ry, lawOpacity(rx), rotation] as const;
  });

/**
 * The added mid-field flocs, alone — the base field plus these is the
 * blizzard's regular (hard-edged) population.
 */
export const blizzardMidFlocs: ReadonlyArray<SnowFloc> = makeMidFlocs();

/** The heroes — drawn with a radial-gradient fill, never as hard discs. */
export const blizzardHeroes: ReadonlyArray<HeroFloc> = makeHeroes();

/**
 * What a renderer draws for the blizzard's regular flocs: the tiled base
 * field plus the mid additions (which never cross an edge, so they need no
 * twins). Heroes are separate — they take a different fill.
 */
export const blizzardSnowTiled: ReadonlyArray<SnowFloc> = [...marineSnowTiled, ...blizzardMidFlocs];

/** The full authored blizzard population, for tests. */
export const blizzardSnow: ReadonlyArray<SnowFloc> = [...marineSnow, ...blizzardMidFlocs];

/** The gradient id the serialised heroes reference. */
const HERO_GRADIENT_ID = 'salmon-hero-floc';

/**
 * The blizzard as a standalone SVG document — the DOM's `background-image`,
 * exactly as `marineSnowSvg` is for the current field. One document: the
 * heroes ride the same tile, so they drift and repeat with the field and the
 * WAAPI loop needs no second layer.
 */
export const blizzardSnowSvg = (color: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
  `<defs><radialGradient id="${HERO_GRADIENT_ID}">` +
  `<stop offset="0" stop-color="${color}" stop-opacity="1"/>` +
  `<stop offset="${blizzard.heroCoreStop}" stop-color="${color}" stop-opacity="1"/>` +
  `<stop offset="1" stop-color="${color}" stop-opacity="0"/>` +
  `</radialGradient></defs>` +
  blizzardSnowTiled
    .map(
      ([cx, cy, rx, ry, opacity]) =>
        `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" fill-opacity="${opacity}"/>`
    )
    .join('') +
  blizzardHeroes
    .map(
      ([cx, cy, rx, ry, opacity, rotation]) =>
        `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${HERO_GRADIENT_ID})" fill-opacity="${opacity}" transform="rotate(${rotation} ${cx} ${cy})"/>`
    )
    .join('') +
  `</svg>`;
