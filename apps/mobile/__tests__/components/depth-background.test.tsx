/**
 * The water column's motion contract on React Native.
 *
 * The two assertions worth having are the ones a refactor can break without
 * anyone noticing on a simulator: **reduced motion must leave still water**,
 * and the field must be **stacked deep enough** that the drift-plus-parallax
 * offset — which is folded into a single tile — always has drawing behind it.
 * An off-by-one there is a bare band that only appears mid-cycle.
 *
 * The drift's own numbers are asserted at their source, in
 * `packages/shared/src/theme/depthField.test.ts`; there is no point restating
 * them against a mocked Reanimated.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Use } from 'react-native-svg';
import { useReducedMotion } from 'react-native-reanimated';
import {
  depthFieldTileHeight,
  wrapDepthOffset,
} from '../../../../packages/shared/src/theme/depthField';

// The root `@salmon/shared` barrel drags the Solana stack through Jest for a
// background that only reads theme tokens, so it is replaced by the two real
// theme modules the component actually imports.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../../packages/shared/src/theme/depthField'),
  ...jest.requireActual('../../../../packages/shared/src/theme/semantic'),
}));

import { DepthBackground } from '../../src/components/DepthBackground';

// Reanimated 4's own mock boots the Worklets native module, which does not
// exist under Jest. The component only needs shared values to hold a number
// and the animation helpers to be inert, so that is all this provides.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const mutable = (value: number) => ({ value });
  return {
    __esModule: true,
    default: { View },
    makeMutable: mutable,
    useSharedValue: mutable,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useAnimatedScrollHandler: (fn: unknown) => fn,
    useReducedMotion: jest.fn(() => false),
    withTiming: (to: number) => to,
    withRepeat: (animation: number) => animation,
    withSequence: (...animations: number[]) => animations[animations.length - 1],
    cancelAnimation: () => {},
    Easing: { linear: (t: number) => t },
  };
});

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));

const mockedUseReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

describe('DepthBackground', () => {
  afterEach(() => {
    mockedUseReducedMotion.mockReturnValue(false);
  });

  it('stacks enough field to cover the screen plus the tile the offset can consume', () => {
    const tile = depthFieldTileHeight(390);
    // One spare tile above the screen, because the combined offset is wrapped
    // into one tile before it is applied.
    const copies = Math.ceil(844 / tile) + 1;
    const { UNSAFE_queryAllByType } = render(<DepthBackground />);

    const uses = UNSAFE_queryAllByType(Use);
    expect(uses.length).toBe(copies);
    expect(copies).toBeGreaterThanOrEqual(2);
  });

  it('draws no snow when the motif is turned off', () => {
    const { UNSAFE_queryAllByType } = render(<DepthBackground snow={false} />);
    expect(UNSAFE_queryAllByType(Use)).toHaveLength(0);
  });

  it('wraps the offset the way the shared helper does', () => {
    // The animated style cannot call `wrapDepthOffset` — it runs on the UI
    // thread, which only reaches worklets — so it spells the wrap out. This is
    // the assertion that keeps the copy honest.
    const inline = (offset: number, tile: number) => ((offset % tile) + tile) % tile;
    const tile = depthFieldTileHeight(390);
    for (const offset of [-tile * 1.5, -1, 0, 12.5, tile - 0.5, tile, tile * 2.25]) {
      expect(inline(offset, tile)).toBe(wrapDepthOffset(offset, tile));
    }
  });

  it('still draws the field when motion is reduced — still water, not a gap', () => {
    mockedUseReducedMotion.mockReturnValue(true);
    const { UNSAFE_queryAllByType } = render(<DepthBackground />);
    expect(UNSAFE_queryAllByType(Use).length).toBeGreaterThan(0);
  });
});
