import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

// Mutable holder so each test can flip the debug switch the component reads.
const debugState: { sheetMaterial: 'current' | 'thermocline' } = {
  sheetMaterial: 'current',
};

jest.mock('../../debug/sheetMaterial', () => ({
  get sheetMaterial() {
    return debugState.sheetMaterial;
  },
}));

// The material itself is pinned by Thermocline's own tests; here it only has
// to be identifiable and carry its props through.
jest.mock('../Thermocline', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    Thermocline: (props: Record<string, unknown>) =>
      ReactActual.createElement(RNView, { ...props, testID: 'thermocline' }),
  };
});

jest.mock('react-native-reanimated', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View: ({ children, ...props }: Record<string, unknown>) =>
        ReactActual.createElement(RNView, props, children),
    },
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    withTiming: (toValue: unknown) => toValue,
    withSpring: (toValue: unknown) => toValue,
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    interpolate: () => 0,
    Easing: { bezier: () => () => 0 },
  };
});

jest.mock('@salmon/shared', () => ({
  // The mobile motion wrapper reads the real motion vocabulary.
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  colors: {
    background: { primary: '#0B0F19', secondary: '#10131C' },
    sheet: { backdrop: 'rgba(0,0,0,0.5)', handle: '#fff' },
    border: { default: '#58637B' },
    interactive: { surface: '#222' },
  },
  shadows: { sheet: {} },
  borderRadius: { card: 24, full: 999 },
  borderWidth: { sheet: 1 },
  componentSizes: {
    sheetHandleWidth: 40,
    sheetHandleHeight: 4,
    sheetHandleOpacity: 0.4,
    sheetFadeGradientHeight: 24,
  },
  spacing: { sm: 8, md: 12 },
  opacity: { faint: 0.1 },
  vs: (value: number) => value,
  s: (value: number) => value,
}));

jest.mock('react-native-gesture-handler', () => {
  const { View: RNView } = jest.requireActual('react-native');
  const chainable: Record<string, unknown> = {};
  for (const method of ['enabled', 'onStart', 'onUpdate', 'onEnd']) {
    chainable[method] = () => chainable;
  }
  return {
    Gesture: { Pan: () => chainable },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: RNView,
  };
});

jest.mock('expo-blur', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return { BlurTargetView: RNView };
});

jest.mock('expo-linear-gradient', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return { LinearGradient: RNView };
});

jest.mock('../BlurContainer', () => ({
  BlurTargetProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { BottomSheetContainer } from './BottomSheetContainer';

const noop = () => {};

describe('BottomSheetContainer sheet material (debug switch)', () => {
  beforeEach(() => {
    debugState.sheetMaterial = 'current';
  });

  it('renders no thermocline by default — the shipped look is unchanged', () => {
    const { queryByTestId } = render(
      <BottomSheetContainer visible onClose={noop} testID="sheet">
        <Text>body</Text>
      </BottomSheetContainer>
    );

    expect(queryByTestId('thermocline')).toBeNull();
  });

  it('keeps the legacy texture overlay on the current material', () => {
    const { getByTestId } = render(
      <BottomSheetContainer visible onClose={noop} showTextureOverlay>
        <Text>body</Text>
      </BottomSheetContainer>
    );

    expect(getByTestId('sheet-texture-overlay')).toBeTruthy();
  });

  it('mounts the thick-tier thermocline when the switch is flipped and no background was passed', () => {
    debugState.sheetMaterial = 'thermocline';

    const { getByTestId } = render(
      <BottomSheetContainer visible onClose={noop}>
        <Text>body</Text>
      </BottomSheetContainer>
    );

    expect(getByTestId('thermocline').props.tier).toBe('thick');
  });

  it('suppresses the legacy texture overlay while the thermocline carries the ground', () => {
    debugState.sheetMaterial = 'thermocline';

    const { getByTestId, queryByTestId } = render(
      <BottomSheetContainer visible onClose={noop} showTextureOverlay>
        <Text>body</Text>
      </BottomSheetContainer>
    );

    expect(getByTestId('thermocline')).toBeTruthy();
    expect(queryByTestId('sheet-texture-overlay')).toBeNull();
  });

  it('leaves an explicit background untouched — the caller wins over the switch', () => {
    debugState.sheetMaterial = 'thermocline';

    const { getByTestId, queryByTestId } = render(
      <BottomSheetContainer visible onClose={noop} background={<View testID="custom-bg" />}>
        <Text>body</Text>
      </BottomSheetContainer>
    );

    expect(getByTestId('custom-bg')).toBeTruthy();
    expect(queryByTestId('thermocline')).toBeNull();
  });
});
