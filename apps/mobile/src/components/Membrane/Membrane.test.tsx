import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

const OPAQUE_FALLBACK = '#161C2D';

jest.mock('@salmon/shared', () => ({
  semantic: {
    surface: {
      raised: OPAQUE_FALLBACK,
      membraneThick: 'rgba(11, 15, 25, 0.80)',
    },
  },
}));

// jest-expo auto-mocks native modules, so the glass probe has to be driven
// explicitly to exercise each rung of the degradation ladder.
let mockGlassAvailable = false;

jest.mock('expo-glass-effect', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    GlassView: ({ children, ...props }: Record<string, unknown>) =>
      ReactActual.createElement(View, { ...props, testID: 'glass-view' }, children),
    isGlassEffectAPIAvailable: () => mockGlassAvailable,
    isLiquidGlassAvailable: () => mockGlassAvailable,
  };
});

jest.mock('../BlurContainer', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BlurContainer: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { ...props, testID: 'blur-container' }),
    useBlurTarget: () => undefined,
    BlurTargetProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { Membrane } from './Membrane';

// The tab bar's geometry: `componentSizes.tabBarRadius` (the control radius,
// 12 — a control, not a pill; pinned in shared's `controlRadius.test.ts`).
const GEOMETRY = { borderRadius: 12, backgroundColor: 'rgba(0, 0, 0, 0.4)' };

describe('Membrane', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({
      remove: () => {},
    } as ReturnType<typeof AccessibilityInfo.addEventListener>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the blur rung when the liquid glass API is unavailable', () => {
    const { getByTestId } = render(<Membrane style={GEOMETRY} />);

    expect(getByTestId('blur-container')).toBeTruthy();
  });

  it('collapses to an opaque plane when Reduce Transparency is on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);

    const { queryByTestId, toJSON } = render(<Membrane style={GEOMETRY} />);

    await waitFor(() => expect(queryByTestId('blur-container')).toBeNull());

    const flattened = StyleSheet.flatten(toJSON()?.props.style);
    expect(flattened.backgroundColor).toBe(OPAQUE_FALLBACK);
    // Rung 5 must not move the layout by a pixel.
    expect(flattened.borderRadius).toBe(GEOMETRY.borderRadius);
  });

  it('uses native glass, with the scrim painted inside it, when available', () => {
    mockGlassAvailable = true;

    const { getByTestId, queryByTestId } = render(<Membrane style={GEOMETRY} />);

    expect(queryByTestId('blur-container')).toBeNull();

    const glass = getByTestId('glass-view');
    expect(StyleSheet.flatten(glass.props.style).backgroundColor).toBe('transparent');

    // GlassView tint blending is not a contractual alpha — the scrim floor is
    // an explicit child.
    const scrim = glass.children[0] as unknown as { props: { style: StyleProp<ViewStyle> } };
    expect(StyleSheet.flatten(scrim.props.style)?.backgroundColor).toBe('rgba(11, 15, 25, 0.80)');

    mockGlassAvailable = false;
  });
});
