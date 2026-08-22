/**
 * The membrane bottom edge — the fade under the floating tab bar.
 *
 * Two regressions bracket this gradient, one per direction:
 *  - removed (or clipped above the safe-area gap), a raw list row shows in
 *    the gap between the pill and the physical bottom edge;
 *  - painted with an opaque *black* stop, it becomes a flat slab over the
 *    water instead of the water darkening.
 * These tests pin both: the mask mounts, it spans the container's full box,
 * and its densest stop stays on the depth ramp's own hue, below full opacity.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { fontSize, gradients, semantic, spacing } from '@salmon/shared/src/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// The real theme tokens, without dragging the barrel's Solana ESM into Jest.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

// Reanimated pulls the Worklets native module, which does not exist under
// Jest; the bar's sink only needs a View and inert animation shims.
jest.mock('react-native-reanimated', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View: ({ children, ...props }: Record<string, unknown>) =>
        ReactActual.createElement(View, props, children),
    },
    useReducedMotion: () => false,
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    withTiming: (toValue: unknown) => toValue,
    Easing: { bezier: () => () => 0 },
  };
});

jest.mock('expo-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    LinearGradient: ({ children, ...props }: Record<string, unknown>) =>
      ReactActual.createElement(View, props, children),
  };
});

jest.mock('../Thermocline', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Thermocline: (props: Record<string, unknown>) => ReactActual.createElement(View, props),
  };
});

jest.mock('../../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ tabBarBottomPadding: 34 }),
}));

import { GlassTabBar } from './GlassTabBar.native';

const navigationState = {
  index: 0,
  routes: [
    { key: 'index-1', name: 'index' },
    { key: 'collectibles-1', name: 'collectibles' },
    { key: 'swap-1', name: 'swap' },
  ],
};

const props = {
  state: navigationState,
  descriptors: {},
  navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() },
} as unknown as BottomTabBarProps;

describe('GlassTabBar membrane bottom edge', () => {
  it('covers from above the pill to the physical bottom edge, on every device', () => {
    const { getByTestId } = render(<GlassTabBar {...props} />);

    const fade = getByTestId('tab-bar-fade');
    const style = StyleSheet.flatten(fade.props.style);
    // bottom: 0 carries the fade across the safe-area gap to the physical
    // bottom edge; the negative top overshoots the container so the mask
    // starts ABOVE the pill's top edge (owner: rows were reading at pill
    // level) — at least spacing.lg above.
    expect(style).toMatchObject({ position: 'absolute', bottom: 0, left: 0, right: 0 });
    expect(style.top).toBeLessThanOrEqual(-spacing.lg);
    // It masks the list, never the taps.
    expect(fade.props.pointerEvents).toBe('none');
  });

  it('fades to the water, not to a black slab', () => {
    const { getByTestId } = render(<GlassTabBar {...props} />);

    const fade = getByTestId('tab-bar-fade');
    const stops: string[] = fade.props.colors;
    // Every stop rides the water floor's hue (7, 9, 17 = neutral-1000), so
    // the gradient reads as water darkening. Pure black is yesterday's slab —
    // it must not return, at any alpha.
    expect(stops).not.toContain('#000000');
    for (const stop of stops) {
      expect(stop).toMatch(/^rgba\(7, 9, 17, /);
    }
    // The transparent stop carries the same hue, so the fade never grays out
    // mid-ramp on platforms that interpolate through transparent black.
    expect(stops[stops.length - 1]).toBe('rgba(7, 9, 17, 0)');
    // Bottom-to-top: the densest stop sits at the physical bottom edge.
    expect(gradients.tabBarFade.start).toEqual({ x: 0.5, y: 1 });
    expect(gradients.tabBarFade.end).toEqual({ x: 0.5, y: 0 });
  });

  it('sustains a dense — but never fully opaque — band from the pill zone to the bottom', () => {
    // Owner, on-device 2026-08-19: dense under the pill, but not a plate —
    // the max alpha stays below 1 so content sinks into water instead of
    // vanishing, and holds ≥0.85 so rows never read through the pill.
    const { getByTestId } = render(<GlassTabBar {...props} />);
    const fade = getByTestId('tab-bar-fade');

    const stops: string[] = fade.props.colors;
    const locations: number[] = fade.props.locations;
    expect(locations).toHaveLength(stops.length);
    // Two identical dense stops bracket the sustained band…
    expect(stops[1]).toBe(stops[0]);
    expect(locations[0]).toBe(0);
    // …and the band reaches at least 40% up the mask (≈ the pill's zone).
    expect(locations[1]).toBeGreaterThanOrEqual(0.4);
    expect(locations[locations.length - 1]).toBe(1);
    // The dense alpha: tuneable, but bounded — <1 (never opaque) and ≥0.85.
    const alphaMatch = stops[0].match(/^rgba\(7, 9, 17, (0\.\d+)\)$/);
    expect(alphaMatch).not.toBeNull();
    const maxAlpha = Number(alphaMatch?.[1]);
    expect(maxAlpha).toBeLessThan(1);
    expect(maxAlpha).toBeGreaterThanOrEqual(0.85);
  });
});

/**
 * Label legibility on the membrane. The ratios themselves are asserted in
 * `packages/shared/src/theme/contrast.test.ts` against `membraneThick`'s
 * worst-case composite; this pins that the bar actually wears those inks and
 * that the label never slips back under the type scale (the old 11px one-off).
 */
describe('GlassTabBar labels', () => {
  it('sit on the type scale and wear the membrane-safe inks', () => {
    const { getByText } = render(<GlassTabBar {...props} />);

    // index 0 → Home is the active tab.
    const active = StyleSheet.flatten(getByText('Home').props.style);
    expect(active.fontSize).toBeGreaterThanOrEqual(fontSize.caption);
    expect(active.color).toBe(semantic.accent.inkOnMembrane);

    const inactive = StyleSheet.flatten(getByText('Swap').props.style);
    expect(inactive.color).toBe(semantic.text.secondary);
  });
});
