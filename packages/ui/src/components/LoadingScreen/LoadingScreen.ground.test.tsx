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
 * add-account, and the pending state of swap and send — is this one
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

vi.mock('@salmon/shared', async () => ({
  // The crest's shape is real, not stubbed: it is pure arithmetic over theme
  // tokens, and a fake here would let the two platforms draw two different
  // waves without a test noticing.
  ...(await vi.importActual<Record<string, unknown>>('@salmon/shared/src/motion/crest')),
  // The verb's own numbers, real for the same reason: the wait's passage — the
  // float in, the beat before the first press, the sink out — is spent from
  // this vocabulary, and a fake here would let it drift from the mobile twin.
  ...(await vi.importActual<Record<string, unknown>>('@salmon/shared/src/motion/sinkFloat')),
  DEFAULT_WALLET_TIP_KEYS: ['tips.one'],
  colors: {
    background: { primary: '#10131C', secondary: '#070911' },
    text: { primary: '#EDF1F7', secondary: '#A7B1C4' },
    accent: { primary: '#FF5C45' },
  },
  fontFamily: { sans: 'sans-serif' },
  fontWeight: { regular: 400, bold: 700 },
  fontSize: { sm: 12, base: 14, bodyLg: 16, '2xl': 24 },
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
    waitFloor: 5000,
  },
  motionDuration: { tide: '720ms' },
  motionEasing: {
    current: { css: 'cubic-bezier(0.32, 0.72, 0, 1)' },
    settle: { css: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    sink: { css: 'cubic-bezier(0.4, 0, 1, 1)' },
  },
  reducedMotion: { query: '(prefers-reduced-motion: reduce)' },
  semantic: {
    text: { accent: '#FF5C45', primary: '#EDF1F7' },
    border: { hairline: 'rgba(199, 211, 232, 0.10)' },
    accent: { ink: '#FF5C45', tint: 'rgba(255, 92, 69, 0.10)' },
  },
  // The mark that emits the wave. One path is enough to assert it is drawn.
  markPaths: ['M0 0h1v1H0z'],
  markViewBoxAttr: '0 0 253 236',
  // The wave's arithmetic is `@salmon/shared`'s own and is tested there
  // (`src/motion/wavefront.test.ts`); this file only needs it to answer.
  WAVEFRONT_CROSS_MS: 1400,
  WAVEFRONT_EBB_MS: 360,
  WAVEFRONT_PERIOD_MS: 2000,
  WAVEFRONT_SINK_MS: 90,
  WAVEFRONT_RECOVER_MS: 720,
  wavefrontRadius: () => 500,
  wavefrontExitMs: (isReduceMotionEnabled: boolean) => (isReduceMotionEnabled ? 180 : 1580),
  planWavefrontExit: (_elapsedMs: number, isReduceMotionEnabled: boolean) =>
    isReduceMotionEnabled ? { holdMs: 0, exitMs: 180 } : { holdMs: 1400, exitMs: 1580 },
}));

import { FLOAT_DELAY_MS, FLOAT_IN_MS } from '@salmon/shared/src/motion/sinkFloat';

import { LoadingScreen } from './LoadingScreen';

/**
 * When the wait's content has landed and the mark may start pressing into the
 * water. The beat is intrinsic to the wait, so the impact loop — and therefore
 * the exit's phase arithmetic — measures from here rather than from mount.
 */
const CONTENT_LANDS_MS = FLOAT_DELAY_MS + FLOAT_IN_MS;

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

  it('treats every wait as water, not just the one that opted in', () => {
    // `waves` used to default to false, so the account-recovery wait showed a
    // bare title over an empty screen. The treatment is the wait now.
    render(<LoadingScreen visible title="Recovering Account" />);

    expect(screen.getByTestId('loading-emitter')).toBeTruthy();
  });

  it('still lets a surface opt out of showing anything living through itself', () => {
    render(<LoadingScreen visible title="Loading wallet" waves={false} />);

    expect(screen.queryByTestId('loading-emitter')).toBeNull();
  });

  it('leaves the words and the tips exactly where they are', () => {
    // Product, 2026-08: "Unlocking Wallet sigue moviéndose y el div de tip
    // también, cuando te dije que no debería." The riders were not damped, they
    // were removed — there is no longer anything on the screen the front can
    // pick up, and `[data-wave-rider]` was the contract that said otherwise.
    const { container } = render(<LoadingScreen visible showTips title="Processing swap" />);

    expect(container.querySelector('[data-wave-rider]')).toBeNull();
  });

  it('shows no progress track — this screen has never known a percentage', () => {
    // The descent read as a progress bar and there has never been a `progress`
    // prop to fill it. A bar that cannot be right must not be drawn.
    render(<LoadingScreen visible title="Processing swap" />);

    expect(screen.queryByTestId('loading-descent')).toBeNull();
  });

  it('keeps the pulsing mark out of the dApp approval flow — the Bedrock Rule wins', () => {
    render(<LoadingScreen visible waves bedrock title="Approving" />);

    expect(screen.queryByTestId('loading-emitter')).toBeNull();
  });

  it('still leaves on a real wave when the work resolved before the mark landed', () => {
    // The exit used to be planned the instant the work resolved, so a wait
    // that resolved during the float-in had thrown nothing and left on the
    // ramp alone. The floor changes what is true here rather than what is
    // implemented: it outlasts the landing, so by the time the exit is planned
    // the mark has pressed and there is a front to see out. The plan is still
    // read at that later moment, which is what keeps the floor and the
    // calm-water hold from double-counting.
    const onExited = vi.fn();
    const { rerender } = render(
      <LoadingScreen visible waves title="Processing swap" onExited={onExited} />
    );

    rerender(<LoadingScreen visible={false} waves title="Processing swap" onExited={onExited} />);

    act(() => {
      vi.advanceTimersByTime(5000 + 1579);
    });
    expect(onExited).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('shows the tips on every wait, and lets one surface suppress them', () => {
    // Reversal (owner): the default was off, so only unlock and recovery had
    // anything to read while they waited. Every wait shows them now; the prop
    // survives as the exception rather than the rule.
    render(<LoadingScreen visible title="Processing swap" />);
    expect(screen.getByText('tips.one')).toBeTruthy();

    cleanup();
    render(<LoadingScreen visible title="Processing swap" showTips={false} />);
    expect(screen.queryByText('tips.one')).toBeNull();
  });

  it('holds until the front in flight has left the screen, then ebbs', () => {
    const onExited = vi.fn();
    const { rerender } = render(
      <LoadingScreen visible waves title="Processing swap" onExited={onExited} />
    );

    // Past the landing: the float precedes the impact, so the loop — and the
    // phase the exit reads — only starts once the content is in place.
    act(() => {
      vi.advanceTimersByTime(CONTENT_LANDS_MS + 1);
    });

    rerender(<LoadingScreen visible={false} waves title="Processing swap" onExited={onExited} />);

    // The owner's floor first, with the crest still looping and the exit not
    // yet planned; then one whole crossing plus an ebb, so the front is not
    // cut off, it finishes. The two are sequential, never overlapped.
    act(() => {
      vi.advanceTimersByTime(5000 - (CONTENT_LANDS_MS + 1) + 1579);
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

    // The floor is a *hold*, not a transition: reduced motion does not shorten
    // it, exactly as the copy-feedback hold is not shortened. What reduced
    // motion still buys is the wave it does not have to wait out.
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onExited).not.toHaveBeenCalled();

    // The plain fade, not the wave-driven exit: the receipt arrives sooner.
    act(() => {
      vi.advanceTimersByTime(1 + 300);
    });
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('leaves the words to carry the state under reduced motion', () => {
    setReducedMotion(true);
    render(<LoadingScreen visible waves title="Processing swap" />);

    expect(screen.getByText('Processing swap')).toBeTruthy();
    expect(screen.queryByTestId('loading-descent')).toBeNull();
  });
});
