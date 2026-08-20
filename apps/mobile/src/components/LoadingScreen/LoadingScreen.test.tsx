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
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

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
  fontFamilyNative: { regular: 'DMSansRegular', semiBold: 'DMSansSemiBold', bold: 'DMSansBold' },
  fontSize: { sm: 12, base: 14, bodyLg: 16, headline: 24 },
  letterSpacing: { widest: 1 },
  motionMs: {
    flick: 90,
    swell: 180,
    ebb: 180,
    drift: 280,
    rise: 420,
    tide: 720,
    stagger: 24,
    shimmerCycle: 1400,
    pulseCycle: 1200,
    waitFloor: 5000,
  },
  markPaths: ['M0 0h1v1H0z'],
  markViewBoxAttr: '0 0 253 236',
  WAVEFRONT_CROSS_MS: 1400,
  WAVEFRONT_EBB_MS: 360,
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
// Rendered rather than nulled: one of the cases below is about *where* the
// water column sits in the tree, and a null cannot be located.
jest.mock('../DepthBackground', () => {
  const { View } = jest.requireActual('react-native');
  return { DepthBackground: () => <View testID="depth-background" /> };
});
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

  it('shows the tips on every wait, and lets one surface suppress them', () => {
    // Reversal (owner): the default was off, so only unlock and recovery had
    // anything to read while they waited. Every wait shows them now; the prop
    // survives as the exception rather than the rule.
    render(<LoadingScreen visible title="Processing swap" />);
    expect(screen.getByText('general.tips.1')).toBeTruthy();

    screen.unmount();
    render(<LoadingScreen visible title="Processing swap" showTips={false} />);
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

  describe('the cluster', () => {
    it('centres mark and words as one column, however many lines the caller passes', () => {
      // The mark used to be pinned to `top: 50%` with the words hanging below
      // it, which centred the *emitter* and left the thing the eye reads
      // sitting under the middle of the phone — worst on the swap wait, which
      // passes both a title and a subtitle.
      render(<LoadingScreen visible title="Processing swap" subtitle="1.1 USDC → 0.0132 SOL" />);

      const cluster = StyleSheet.flatten(
        screen.getByTestId('loading-cluster', { includeHiddenElements: true }).props.style
      );
      expect(cluster.justifyContent).toBe('center');
      expect(cluster.alignItems).toBe('center');

      // Nothing inside the cluster may position itself against the frame:
      // one absolute child and the column stops describing where anything is.
      const emitter = StyleSheet.flatten(
        screen.getByTestId('loading-emitter', { includeHiddenElements: true }).props.style
      );
      expect(emitter.position).toBeUndefined();
      expect(emitter.top).toBeUndefined();
      expect(emitter.left).toBeUndefined();
    });

    it('keeps the water out of the cluster, so the snow never travels with it', () => {
      // The ground is the ground: the departing transform lives on the
      // cluster, and anything under it would sink with the words on exit.
      render(<LoadingScreen visible title="Processing swap" />);

      const cluster = screen.getByTestId('loading-cluster', { includeHiddenElements: true });
      expect(screen.getByTestId('depth-background')).toBeTruthy();
      expect(within(cluster).queryByTestId('depth-background')).toBeNull();
    });
  });

  describe('the report that the wait is running', () => {
    // The front is the one part of this screen that cannot draw until a
    // measurement lands, and `onLayout` is a JS-thread event. A caller about to
    // take that thread (key derivation on unlock) waits for this report, so the
    // water is already running when the crypto stops it — DESIGN.md §The wait.
    it('waits for the emitter to be measured before reporting', () => {
      const onReady = jest.fn();
      render(<LoadingScreen visible title="Unlocking Wallet" waves onReady={onReady} />);

      // Committed, but the front has no origin yet: nothing is crossing.
      expect(onReady).not.toHaveBeenCalled();

      act(() => {
        fireEvent(
          screen.getByTestId('loading-emitter', { includeHiddenElements: true }),
          'layout',
          { nativeEvent: { layout: { x: 100, y: 200, width: 48, height: 48 } } }
        );
      });

      expect(onReady).toHaveBeenCalledTimes(1);
    });

    it('reports at once for a wait with no front to measure', () => {
      const onReady = jest.fn();
      render(<LoadingScreen visible title="Unlocking Wallet" waves={false} onReady={onReady} />);

      expect(onReady).toHaveBeenCalledTimes(1);
    });
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

      // The owner's floor is spent first and nothing is planned inside it: the
      // wave is still looping and the exit has not been decided yet.
      act(() => {
        jest.advanceTimersByTime(4999);
      });
      expect(onExited).not.toHaveBeenCalled();

      // Then one whole crossing plus an ebb — the worst case, and the value the
      // hard timer is armed at so a dropped animation callback cannot strand a
      // caller on the wait screen. The two are sequential, never overlapped.
      act(() => {
        jest.advanceTimersByTime(1 + 1579);
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

      // The floor is a *hold*, not a transition: reduced motion does not
      // shorten it, exactly as the copy-feedback hold is not shortened. What
      // reduced motion still buys is the wave it does not have to wait out.
      act(() => {
        jest.advanceTimersByTime(4999);
      });
      expect(onExited).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1 + 180);
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
        jest.advanceTimersByTime(5000 + 5000);
      });
      expect(onExited).toHaveBeenCalledTimes(1);
    });
  });
});
