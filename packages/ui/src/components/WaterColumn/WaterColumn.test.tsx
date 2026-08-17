/**
 * @vitest-environment jsdom
 *
 * Two things are worth a test here, and neither is the drawing.
 *
 * 1. The ground stays a *ground*: behind the content, and never in the way of
 *    a press. A field that intercepts a tap on an approval button would be a
 *    fund-safety bug, not a cosmetic one.
 * 2. The three exceptions hold. They are security rules — the Bedrock Rule
 *    for seed and approval surfaces, and the no-field-behind-a-membrane rule —
 *    so they are asserted at the source rather than left to review. The motif
 *    now belongs to the app ground, which means the only thing keeping it off
 *    those screens is that nobody mounts it there; this fails if somebody does.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The real barrel pulls `react-native` into the resolver, which Vite cannot
// parse. Only the tokens the two layers read matter here; their values are
// pinned by `contrast.test.ts` and `depthField.test.ts` in @salmon/shared.
vi.mock('@salmon/shared', () => ({
  marineSnowSvg: () => '<svg xmlns="http://www.w3.org/2000/svg"/>',
  semantic: {
    water: { gradient: ['#10131C', '#070911'], snow: 'rgba(199, 211, 232, 0.12)' },
    scales: {
      deepFieldStroke: 'rgba(199, 211, 232, 0.06)',
      deepFieldScale: 3.2,
      deepFieldFloor: 0.35,
      fishStroke: 'rgba(7, 9, 17, 0.10)',
      fishScale: 1,
    },
  },
}));

import { WaterColumn, waterColumnHost } from './WaterColumn';

const HERE = dirname(fileURLToPath(import.meta.url));

const read = (relative: string): string => readFileSync(join(HERE, relative), 'utf8');

describe('WaterColumn', () => {
  afterEach(cleanup);

  it('paints two layers behind the content and swallows no pointer events', () => {
    const { container } = render(<WaterColumn />);
    const layers = Array.from(container.children) as HTMLElement[];

    expect(layers).toHaveLength(2);
    for (const layer of layers) {
      const style = getComputedStyle(layer);
      expect(style.position).toBe('absolute');
      expect(style.zIndex).toBe('-1');
      expect(style.pointerEvents).toBe('none');
    }
  });

  it('asks its host for a stacking context, so the negative layer cannot fall behind the ground', () => {
    expect(waterColumnHost.isolation).toBe('isolate');
    expect(waterColumnHost.position).toBe('relative');
  });
});

describe('the surfaces the water column must never reach', () => {
  it.each([
    ['CreateWalletPage', '../AuthFlow/CreateWalletPage.tsx'],
    ['RecoverWalletPage', '../AuthFlow/RecoverWalletPage.tsx'],
  ])('keeps the seed view %s on opaque bedrock', (_name, path) => {
    const source = read(path);
    expect(source).toContain('semantic.surface.bedrock');
    expect(source).not.toContain('WaterColumn');
  });

  it.each([
    ['the approval views', '../DAppApproval'],
    ['the sheet chrome', '../BaseSheetDialog'],
  ])('mounts no field on %s', (_name, dir) => {
    // A sheet is a membrane: a live backdrop shows through it, which is the
    // one place the motif is forbidden outright. Its sanctioned share is the
    // refraction strip on its own top edge, not the field behind it.
    const files = readdirSync(join(HERE, dir)).filter((name) => name.endsWith('.tsx'));

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(read(`${dir}/${file}`)).not.toContain('WaterColumn');
    }
  });
});
