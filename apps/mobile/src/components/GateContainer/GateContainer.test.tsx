/**
 * The gate's contract with the home header (regression, owner 2026-08-18).
 *
 * Since the compuerta arrived (TaskChromeContext), the concealment effect
 * re-ran on every collapsedY/gateHeight change and on the locked→collapsed
 * transition, and each re-run reassigned the translateY shared value — which
 * cancels the animation in flight. The unlock slideIn's completion callback
 * then fired with finished=false, headerContentOpacity never faded in, and
 * the home header rendered as an empty dark band.
 *
 * The reanimated mock below reproduces exactly that semantics: assigning a
 * shared value while a timing is pending cancels it (callback gets
 * finished=false), and pending timings complete on Jest's fake timers. The
 * assertions pin the contract: with the task context at rest (false), the
 * collapsed gate sits at collapsedY — not concealed off-screen — and the
 * header content reaches opacity 1.
 */
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../icons', () => ({
  CaretLeftIcon: () => null,
  XIcon: () => null,
  iconSize: { lg: 24 },
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  colors: {
    text: { primary: '#fff' },
    background: { primary: '#0B0F19', card: '#111' },
    dialog: { overlay: '#000' },
    border: { default: '#222' },
  },
  fontFamilyNative: { bold: 'System' },
  fontSize: { lg: 18 },
  spacing: { lg: 16, md: 12 },
  borderRadius: { '2xl': 24, header: 24, iconLg: 20 },
  componentSizes: { headerHeight: 56 },
  shadows: {
    topSheet: {},
    header: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
  },
  vs: (value: number) => value,
}));

// Shared values with real cancellation semantics: a pending timing completes
// on the fake-timer clock, and reassigning the value first cancels it —
// firing its callback with finished=false, exactly as Reanimated does.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const { useRef } = jest.requireActual('react');
  const makeShared = (initial: unknown) => {
    let current = initial;
    let cancel: (() => void) | null = null;
    return {
      get value() {
        return current;
      },
      set value(next: unknown) {
        if (cancel) {
          const pending = cancel;
          cancel = null;
          pending();
        }
        if (
          next &&
          typeof next === 'object' &&
          (next as { __timing?: boolean }).__timing === true
        ) {
          const { toValue, duration, cb } = next as {
            toValue: unknown;
            duration: number;
            cb?: (finished: boolean) => void;
          };
          const timer = setTimeout(() => {
            cancel = null;
            current = toValue;
            cb?.(true);
          }, duration);
          cancel = () => {
            clearTimeout(timer);
            cb?.(false);
          };
        } else {
          current = next;
        }
      },
    };
  };
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: unknown) => useRef(makeShared(initial)).current,
    useAnimatedStyle: (fn: () => object) => fn(),
    useReducedMotion: () => false,
    withTiming: (
      toValue: unknown,
      config?: { duration?: number },
      cb?: (finished: boolean) => void
    ) => ({
      __timing: true,
      toValue,
      duration: config?.duration ?? 0,
      cb,
    }),
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
    Easing: { bezier: () => () => 0 },
  };
});

import { GateContainer } from './GateContainer';

const GATE_HEIGHT = 800;
const HEADER_HEIGHT = 56;
const COLLAPSED_Y = -(GATE_HEIGHT - HEADER_HEIGHT);

const renderGate = (state: 'locked' | 'collapsed') =>
  render(<GateContainer state={state} lockContent={null} headerContent={<Text>header</Text>} />);

const translateYOf = (testID: string): number | undefined => {
  const style = StyleSheet.flatten(screen.getByTestId(testID).props.style) as {
    transform?: Array<{ translateY?: number }>;
  };
  return style.transform?.find((part) => part.translateY !== undefined)?.translateY;
};

const opacityOf = (testID: string): number | undefined =>
  (StyleSheet.flatten(screen.getByTestId(testID).props.style) as { opacity?: number }).opacity;

describe('GateContainer collapsed header with the task context at rest', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('survives unlock: the gate lands at collapsedY and the header content fades fully in', () => {
    const view = renderGate('locked');
    act(() => {
      fireEvent(screen.getByTestId('gate-root'), 'layout', {
        nativeEvent: { layout: { height: GATE_HEIGHT } },
      });
    });

    view.rerender(
      <GateContainer state="collapsed" lockContent={null} headerContent={<Text>header</Text>} />
    );
    act(() => {
      jest.runAllTimers();
    });
    // Shared values do not schedule renders; re-render to read the styles.
    view.rerender(
      <GateContainer state="collapsed" lockContent={null} headerContent={<Text>header</Text>} />
    );

    // At collapsedY — the header slot — not concealed at -gateHeight.
    expect(translateYOf('gate-root')).toBe(COLLAPSED_Y);
    // The slideIn completed (was not cancelled), so its callback ran and the
    // header content is visible. This is the regressed assertion: the
    // concealment effect re-asserting translateY cancelled the slideIn and
    // left this at 0.
    expect(opacityOf('gate-header-bar')).toBe(1);
  });

  it('renders a directly-mounted collapsed gate positioned and with visible header', () => {
    const view = renderGate('collapsed');
    act(() => {
      fireEvent(screen.getByTestId('gate-root'), 'layout', {
        nativeEvent: { layout: { height: GATE_HEIGHT } },
      });
    });
    act(() => {
      jest.runAllTimers();
    });
    view.rerender(
      <GateContainer state="collapsed" lockContent={null} headerContent={<Text>header</Text>} />
    );

    expect(translateYOf('gate-root')).toBe(COLLAPSED_Y);
    expect(opacityOf('gate-header-bar')).toBe(1);
  });
});
