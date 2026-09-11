/**
 * The install/uninstall control turns one glyph instead of swapping two
 * icons: the vertical bar rotates onto the fixed one to read as a minus, and
 * back to read as a plus. This pins that the turning bar's rotation flips
 * with `minus`, landing on the fixed bar's own angle.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

// No worklets runtime in Jest — same minimal stand-in as PowerupsFab's suite.
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

import { PlusMinusGlyph } from './PlusMinusGlyph';

const rotationOf = (node: { props: { style: unknown } }) =>
  Object.assign({}, ...(Array.isArray(node.props.style) ? node.props.style : [node.props.style]))
    .transform?.[0]?.rotate;

describe('PlusMinusGlyph', () => {
  it('starts vertical — a plus — when not installed', () => {
    const { getByTestId } = render(<PlusMinusGlyph minus={false} />);
    expect(rotationOf(getByTestId('plus-minus-glyph-turning-bar'))).toBe('90deg');
  });

  it('turns the vertical bar flat onto the fixed one — a minus — once installed', () => {
    const { getByTestId, rerender } = render(<PlusMinusGlyph minus={false} />);

    rerender(<PlusMinusGlyph minus />);

    expect(rotationOf(getByTestId('plus-minus-glyph-turning-bar'))).toBe('180deg');
  });

  it('turns back to a plus on uninstall', () => {
    const { getByTestId, rerender } = render(<PlusMinusGlyph minus />);
    expect(rotationOf(getByTestId('plus-minus-glyph-turning-bar'))).toBe('180deg');

    rerender(<PlusMinusGlyph minus={false} />);

    expect(rotationOf(getByTestId('plus-minus-glyph-turning-bar'))).toBe('90deg');
  });
});
