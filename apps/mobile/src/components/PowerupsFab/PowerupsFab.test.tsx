import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

// The @salmon/shared barrel drags the ESM-only @solana/kit into Jest; the
// theme modules the component draws from are runtime-agnostic, so they are
// loaded directly (the FleshBackground test's convention). `shadows` pulls
// in nothing extra, so it is safe to require directly too.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/spacing'),
  ...jest.requireActual('@salmon/shared/src/theme/shadows'),
  ...jest.requireActual('@salmon/shared/src/theme/flesh'),
  ...jest.requireActual('@salmon/shared/src/theme/typography'),
  // The plus turns 45 degrees when the launcher opens, so the component now
  // reads the motion vocabulary (`motionMs`, `motionEasing`, `resolveMotionMs`).
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  semantic: jest.requireActual('@salmon/shared/src/theme/semantic').semantic,
  s: (value: number) => value,
}));

// Same minimal Reanimated stand-in as usePressMotion.test.tsx / the
// HeaderContent suite: no worklets runtime in Jest, so the hook's shared
// values and this component's `Animated.createAnimatedComponent` /
// `Animated.View` need plain-JS equivalents.
jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RNView,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    // A shared value that survives re-renders and re-renders on write. The
    // old `(value) => ({ value })` stub handed back a fresh object every
    // render, so a value written from an effect was thrown away — exactly the
    // path the FAB's rotation now takes.
    useSharedValue: (initial: unknown) => {
      const [, force] = ReactActual.useReducer((count: number) => count + 1, 0);
      const box = ReactActual.useRef(null);
      if (box.current === null) {
        const state = { current: initial };
        box.current = {
          current: state,
          sv: {
            get value() {
              return state.current;
            },
            set value(next: unknown) {
              if (state.current === next) return;
              state.current = next;
              force();
            },
          },
        };
      }
      return box.current.sv;
    },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
    Easing: { bezier: () => () => 0 },
  };
});

jest.mock('../FleshBackground', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    FleshBackground: () => ReactActual.createElement(RNView, { testID: 'flesh-background' }),
  };
});
jest.mock('../PressSpecular', () => ({ PressSpecular: () => null, SPECULAR_OPACITY: 0.12 }));

// The real press motion, deliberately: mocking it away hid the bug this suite
// now pins — `pressStyle` and the FAB's rotation both wrote `transform`, the
// style array kept only the last, and the plus never turned.
jest.mock('../../../hooks/haptics', () => ({}), { virtual: true });
jest.mock('../../utils/haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('../../icons', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    PlusIcon: () => ReactActual.createElement(RNView, { testID: 'glyph-plus' }),
    LightningIcon: () => ReactActual.createElement(RNView, { testID: 'glyph-lightning' }),
  };
});

import { PowerupsFab } from './PowerupsFab';

describe('PowerupsFab', () => {
  it('carries the flesh texture — the FAB is a solid accent fill', () => {
    const { getByTestId } = render(<PowerupsFab onPress={jest.fn()} bottomOffset={20} />);
    expect(within(getByTestId('powerups-fab')).getByTestId('flesh-background')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<PowerupsFab onPress={onPress} bottomOffset={20} />);

    fireEvent.press(getByTestId('powerups-fab'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes an accessible label that follows the launcher state', () => {
    const { getByLabelText, rerender } = render(
      <PowerupsFab onPress={jest.fn()} bottomOffset={20} />
    );
    expect(getByLabelText('Open Powerups')).toBeTruthy();

    rerender(<PowerupsFab onPress={jest.fn()} bottomOffset={20} open />);
    expect(getByLabelText('Close Powerups')).toBeTruthy();
  });

  it('draws a plus and turns it into the close mark when the launcher is open', () => {
    // The lightning stays on the launcher's own heading; the FAB is a plus,
    // and a plus turned 45 degrees IS the close mark.
    const flatten = (style: unknown) =>
      Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));
    const rotationOf = (node: { props: { style: unknown } }) =>
      (flatten(node.props.style).transform as Array<{ rotate?: string }>)?.find(
        (part) => part.rotate !== undefined
      )?.rotate;

    const { getByTestId, queryByTestId, rerender } = render(
      <PowerupsFab onPress={jest.fn()} bottomOffset={20} />
    );
    expect(getByTestId('glyph-plus')).toBeTruthy();
    expect(queryByTestId('glyph-lightning')).toBeNull();
    expect(rotationOf(getByTestId('powerups-fab'))).toBe('0deg');

    rerender(<PowerupsFab onPress={jest.fn()} bottomOffset={20} open />);
    expect(rotationOf(getByTestId('powerups-fab'))).toBe('45deg');
  });

  it('keeps the press scale and the rotation in one transform', () => {
    // Two styles each writing `transform` do not merge — the last wins. With
    // the real press motion in play, that dropped the rotation entirely.
    const flatten = (style: unknown) =>
      Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));

    const { getByTestId } = render(<PowerupsFab onPress={jest.fn()} bottomOffset={20} open />);
    const transform = flatten(getByTestId('powerups-fab').props.style).transform as Array<
      Record<string, unknown>
    >;

    expect(transform.some((part) => part.rotate === '45deg')).toBe(true);
    expect(transform.some((part) => part.scale !== undefined)).toBe(true);
  });
});
