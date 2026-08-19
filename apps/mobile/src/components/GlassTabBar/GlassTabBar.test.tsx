/**
 * The membrane bottom edge — the fade under the floating tab bar.
 *
 * Two regressions bracket this gradient, one per direction:
 *  - removed (or clipped above the safe-area gap), a raw list row shows in
 *    the gap between the pill and the physical bottom edge;
 *  - painted with an opaque *black* stop, it becomes a flat slab over the
 *    water instead of the water darkening.
 * These tests pin both: the mask mounts, it spans the container's full box,
 * and its opaque stop is the depth ramp's own floor.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { gradients, semantic } from '@salmon/shared/src/theme';
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
  it('mounts the fade mask spanning the whole container, safe-area gap included', () => {
    const { getByTestId } = render(<GlassTabBar {...props} />);

    const fade = getByTestId('tab-bar-fade');
    const style = StyleSheet.flatten(fade.props.style);
    // absoluteFillObject — bottom: 0 is what carries the fade across the
    // safe-area gap to the physical bottom edge.
    expect(style).toMatchObject({ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 });
    // It masks the list, never the taps.
    expect(fade.props.pointerEvents).toBe('none');
  });

  it('fades to the water, not to a black slab', () => {
    const { getByTestId } = render(<GlassTabBar {...props} />);

    const fade = getByTestId('tab-bar-fade');
    const stops: string[] = fade.props.colors;
    // Bottom stops are the depth ramp's own floor, so the gradient reads as
    // water darkening. Pure black is yesterday's slab — it must not return.
    expect(stops[0]).toBe(semantic.water.gradient[1]);
    expect(stops).not.toContain('#000000');
    // The transparent stop carries the same hue, so the fade never grays out
    // mid-ramp on platforms that interpolate through transparent black.
    expect(stops[stops.length - 1]).toBe('rgba(7, 9, 17, 0)');
    // Bottom-to-top: the opaque stop sits at the physical bottom edge.
    expect(gradients.tabBarFade.start).toEqual({ x: 0.5, y: 1 });
    expect(gradients.tabBarFade.end).toEqual({ x: 0.5, y: 0 });
  });

  it('holds a solid water floor under the pill before it starts fading', () => {
    // Owner, on-device: whatever passes under the pill must be near-illegible.
    // The floor stays fully opaque from the physical bottom edge up through
    // at least 40% of the mask, hands off through a high-opacity shoulder,
    // and only the top of the mask is the soft fade.
    const { getByTestId } = render(<GlassTabBar {...props} />);
    const fade = getByTestId('tab-bar-fade');

    const stops: string[] = fade.props.colors;
    const locations: number[] = fade.props.locations;
    expect(locations).toHaveLength(stops.length);
    // Two identical opaque stops bracket the solid zone…
    expect(stops[1]).toBe(stops[0]);
    expect(locations[0]).toBe(0);
    // …and the zone reaches at least 40% up the mask.
    expect(locations[1]).toBeGreaterThanOrEqual(0.4);
    // The shoulder between the solid zone and the fade stays heavy (≥0.8
    // alpha) and on the water's own hue.
    expect(stops[2]).toMatch(/^rgba\(7, 9, 17, 0\.8[0-9]*\)$/);
    expect(locations[2]).toBeGreaterThan(locations[1]);
    expect(locations[locations.length - 1]).toBe(1);
  });
});
