// The shared barrel reaches the Solana ESM packages, which this Jest config
// does not transform. Only the tokens ScalesBackground touches matter here.
jest.mock('@salmon/shared', () => ({
  seigaihaTile: { width: 40, height: 20 },
  seigaihaTiledPaths: ['M0 0 L40 0', 'M0 10 L40 10'],
  semantic: {
    scales: {
      deepFieldStroke: 'rgba(255,255,255,0.06)',
      deepFieldScale: 1,
      deepFieldFloor: 0.3,
      fishStroke: 'rgba(0,0,0,0.2)',
      fishScale: 0.75,
      refractionScale: 0.5,
      refractionSweep: ['#ff0000', '#00ff00', '#0000ff'],
      refractionOpacity: 0.08,
      membraneFieldStroke: 'rgba(7, 9, 17, 0.45)',
    },
  },
}));

import { render } from '@testing-library/react-native';
import React from 'react';
import { Defs, Mask, Pattern, Rect } from 'react-native-svg';

import { ScalesBackground } from './ScalesBackground';

// `@types/react-test-renderer` is not installed in this workspace, so the
// instances RNTL's UNSAFE_* queries return are typed structurally here —
// only the members these guards touch.
interface TestInstance {
  type: unknown;
  props: Record<string, unknown>;
  findByType: (type: unknown) => TestInstance;
  findAll: (predicate: (node: TestInstance) => boolean) => TestInstance[];
}

/**
 * Structure guards for the refraction variant. Jest cannot paint — the bug
 * these pin down (react-native-svg registering a mask's painter before the
 * pattern it fills with exists, plus iOS Fabric deriving maskContentUnits
 * from maskUnits) only shows on device. What CAN regress silently is the
 * structure that avoids it: Pattern declared before the Mask that consumes
 * it, and an explicit userSpaceOnUse on that Mask. On-device verification
 * happens separately.
 */
describe('ScalesBackground refraction variant', () => {
  const urlRef = (value: unknown): string => {
    const match = /^url\(#(.+)\)$/.exec(String(value));
    if (!match) throw new Error(`expected url(#...) reference, got: ${String(value)}`);
    return match[1];
  };

  const renderRefraction = () => {
    const api = render(<ScalesBackground variant="refraction" />);
    const defs = api.UNSAFE_getByType(Defs) as unknown as TestInstance;
    const getAllByType = (type: unknown) =>
      api.UNSAFE_getAllByType(type as React.ComponentType) as unknown as TestInstance[];
    return { defs, getAllByType };
  };

  it('declares the Pattern before the Mask that references it', () => {
    const { defs } = renderRefraction();

    // findAll traverses in document order, so the combined list preserves
    // declaration order between the two types.
    const ordered = defs.findAll((node) => node.type === Pattern || node.type === Mask);
    const patternIndex = ordered.findIndex((node) => node.type === Pattern);
    const maskIndex = ordered.findIndex((node) => node.type === Mask);

    expect(patternIndex).toBeGreaterThanOrEqual(0);
    expect(maskIndex).toBeGreaterThanOrEqual(0);
    expect(patternIndex).toBeLessThan(maskIndex);
  });

  it('paints a rect whose mask resolves to a defined mask filled by the defined pattern', () => {
    const { getAllByType } = renderRefraction();

    const paintedRect = getAllByType(Rect).find((rect) => rect.props.mask !== undefined);
    expect(paintedRect).toBeDefined();

    const maskId = urlRef(paintedRect!.props.mask);
    const mask = getAllByType(Mask).find((node) => node.props.id === maskId);
    expect(mask).toBeDefined();

    const maskRect = mask!.findByType(Rect);
    const patternId = urlRef(maskRect.props.fill);
    const pattern = getAllByType(Pattern).find((node) => node.props.id === patternId);
    expect(pattern).toBeDefined();
  });

  it('sets explicit maskUnits="userSpaceOnUse" on the Mask', () => {
    const { getAllByType } = renderRefraction();
    const [mask] = getAllByType(Mask);
    expect(mask.props.maskUnits).toBe('userSpaceOnUse');
  });
});

describe('ScalesBackground membrane variant', () => {
  it('is a flat dark ink — pattern fill, no sweep, no mask, no fade', () => {
    const api = render(<ScalesBackground variant="membrane" />);

    // One dark ink through the tile, no mask indirection at all: any second
    // layer or gradient here is what read as a band in the membrane.
    expect(api.UNSAFE_queryAllByType(Mask)).toHaveLength(0);

    const rects = api.UNSAFE_getAllByType(Rect) as unknown as TestInstance[];
    const painted = rects.find((rect) => /^url\(#/.test(String(rect.props.fill)));
    expect(painted).toBeDefined();
    expect(painted!.props.mask).toBeUndefined();

    const paths = api.UNSAFE_getAllByType(
      jest.requireActual('react-native-svg').Path
    ) as unknown as TestInstance[];
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path.props.stroke).toBe('rgba(7, 9, 17, 0.45)');
    }
  });
});
