/**
 * The flattening contract: every leaf of the resolved set becomes exactly one
 * custom property, and the two modes disagree on precisely the tokens
 * `semantic.test.ts` says they disagree on — the CSS layer is a projection of
 * the tokens, so it must not add, drop, or collapse one.
 */
import { describe, expect, it, vi } from 'vitest';

// The `@salmon/shared` barrel pulls React Native in, which Vitest cannot
// parse; the token barrel is plain TypeScript, so the mock is the real tokens.
vi.mock('@salmon/shared', () => import('../../../shared/src/theme'));

const { createSemantic } = await import('../../../shared/src/theme');
const { semanticToCssVars } = await import('./cssVars');

const dark = createSemantic('dark');
const light = createSemantic('light');

/** Every leaf path of a token set, `group.token[.key|.index]`. */
const leafPaths = (value: unknown, path: string): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => leafPaths(entry, `${path}.${index}`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) => leafPaths(entry, `${path}.${key}`));
  }
  return [path];
};

describe('semanticToCssVars', () => {
  it('turns every leaf into exactly one variable', () => {
    const vars = semanticToCssVars(dark);
    const leaves = Object.entries(dark).flatMap(([group, entries]) => leafPaths(entries, group));

    expect(Object.keys(vars)).toHaveLength(leaves.length);
    for (const leaf of leaves) {
      expect(vars).toHaveProperty(`--sw-${leaf.replace(/\./g, '-')}`);
    }
  });

  it('names the paths the way the tokens are written', () => {
    const vars = semanticToCssVars(dark);

    expect(vars['--sw-text-primary']).toBe(dark.text.primary);
    // Tuples index by position…
    expect(vars['--sw-water-gradient-0']).toBe(dark.water.gradient[0]);
    expect(vars['--sw-water-gradient-1']).toBe(dark.water.gradient[1]);
    // …records take their key, whatever the nesting depth.
    expect(vars['--sw-water-crestShadow-color']).toBe(dark.water.crestShadow.color);
    expect(vars['--sw-water-crestShadow-alpha']).toBe(String(dark.water.crestShadow.alpha));
    expect(vars['--sw-chain-hintInk-bitcoin']).toBe(dark.chain.hintInk.bitcoin);
  });

  it('writes numeric tokens as strings a stylesheet can read', () => {
    expect(semanticToCssVars(dark)['--sw-state-focusRingWidth']).toBe(
      String(dark.state.focusRingWidth)
    );
  });

  it('differs between the modes on the token paths the resolver differs on', () => {
    const darkVars = semanticToCssVars(dark);
    const lightVars = semanticToCssVars(light);

    expect(Object.keys(lightVars)).toEqual(Object.keys(darkVars));

    // The groups the light spec remaps, as the resolver's own test lists them.
    for (const name of [
      '--sw-text-primary',
      '--sw-depth-column',
      '--sw-surface-shelf',
      '--sw-water-gradient-0',
      '--sw-water-crestShadow-alpha',
    ]) {
      expect(lightVars[name]).not.toBe(darkVars[name]);
    }

    // …and the invariants stay put in both.
    for (const name of ['--sw-accent-fill', '--sw-text-onAccent', '--sw-scanner-ground']) {
      expect(lightVars[name]).toBe(darkVars[name]);
    }
  });
});
