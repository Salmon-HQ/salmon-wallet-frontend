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
import { componentSizes, semantic } from '@salmon/shared';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// The material itself is asserted in Thermocline's own suite; here the gate
// only has to mount it, on the right tier, with the gate's own geometry.
jest.mock('../Thermocline', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Thermocline: (props: { tier?: string; style?: unknown }) => (
      <View testID="gate-thermocline" {...props} />
    ),
  };
});

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
  fontSize: { heading: 18 },
  spacing: { lg: 16, md: 12, screenTop: 28, screenGutter: 20 },
  borderRadius: { '2xl': 24, header: 24, iconLg: 20 },
  componentSizes: { headerHeight: 56, walletHeaderRowHeight: 38, backButtonSize: 40 },
  semantic: {
    text: { primary: '#fff' },
    border: { raised: '#6F7B95' },
    surface: { shelf: '#10131C', crest: '#1B2233' },
  },
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

const mockTaskChrome = { engaged: false };
jest.mock('../../contexts/TaskChromeContext', () => ({
  useTaskChrome: () => ({ isTaskEngaged: mockTaskChrome.engaged, setTaskEngaged: jest.fn() }),
}));

import { GateContainer } from './GateContainer';

const GATE_HEIGHT = 800;
const SCREEN_TOP = 28;
const HEADER_ROW_HEIGHT = 38;
// The collapsed slice: safe area (0 in this suite) + `screenTop` + the row.
const HEADER_SLOT = SCREEN_TOP + HEADER_ROW_HEIGHT;
const COLLAPSED_Y = -(GATE_HEIGHT - HEADER_SLOT);

const renderGate = (state: 'locked' | 'collapsed') =>
  render(<GateContainer state={state} lockContent={null} headerContent={<Text>header</Text>} />);

const translateYOf = (testID: string): number | undefined => {
  const style = StyleSheet.flatten(screen.getByTestId(testID).props.style) as {
    transform?: Array<{ translateY?: number }>;
  };
  return style.transform?.find((part) => part.translateY !== undefined)?.translateY;
};

const surfaceBackground = (): string | undefined =>
  (
    StyleSheet.flatten(screen.getByTestId('gate-surface').props.style) as {
      backgroundColor?: string;
    }
  ).backgroundColor;

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

  it('swaps the expanded title through its keyed wrapper when the panel changes', () => {
    const renderExpanded = (title: string) => (
      <GateContainer
        state="settings"
        lockContent={null}
        headerContent={<Text>header</Text>}
        settingsContent={<Text>settings</Text>}
        expandedHeader={{ title, onClose: jest.fn() }}
      />
    );
    const view = render(renderExpanded('Settings'));
    expect(screen.getByTestId('gate-expanded-title')).toHaveTextContent('Settings');

    view.rerender(renderExpanded('Accounts'));
    // The wrapper is keyed on the title string, so the swap remounts it —
    // the old title's sink and the new one's float hang off that key change.
    expect(screen.getByTestId('gate-expanded-title')).toHaveTextContent('Accounts');
    expect(screen.queryByText('Settings')).toBeNull();
  });

  it('grounds on the thick thermocline instead of a fill of its own', () => {
    render(
      <GateContainer
        state="settings"
        lockContent={null}
        headerContent={<Text>header</Text>}
        settingsContent={<Text>settings</Text>}
        expandedHeader={{ title: 'Settings', onClose: jest.fn() }}
      />
    );

    const material = screen.getByTestId('gate-thermocline');
    expect(material.props.tier).toBe('thick');
    // Expanded, the material gets its scrim floor: the thick tier's own
    // nearest opaque plane, so nothing of the home survives behind it.
    expect(surfaceBackground()).toBe(semantic.surface.crest);
  });

  it('paints nothing at all while collapsed — the header is on the balance plane', () => {
    renderGate('collapsed');

    // No material, no floor, no rounded edge: the band the header used to
    // draw overlapped the balance block below it (owner, first device run).
    expect(screen.queryByTestId('gate-thermocline')).toBeNull();
    expect(surfaceBackground()).toBe('transparent');

    const surface = StyleSheet.flatten(screen.getByTestId('gate-surface').props.style) as {
      borderBottomLeftRadius?: number;
      shadowOpacity?: number;
    };
    expect(surface.borderBottomLeftRadius).toBeUndefined();
    expect(surface.shadowOpacity).toBeUndefined();
  });

  it('leaves the material out while locked — the lock content owns that ground', () => {
    renderGate('locked');

    expect(screen.queryByTestId('gate-thermocline')).toBeNull();
  });

  it('leaves the collapsed header room for the screen top padding above the row', () => {
    renderGate('collapsed');

    // The row fills `headerHeight`; the padding above it is the screen's own
    // top (safe area + screenTop), which is what `useTabChrome` reserves.
    const rowHeight = (
      StyleSheet.flatten(screen.getByTestId('gate-header-bar').props.style) as { height?: number }
    ).height;
    expect(rowHeight).toBe(componentSizes.walletHeaderRowHeight);
    expect(HEADER_SLOT).toBe(SCREEN_TOP + componentSizes.walletHeaderRowHeight);
  });

  it('mounts the back chevron through its verb wrapper only while a back target exists', () => {
    const renderExpanded = (onBack?: () => void) => (
      <GateContainer
        state="settings"
        lockContent={null}
        headerContent={<Text>header</Text>}
        settingsContent={<Text>settings</Text>}
        expandedHeader={{ title: 'Settings', onClose: jest.fn(), onBack }}
      />
    );
    // Menu root: no back target, the slot holds a placeholder.
    const view = render(renderExpanded(undefined));
    expect(screen.queryByTestId('gate-back-verb')).toBeNull();
    expect(screen.queryByTestId('screen-header-back-button')).toBeNull();

    // A panel is pushed: the chevron appears through the animated wrapper.
    view.rerender(renderExpanded(jest.fn()));
    expect(screen.getByTestId('gate-back-verb')).toBeTruthy();
    expect(screen.getByTestId('screen-header-back-button')).toBeTruthy();

    // Back to the root: it leaves again.
    view.rerender(renderExpanded(undefined));
    expect(screen.queryByTestId('gate-back-verb')).toBeNull();
  });
});

describe('the collapsed header stands on the same ground as the surface above it', () => {
  it('paints no fill of its own — the material behind it is the header', () => {
    renderGate('collapsed');

    const headerBackground = (
      StyleSheet.flatten(screen.getByTestId('gate-header-bar').props.style) as {
        backgroundColor?: string;
      }
    ).backgroundColor;

    // An opaque row here printed a flat band across the thermocline, a
    // different value from the inset strip directly above it — which was
    // already showing the material through. Same ground, or a seam.
    expect(headerBackground).toBe('transparent');
    expect(surfaceBackground()).toBe('transparent');
  });

  it('fills its slot exactly, on any screen height', () => {
    renderGate('collapsed');

    const height = (
      StyleSheet.flatten(screen.getByTestId('gate-header-bar').props.style) as {
        height?: number;
      }
    ).height;

    // The raw token, never a device-scaled one. Everything else that defines
    // this slot — the collapse math, the floor, the slot, `useTabChrome` — is
    // unscaled, and a scaled row underfills the slot on a short screen and
    // overflows the gate's rounded corner on a tall one. This has drifted
    // silently in this file twice now.
    expect(height).toBe(componentSizes.walletHeaderRowHeight);
  });
});

describe('the collapsed header while a task owns the screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    mockTaskChrome.engaged = false;
    jest.useRealTimers();
  });

  it('leaves with the content instead of lifting the whole gate', () => {
    const view = renderGate('collapsed');
    act(() => {
      fireEvent(screen.getByTestId('gate-root'), 'layout', {
        nativeEvent: { layout: { height: GATE_HEIGHT } },
      });
    });
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByTestId('gate-header-bar')).toBeTruthy();

    mockTaskChrome.engaged = true;
    view.rerender(
      <GateContainer state="collapsed" lockContent={null} headerContent={<Text>header</Text>} />
    );

    // The row unmounts (its sink plays on the way out); the gate itself never
    // travels — the compuerta is gone.
    expect(screen.queryByTestId('gate-header-bar')).toBeNull();
    expect(translateYOf('gate-root')).toBe(COLLAPSED_Y);

    mockTaskChrome.engaged = false;
    view.rerender(
      <GateContainer state="collapsed" lockContent={null} headerContent={<Text>header</Text>} />
    );
    expect(screen.getByTestId('gate-header-bar')).toBeTruthy();
    expect(translateYOf('gate-root')).toBe(COLLAPSED_Y);
  });
});
