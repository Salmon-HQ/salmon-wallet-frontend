/**
 * The wait, after the choreography: no spinning ring, no tips, and a descent
 * that exists under reduced motion too — a parallel mapping, not a hole.
 *
 * The mark is back (product decision, 2026-08) as the wave's emitter, and it is
 * opt-in with the wave: a wait with nothing in the air does not get one. It
 * *sinks* rather than pulses, and the front is thrown at the bottom of the
 * sink — and that arithmetic is tested in `@salmon/shared`.
 *
 * What is asserted here is the contract, not the pixels: that the emitter
 * appears only where it was asked for, and that the exit hands off at a fixed
 * time.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

let mockReduceMotion = false;

// The shared barrel reaches the Solana ESM packages, which this Jest config
// does not transform. Only the tokens this screen reads matter here.
jest.mock('@salmon/shared', () => ({
  DEFAULT_WALLET_TIP_KEYS: ['general.tips.1'],
  colors: {
    background: { primary: '#10131C', secondary: '#070911' },
    text: { primary: '#EDF1F7', secondary: '#A7B1C4' },
    accent: { primary: '#FF5C45' },
  },
  semantic: {
    text: { accent: '#FF5C45', primary: '#EDF1F7' },
    border: { hairline: 'rgba(199,211,232,0.10)' },
    accent: { ink: '#FF5C45', tint: 'rgba(255, 92, 69, 0.10)' },
  },
  componentSizes: {
    descentTrackWidth: 2,
    descentTrackHeight: 120,
    descentSegmentHeight: 44,
    waveAmplitude: 3,
  },
  fontFamilyNative: { regular: 'DMSansRegular', bold: 'DMSansBold' },
  fontSize: { sm: 12, base: 14, md: 16, '2xl': 24 },
  letterSpacing: { widest: 1 },
  motionMs: {
    flick: 90,
    swell: 180,
    ebb: 180,
    drift: 280,
    rise: 420,
    stagger: 24,
    shimmerCycle: 1400,
    pulseCycle: 1200,
  },
  markPaths: ['M0 0h1v1H0z'],
  markViewBoxAttr: '0 0 253 236',
  WAVEFRONT_CROSS_MS: 1400,
  WAVEFRONT_PERIOD_MS: 2000,
  WAVEFRONT_SINK_MS: 90,
  WAVEFRONT_RECOVER_MS: 720,
  wavefrontRadius: () => 500,
  wavefrontExitMs: (isReduceMotionEnabled: boolean) => (isReduceMotionEnabled ? 180 : 1580),
  planWavefrontExit: (_elapsedMs: number, isReduceMotionEnabled: boolean) =>
    isReduceMotionEnabled ? { holdMs: 0, exitMs: 180 } : { holdMs: 1400, exitMs: 1580 },
  motionEasing: {
    current: { native: [0.32, 0.72, 0, 1] },
    settle: { native: [0.22, 1, 0.36, 1] },
    sink: { native: [0.4, 0, 1, 1] },
    swellIn: { native: [0.34, 1.14, 0.64, 1] },
  },
  resolveMotionMs: (ms: number, reduced: boolean) => (reduced ? 0 : ms),
  spacing: { sm: 8, lg: 16, '2xl': 24, '3xl': 32, '5xl': 48 },
  // The crest's shape is real, not stubbed: it is pure arithmetic over theme
  // tokens with nothing under it to transform, and a fake here would let the
  // two platforms draw two different waves without a test noticing.
  ...jest.requireActual('@salmon/shared/src/motion/crest'),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return { LinearGradient: View };
});
jest.mock('../DepthBackground', () => ({ DepthBackground: () => null }));
jest.mock('../ScalesBackground', () => ({ ScalesBackground: () => null }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

jest.mock('react-native-reanimated', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View, Text },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => mockReduceMotion,
    cancelAnimation: () => {},
    interpolate: (value: number) => value,
    withRepeat: (animation: unknown) => animation,
    withSequence: (animation: unknown) => animation,
    withDelay: (_delay: number, animation: unknown) => animation,
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => () => 0, linear: () => 0, inOut: () => () => 0, ease: 0 },
    runOnJS: (fn: unknown) => fn,
  };
});

import { LoadingScreen } from './LoadingScreen';

describe('LoadingScreen', () => {
  afterEach(() => {
    mockReduceMotion = false;
  });

  it('treats every wait as water, not just the one that opted in', () => {
    // `waves` used to default to false, so the account-recovery wait showed a
    // bare title over an empty screen. The treatment is the wait now.
    render(<LoadingScreen visible title="Recovering Account" />);

    expect(screen.getByTestId('loading-emitter', { includeHiddenElements: true })).toBeTruthy();
  });

  it('shows no progress track — this screen has never known a percentage', () => {
    // The descent read as a progress bar and there has never been a `progress`
    // prop to fill it. A bar that cannot be right must not be drawn.
    render(<LoadingScreen visible title="Processing swap" />);

    expect(screen.queryByTestId('loading-descent')).toBeNull();
  });

  it('keeps its wait screens free of the tip carousel by default', () => {
    // "Always check the transaction details before signing", arriving after the
    // signature. The default is off; the screens where the advice still applies
    // to a decision the user can make opt in.
    render(<LoadingScreen visible title="Processing swap" />);

    expect(screen.queryByText('general.tips.1')).toBeNull();
  });

  it('leaves the words to carry the state under reduced motion', () => {
    // A parallel mapping, not a hole: nothing moves, and the title is what says
    // the wait is still going.
    mockReduceMotion = true;
    render(<LoadingScreen visible title="Processing swap" waves />);

    expect(screen.getByText('Processing swap')).toBeTruthy();
    expect(screen.queryByTestId('loading-descent')).toBeNull();
  });

  it('gives the wave a visible source — the mark that emits it', () => {
    render(<LoadingScreen visible title="Processing swap" waves />);

    // Hidden from assistive technology on purpose — the overlay already
    // announces the wait, and a second narrated thing is noise.
    expect(screen.getByTestId('loading-emitter', { includeHiddenElements: true })).toBeTruthy();
  });

  it('still lets a surface opt out of showing anything living through itself', () => {
    render(<LoadingScreen visible title="Unlocking" waves={false} />);

    expect(screen.queryByTestId('loading-emitter', { includeHiddenElements: true })).toBeNull();
  });

  describe('the handoff', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('holds until the front in flight has left the screen, then ebbs', () => {
      const onExited = jest.fn();
      const { rerender } = render(
        <LoadingScreen visible title="Processing swap" waves onExited={onExited} />
      );

      rerender(<LoadingScreen visible={false} title="Processing swap" waves onExited={onExited} />);

      // One whole crossing plus an ebb — the worst case, and the value the
      // hard timer is armed at so a dropped animation callback cannot strand a
      // caller on the wait screen.
      act(() => {
        jest.advanceTimersByTime(1579);
      });
      expect(onExited).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(onExited).toHaveBeenCalledTimes(1);
    });

    it('does not make a reduce-motion user wait out a wave they cannot see', () => {
      mockReduceMotion = true;
      const onExited = jest.fn();
      const { rerender } = render(
        <LoadingScreen visible title="Processing swap" waves onExited={onExited} />
      );

      rerender(<LoadingScreen visible={false} title="Processing swap" waves onExited={onExited} />);

      act(() => {
        jest.advanceTimersByTime(180);
      });
      expect(onExited).toHaveBeenCalledTimes(1);
    });

    it('hands off exactly once, however many clocks reach the end first', () => {
      const onExited = jest.fn();
      const { rerender } = render(
        <LoadingScreen visible title="Processing swap" waves onExited={onExited} />
      );

      rerender(<LoadingScreen visible={false} title="Processing swap" waves onExited={onExited} />);

      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(onExited).toHaveBeenCalledTimes(1);
    });
  });
});
