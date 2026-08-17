/**
 * The wait, after the choreography: no ring, no pulsing logo, no tips, and a
 * descent that exists under reduced motion too — a parallel mapping, not a hole.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

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
    text: { accent: '#FF5C45' },
    border: { hairline: 'rgba(199,211,232,0.10)' },
  },
  componentSizes: {
    descentTrackWidth: 2,
    descentTrackHeight: 120,
    descentSegmentHeight: 44,
    waveAmplitude: 3,
  },
  fontFamilyNative: { regular: 'Geist', bold: 'Geist-Bold' },
  fontSize: { sm: 12, base: 14, md: 16, '2xl': 24 },
  letterSpacing: { widest: 1 },
  motionMs: { swell: 180, ebb: 180, drift: 280, stagger: 24, shimmerCycle: 1400, pulseCycle: 1200 },
  motionEasing: {
    current: { native: [0.32, 0.72, 0, 1] },
    settle: { native: [0.22, 1, 0.36, 1] },
    sink: { native: [0.4, 0, 1, 1] },
    swellIn: { native: [0.34, 1.14, 0.64, 1] },
  },
  resolveMotionMs: (ms: number, reduced: boolean) => (reduced ? 0 : ms),
  spacing: { sm: 8, lg: 16, '2xl': 24, '3xl': 32, '5xl': 48 },
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

  it('waits on a descent, not on a spinning ring', () => {
    render(<LoadingScreen visible title="Processing swap" />);

    expect(screen.getByTestId('loading-descent')).toBeTruthy();
  });

  it('keeps its wait screens free of the tip carousel by default', () => {
    // "Always check the transaction details before signing", arriving after the
    // signature. The default is off; the screens where the advice still applies
    // to a decision the user can make opt in.
    render(<LoadingScreen visible title="Processing swap" />);

    expect(screen.queryByText('general.tips.1')).toBeNull();
  });

  it('still draws the descent under reduced motion — a parallel, not a hole', () => {
    mockReduceMotion = true;
    render(<LoadingScreen visible title="Processing swap" waves />);

    expect(screen.getByTestId('loading-descent')).toBeTruthy();
  });
});
