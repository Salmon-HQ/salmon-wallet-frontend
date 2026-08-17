/**
 * @vitest-environment jsdom
 *
 * A wait is a screen, so a wait stands in the water. This is the one screen
 * where the seam was visible without looking for it: the wait before a swap
 * settles is followed in the same second by the receipt, which has the ground,
 * and a flat wait next to a grounded receipt reads as two applications.
 *
 * The ground is asserted here rather than at each call site because every
 * full-screen wait in web and extension — boot, unlock, wallet creation,
 * add-account, and the pending state of swap, bridge and send — is this one
 * component. The exception is asserted with it: `bedrock` is the dApp approval
 * flow's opt-out, and it is a security rule rather than a preference.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

// The ground itself is drawn and tested in `WaterColumn.test.tsx`; what matters
// here is only whether this screen mounts it. Standing in for it also keeps
// this test off `DepthBackground`'s token surface.
vi.mock('../WaterColumn', () => ({
  WaterColumn: () => <div data-testid="water-column" />,
  waterColumnHost: { position: 'relative', isolation: 'isolate' },
}));

vi.mock('@salmon/shared', () => ({
  DEFAULT_WALLET_TIP_KEYS: ['tips.one'],
  colors: {
    background: { primary: '#10131C', secondary: '#070911' },
    text: { primary: '#EDF1F7', secondary: '#A7B1C4' },
    accent: { primary: '#FF5C45' },
  },
  fontFamily: { sans: 'sans-serif' },
  fontWeight: { regular: 400, bold: 700 },
  fontSize: { sm: 12, base: 14, md: 16, '2xl': 24 },
  lineHeight: { condensed: 1.2, normal: 1.5, tokenListItem: 1.4 },
  spacing: { sm: 8, lg: 16, '2xl': 24, '3xl': 32, '5xl': 48, '7xl': 72 },
  borderWidth: { heavy: 3 },
  duration: { slower: '0.4s' },
  durationMs: { slow: 300, slower: 400, spinSlow: 1200, pulse: 2000 },
  easing: { easeInOut: 'ease-in-out' },
  componentSizes: {
    descentTrackWidth: 2,
    descentTrackHeight: 120,
    descentSegmentHeight: 44,
    waveAmplitude: 3,
  },
  motionMs: {
    flick: 90,
    swell: 180,
    ebb: 180,
    rise: 420,
    stagger: 24,
    shimmerCycle: 1400,
    pulseCycle: 1200,
  },
  motionDuration: { tide: '720ms' },
  motionEasing: {
    current: { css: 'cubic-bezier(0.32, 0.72, 0, 1)' },
    sink: { css: 'cubic-bezier(0.4, 0, 1, 1)' },
  },
  reducedMotion: { query: '(prefers-reduced-motion: reduce)' },
  semantic: {
    text: { accent: '#FF5C45' },
    border: { hairline: 'rgba(199, 211, 232, 0.10)' },
    accent: { ink: '#FF5C45', tint: 'rgba(255, 92, 69, 0.10)' },
  },
  // The mark that emits the wave. One path is enough to assert it is drawn.
  markPaths: ['M0 0h1v1H0z'],
  markViewBoxAttr: '0 0 253 236',
  // The wave's arithmetic is `@salmon/shared`'s own and is tested there
  // (`src/motion/wavefront.test.ts`); this file only needs it to answer.
  WAVEFRONT_CROSS_MS: 420,
  wavefrontRadius: () => 500,
  planWavefront: (
    _rider: unknown,
    _origin: unknown,
    _bounds: unknown,
    isReduceMotionEnabled: boolean
  ) => (isReduceMotionEnabled ? null : { delayMs: 100, amplitude: 2, durationMs: 180 }),
  wavefrontExitMs: (isReduceMotionEnabled: boolean) => (isReduceMotionEnabled ? 180 : 600),
}));

import { LoadingScreen } from './LoadingScreen';

describe('the ground under a full-screen wait', () => {
  afterEach(cleanup);

  it('stands the wait in the same water as the screen that follows it', () => {
    render(<LoadingScreen visible title="Processing swap" />);

    expect(screen.getByTestId('water-column')).toBeTruthy();
  });

  it('keeps the wait inside the dApp approval flow on flat bedrock', () => {
    render(<LoadingScreen visible bedrock />);

    expect(screen.queryByTestId('water-column')).toBeNull();
  });

  it('mounts no ground when there is no wait to stand in it', () => {
    render(<LoadingScreen visible={false} />);

    expect(screen.queryByTestId('water-column')).toBeNull();
  });
});

/**
 * The wave. What is worth asserting here is not that pixels move — that is what
 * the eye is for — but the three things a caller depends on: the emitter exists
 * where the wave is opted into, the Bedrock Rule still wins over it, and the
 * exit hands off at a fixed time rather than whenever an animation happens to
 * finish. The arithmetic itself is tested in `@salmon/shared`.
 */
describe('the wave', () => {
  const setReducedMotion = (matches: boolean) => {
    window.matchMedia = ((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('gives the wave a visible source — the mark that emits it', () => {
    render(<LoadingScreen visible waves title="Processing swap" />);

    expect(screen.getByTestId('loading-emitter')).toBeTruthy();
  });

  it('leaves the wait unemitting when the wave was not asked for', () => {
    render(<LoadingScreen visible title="Loading wallet" />);

    expect(screen.queryByTestId('loading-emitter')).toBeNull();
  });

  it('keeps the pulsing mark out of the dApp approval flow — the Bedrock Rule wins', () => {
    render(<LoadingScreen visible waves bedrock title="Approving" />);

    expect(screen.queryByTestId('loading-emitter')).toBeNull();
  });

  it('hands off at a fixed 600ms, not whenever the pulse in flight happens to end', () => {
    const onExited = vi.fn();
    const { rerender } = render(
      <LoadingScreen visible waves title="Processing swap" onExited={onExited} />
    );

    rerender(<LoadingScreen visible={false} waves title="Processing swap" onExited={onExited} />);

    act(() => {
      vi.advanceTimersByTime(599);
    });
    expect(onExited).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onExited).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('loading-descent')).toBeNull();
  });

  it('does not make a reduce-motion user wait out a wave they cannot see', () => {
    setReducedMotion(true);
    const onExited = vi.fn();
    const { rerender } = render(
      <LoadingScreen visible waves title="Processing swap" onExited={onExited} />
    );

    rerender(<LoadingScreen visible={false} waves title="Processing swap" onExited={onExited} />);

    // The plain fade, not the wave-driven exit: the receipt arrives sooner.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('still draws the descent under reduced motion — a parallel, not a hole', () => {
    setReducedMotion(true);
    render(<LoadingScreen visible waves title="Processing swap" />);

    expect(screen.getByTestId('loading-descent')).toBeTruthy();
  });
});
