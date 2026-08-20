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
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Ellipse, RadialGradient, Use } from 'react-native-svg';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
} from 'react-native-reanimated';
import {
  depthFieldTileHeight,
  marineSnowTiled,
  wrapDepthOffset,
} from '../../../../packages/shared/src/theme/depthField';
import {
  blizzardHeroes,
  blizzardSnowTiled,
} from '../../../../packages/shared/src/theme/depthFieldBlizzard';

// The root `@salmon/shared` barrel drags the Solana stack through Jest for a
// background that only reads theme tokens, so it is replaced by the real
// theme modules the component actually imports.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../../packages/shared/src/theme/depthField'),
  ...jest.requireActual('../../../../packages/shared/src/theme/depthFieldBlizzard'),
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
    useSharedValue: jest.fn(mutable),
    useAnimatedStyle: jest.fn((fn: () => unknown) => fn()),
    useAnimatedScrollHandler: (fn: unknown) => fn,
    useReducedMotion: jest.fn(() => false),
    withTiming: (to: number) => to,
    withRepeat: jest.fn((animation: number) => animation),
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

const mockedWithRepeat = withRepeat as unknown as jest.Mock;
const mockedUseSharedValue = useSharedValue as unknown as jest.Mock;
const mockedUseAnimatedStyle = useAnimatedStyle as unknown as jest.Mock;

describe('DepthBackground', () => {
  beforeEach(() => {
    mockedWithRepeat.mockClear();
    mockedUseSharedValue.mockClear();
    mockedUseAnimatedStyle.mockClear();
  });

  afterEach(() => {
    mockedUseReducedMotion.mockReturnValue(false);
  });

  it('runs one clock for every field on screen', () => {
    // The wait paints its own ground over the one already behind it. With a
    // per-instance clock the second field started at phase 0 while the first
    // kept drifting, so the wait's exit swapped one phase for another and the
    // snow jumped — up to a whole tile, in one frame. The second field has to
    // inherit the drift in flight instead: no local shared value, and no
    // second loop started.
    render(
      <>
        <DepthBackground />
        <DepthBackground />
      </>
    );

    expect(mockedUseSharedValue).not.toHaveBeenCalled();
    expect(mockedWithRepeat).toHaveBeenCalledTimes(1);
  });

  it('starts the clock again once the last field has gone and a new one arrives', () => {
    // Shared state must not become a one-shot: with no field mounted there is
    // nothing to keep in phase, and the next one has to start the drift.
    const first = render(<DepthBackground />);
    expect(mockedWithRepeat).toHaveBeenCalledTimes(1);
    first.unmount();

    render(<DepthBackground />);
    expect(mockedWithRepeat).toHaveBeenCalledTimes(2);
  });

  it('draws the same phase in both fields, whatever the wait does between them', () => {
    // The wait paints its own water column over the ground already behind it
    // (DESIGN.md §The wait), so during a wait there are two fields on screen
    // and they have to be the same pixels. The clock is shared, which is what
    // keeps their *phase* the same — but the wait is also the only thing in
    // the app that re-renders a field: it measures its frame on mount and it
    // cycles a tip every few seconds for as long as it stands, and a wait now
    // stands for the whole floor. A re-render re-commits the animated view
    // with the style React knows about, which is the phase captured at mount,
    // not the phase the UI thread has since driven it to — so the field the
    // user is actually looking at snapped back while the ground behind it did
    // not. That is the jump, and it is why it read as coupled to the wait.
    //
    // The field must therefore be unreachable from its parent's renders: the
    // wait may re-render as often as it likes and the water may not notice.
    // The wait, standing over the ground, showing whichever tip is current.
    const Wait = ({ tip }: { tip: number }) => (
      <>
        <Text>{tip}</Text>
        <DepthBackground />
      </>
    );

    // Mount order is the app's: the ground first, the wait over it.
    const ground = (
      <>
        <DepthBackground />
        <Wait tip={0} />
      </>
    );
    const { rerender } = render(ground);

    const phaseOf = (call: number) =>
      (mockedUseAnimatedStyle.mock.results[call].value as { transform: [{ translateY: number }] })
        .transform[0].translateY;

    expect(mockedUseAnimatedStyle).toHaveBeenCalledTimes(2);
    expect(phaseOf(1)).toBe(phaseOf(0));
    // One clock, so one loop, however many fields are on screen.
    expect(mockedWithRepeat).toHaveBeenCalledTimes(1);

    // The wait does what a wait does — a tip lands, twice — and the water is
    // not repainted for it.
    rerender(
      <>
        <DepthBackground />
        <Wait tip={1} />
      </>
    );
    rerender(
      <>
        <DepthBackground />
        <Wait tip={2} />
      </>
    );

    expect(mockedUseAnimatedStyle).toHaveBeenCalledTimes(2);
    expect(mockedWithRepeat).toHaveBeenCalledTimes(1);
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

  it('draws the blizzard field, floc for floc', () => {
    const { UNSAFE_queryAllByType } = render(<DepthBackground />);
    // Every regular floc plus every hero, once each in the shared tile —
    // and the blizzard is a lift over the current field, not a replacement.
    expect(UNSAFE_queryAllByType(Ellipse).length).toBe(
      blizzardSnowTiled.length + blizzardHeroes.length
    );
    expect(blizzardSnowTiled.length).toBeGreaterThan(marineSnowTiled.length);
    // The heroes are soft: their fill is the radial gradient, never a disc.
    expect(UNSAFE_queryAllByType(RadialGradient).length).toBe(1);
  });

  it('still draws the field when motion is reduced — still water, not a gap', () => {
    mockedUseReducedMotion.mockReturnValue(true);
    const { UNSAFE_queryAllByType } = render(<DepthBackground />);
    expect(UNSAFE_queryAllByType(Use).length).toBeGreaterThan(0);
  });
});
