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
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
  motionMs: { swell: 180, stagger: 24, shimmerCycle: 1400, pulseCycle: 1200 },
  motionDuration: { tide: '720ms' },
  motionEasing: { current: { css: 'cubic-bezier(0.32, 0.72, 0, 1)' } },
  reducedMotion: { query: '(prefers-reduced-motion: reduce)' },
  semantic: {
    text: { accent: '#FF5C45' },
    border: { hairline: 'rgba(199, 211, 232, 0.10)' },
  },
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
