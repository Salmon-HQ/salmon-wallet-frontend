/**
 * The panel stack's order of events: the sink and the float never overlap.
 *
 * The bug these tests pin: tapping a settings row used to mount the incoming
 * panel while the outgoing one was still on screen, so both were in the tree
 * at once. The contract now is sequential — while a panel is sinking the next
 * one does not exist, it appears only once that sink reports done, and a pop
 * obeys the same order. Reduce motion is a cut with no empty beat.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';

import { SettingsPanelStack } from './SettingsPanelStack';
import type { MobilePanelRegistry } from './types';

const mockSinkCallbacks: Array<() => void> = [];
let mockReduceMotion = false;

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => mockReduceMotion,
    withTiming: (value: unknown, _config?: unknown, callback?: () => void) => {
      if (callback) mockSinkCallbacks.push(callback);
      return value;
    },
    withDelay: (_delay: number, value: unknown) => value,
    runOnJS: (fn: () => void) => fn,
    Easing: { bezier: (...args: number[]) => args },
  };
});

// The stack only needs the motion vocabulary and one background token; the
// real barrel pulls in the Solana client, which no panel here renders.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  colors: { background: { primary: '#000' } },
}));

const registry: MobilePanelRegistry = {
  security: () => <Text testID="panel-security">Menu</Text>,
  accounts: () => <Text testID="panel-accounts">Accounts</Text>,
};

const menu = [{ screen: 'security' as const }];
const menuThenAccounts = [{ screen: 'security' as const }, { screen: 'accounts' as const }];

function renderStack(props: Partial<React.ComponentProps<typeof SettingsPanelStack>> = {}) {
  return render(
    <SettingsPanelStack
      panelRegistry={registry}
      stack={menu}
      onNavigate={jest.fn()}
      onBack={jest.fn()}
      animating={false}
      slideDirection="idle"
      {...props}
    />
  );
}

/** Completes every sink currently in flight, the way the animation would. */
function finishSink(): void {
  act(() => {
    const pending = mockSinkCallbacks.splice(0, mockSinkCallbacks.length);
    for (const callback of pending) callback();
  });
}

beforeEach(() => {
  mockSinkCallbacks.length = 0;
  mockReduceMotion = false;
});

describe('SettingsPanelStack push', () => {
  it('keeps the incoming panel out of the tree while the outgoing one sinks', () => {
    const { rerender, queryByTestId } = renderStack();
    expect(queryByTestId('panel-security')).toBeTruthy();

    rerender(
      <SettingsPanelStack
        panelRegistry={registry}
        stack={menuThenAccounts}
        onNavigate={jest.fn()}
        onBack={jest.fn()}
        animating
        slideDirection="in"
      />
    );

    expect(queryByTestId('panel-accounts')).toBeNull();
    expect(queryByTestId('panel-security')).toBeTruthy();
  });

  it('floats the incoming panel in once the sink reports done', () => {
    const { rerender, queryByTestId } = renderStack();
    rerender(
      <SettingsPanelStack
        panelRegistry={registry}
        stack={menuThenAccounts}
        onNavigate={jest.fn()}
        onBack={jest.fn()}
        animating
        slideDirection="in"
      />
    );

    finishSink();

    expect(queryByTestId('panel-accounts')).toBeTruthy();
    expect(queryByTestId('panel-security')).toBeNull();
  });
});

describe('SettingsPanelStack pop', () => {
  it('shows only the sinking panel until the sheet shortens the stack', () => {
    const { rerender, queryByTestId } = renderStack({ stack: menuThenAccounts });
    finishSink();
    expect(queryByTestId('panel-accounts')).toBeTruthy();

    // The sheet sinks the top across its own window before popping.
    rerender(
      <SettingsPanelStack
        panelRegistry={registry}
        stack={menuThenAccounts}
        onNavigate={jest.fn()}
        onBack={jest.fn()}
        animating
        slideDirection="out"
      />
    );
    expect(queryByTestId('panel-accounts')).toBeTruthy();
    expect(queryByTestId('panel-security')).toBeNull();

    rerender(
      <SettingsPanelStack
        panelRegistry={registry}
        stack={menu}
        onNavigate={jest.fn()}
        onBack={jest.fn()}
        animating={false}
        slideDirection="idle"
      />
    );
    expect(queryByTestId('panel-security')).toBeTruthy();
    expect(queryByTestId('panel-accounts')).toBeNull();
  });
});

describe('SettingsPanelStack reduce motion', () => {
  it('cuts straight to the incoming panel with no empty beat', () => {
    mockReduceMotion = true;
    const { rerender, queryByTestId } = renderStack();

    rerender(
      <SettingsPanelStack
        panelRegistry={registry}
        stack={menuThenAccounts}
        onNavigate={jest.fn()}
        onBack={jest.fn()}
        animating
        slideDirection="in"
      />
    );

    expect(queryByTestId('panel-accounts')).toBeTruthy();
    expect(queryByTestId('panel-security')).toBeNull();
  });
});
