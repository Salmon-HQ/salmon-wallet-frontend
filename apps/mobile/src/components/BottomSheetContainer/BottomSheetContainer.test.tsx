import React from 'react';
import { Text, View } from 'react-native';
import { act, render } from '@testing-library/react-native';

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
  semantic: jest.requireActual('@salmon/shared/src/theme/semantic').semantic,
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

describe('BottomSheetContainer sheet material', () => {
  it('grounds on the thick-tier thermocline by default', () => {
    const { getByTestId } = render(
      <BottomSheetContainer visible onClose={noop} testID="sheet">
        <Text>body</Text>
      </BottomSheetContainer>
    );

    expect(getByTestId('thermocline').props.tier).toBe('thick');
  });

  it('renders no texture overlay — the material carries the ground alone', () => {
    const { queryByTestId } = render(
      <BottomSheetContainer visible onClose={noop}>
        <Text>body</Text>
      </BottomSheetContainer>
    );

    expect(queryByTestId('sheet-texture-overlay')).toBeNull();
  });

  it('lets an explicit background win over the default thermocline', () => {
    const { getByTestId, queryByTestId } = render(
      <BottomSheetContainer visible onClose={noop} background={<View testID="custom-bg" />}>
        <Text>body</Text>
      </BottomSheetContainer>
    );

    expect(getByTestId('custom-bg')).toBeTruthy();
    expect(queryByTestId('thermocline')).toBeNull();
  });
});

describe('BottomSheetContainer departure', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function renderSheet(visible: boolean, onClosed: () => void) {
    return render(
      <BottomSheetContainer visible={visible} onClose={jest.fn()} onClosed={onClosed}>
        <Text>content</Text>
      </BottomSheetContainer>
    );
  }

  it('reports the arrival, not just the request, once the sheet has left', () => {
    // `onClose` fires when leaving is asked for; a caller sequencing chrome
    // behind the sheet needs to know when it is actually gone.
    const onClosed = jest.fn();
    const { rerender } = renderSheet(true, onClosed);

    expect(onClosed).not.toHaveBeenCalled();

    rerender(
      <BottomSheetContainer visible={false} onClose={jest.fn()} onClosed={onClosed}>
        <Text>content</Text>
      </BottomSheetContainer>
    );
    act(() => {
      jest.runAllTimers();
    });

    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('reports once even though the watchdog and the animation both land', () => {
    // The exit callback only runs on `finished === true`, so a watchdog covers
    // a cancelled animation. Whichever arrives second must stay quiet.
    const onClosed = jest.fn();
    const { rerender } = renderSheet(true, onClosed);

    rerender(
      <BottomSheetContainer visible={false} onClose={jest.fn()} onClosed={onClosed}>
        <Text>content</Text>
      </BottomSheetContainer>
    );
    act(() => {
      jest.runAllTimers();
      jest.runAllTimers();
    });

    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('reports again on a second departure', () => {
    const onClosed = jest.fn();
    const { rerender } = renderSheet(true, onClosed);

    const show = (visible: boolean) =>
      rerender(
        <BottomSheetContainer visible={visible} onClose={jest.fn()} onClosed={onClosed}>
          <Text>content</Text>
        </BottomSheetContainer>
      );

    show(false);
    act(() => jest.runAllTimers());
    show(true);
    show(false);
    act(() => jest.runAllTimers());

    expect(onClosed).toHaveBeenCalledTimes(2);
  });
});
