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
import { afterEach, describe, expect, it } from 'vitest';

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
  it('keeps the seed EXHIBITION (CreateWalletPage) on opaque bedrock', () => {
    // The Bedrock Rule, narrowed (owner, 2026-08-18): bedrock covers the
    // views that SHOW a seed — create's warning, display and validation.
    const source = read('../AuthFlow/CreateWalletPage.tsx');
    expect(source).toContain('semantic.surface.bedrock');
    expect(source).not.toContain('WaterColumn');
  });

  it('lets seed ENTRY (RecoverWalletPage) stand in the water', () => {
    // Typing an existing phrase back in is not the ceremonial moment of its
    // birth: recover carries the same ground as the rest of the flow. The
    // capture protection is unchanged — only the ground moved.
    const source = read('../AuthFlow/RecoverWalletPage.tsx');
    expect(source).toContain('WaterColumn');
    expect(source).not.toContain('semantic.surface.bedrock');
  });

  it.each([
    ['a card in a grid', '../NftCard/NftCardSkeleton.tsx'],
    ['a row in a list', '../DerivedAccountCard/DerivedAccountCardSkeleton.tsx'],
  ])('leaves the skeleton of %s plain, because a skeleton is content', (_name, path) => {
    // The rule that decides this is not "does it spin" but "is it the ground".
    // A full-screen wait is a ground and takes the column; a skeleton stands
    // *on* the ground in the shape of the thing it is waiting for, and a
    // second field inside it would be the wallpaper use this direction
    // refuses — the same argument that took the field out of the balance card.
    expect(read(path)).not.toContain('WaterColumn');
  });

  it.each([
    ['the approval views', '../DAppApproval'],
    ['the sheet chrome', '../BaseSheetDialog'],
  ])('mounts no field on %s', (_name, dir) => {
    // A sheet is a membrane, and a membrane's texture belongs to the material
    // it is made of, not to the water. The thermocline mounts its own field —
    // one continuous layer of dark scales in the material's near-black ink —
    // so the light field of the column never goes behind a sheet, where it
    // would read as the water showing through the content.
    const files = readdirSync(join(HERE, dir)).filter((name) => name.endsWith('.tsx'));

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(read(`${dir}/${file}`)).not.toContain('WaterColumn');
    }
  });
});
