/**
 * The sheet's contract with Home: it shows what the scan found, everything
 * taken to begin with, and hands back exactly the paths still taken — or
 * nothing at all when the user says "Not now". A rescan that found nothing is
 * a real state and says so instead of showing an empty list.
 *
 * No derivation index is drawn: the sheet names the wallets by the names they
 * would get.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
  getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
  getShortAddress: (value: string) => `${value.slice(0, 4)}…${value.slice(-4)}`,
  useAccountsContext: () => [{ accounts: [{ id: 'w1' }] }],
}));

jest.mock('react-i18next', () => {
  const dictionary = require('../../../../../packages/shared/src/locales/en/translation.json');
  const resolve = (key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as never)?.[part], dictionary);
  return {
    useTranslation: () => ({
      t: (key: string, options?: { count?: number } & Record<string, unknown>) => {
        const plural =
          options?.count !== undefined
            ? resolve(`${key}_${options.count === 1 ? 'one' : 'other'}`)
            : undefined;
        const value = plural ?? resolve(key);
        return typeof value === 'string'
          ? value.replace(/{{(\w+)}}/g, (_match, name: string) => String(options?.[name] ?? ''))
          : key;
      },
    }),
  };
});

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
    useSharedValue: (initial: unknown) => ReactActual.useRef({ value: initial }).current,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
    withSpring: (target: unknown) => target,
    runOnJS: (fn: unknown) => fn,
    Easing: { bezier: (...coefficients: number[]) => coefficients },
  };
});

// The container's own suite covers the handle, the backdrop and the exit; here
// it only has to put its children on screen.
jest.mock('../BottomSheetContainer', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    BottomSheetContainer: ({
      visible,
      children,
      title,
      testID,
    }: {
      visible: boolean;
      children: React.ReactNode;
      title: React.ReactNode;
      testID?: string;
    }) => (visible ? ReactActual.createElement(View, { testID }, title, children) : null),
    SheetTitle: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, { testID: 'sheet-title' }, children),
  };
});

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ standardContentBottomPadding: 0 }),
}));

jest.mock('../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

jest.mock('../FleshBackground', () => ({ FleshBackground: () => null }));
jest.mock('../PressSpecular', () => ({ PressSpecular: () => null, SPECULAR_OPACITY: 0.12 }));

import { DerivedAccountsSheet } from './DerivedAccountsSheet';

const FINDS = [
  { index: 2, address: 'BBBBbbbbBBBBbbbbBBBB', balanceFormatted: '0.5000 SOL' },
  { index: 5, address: 'CCCCccccCCCCccccCCCC', balanceFormatted: '1.2000 SOL' },
];

describe('DerivedAccountsSheet', () => {
  it('offers every find taken, and imports the ones still taken', () => {
    const onImport = jest.fn();
    render(
      <DerivedAccountsSheet visible finds={FINDS} onImport={onImport} onDismiss={jest.fn()} />
    );

    // The names the wallets would get, not their paths.
    expect(screen.getByTestId('derived-accounts-sheet-row-2').props.accessibilityLabel).toContain(
      'Account 2'
    );

    fireEvent.press(screen.getByTestId('derived-accounts-sheet-row-5'));
    fireEvent.press(screen.getByTestId('derived-accounts-sheet-import'));

    expect(onImport).toHaveBeenCalledWith([2]);
  });

  it('imports everything when nothing was unchecked', () => {
    const onImport = jest.fn();
    render(
      <DerivedAccountsSheet visible finds={FINDS} onImport={onImport} onDismiss={jest.fn()} />
    );

    fireEvent.press(screen.getByTestId('derived-accounts-sheet-import'));

    expect(onImport).toHaveBeenCalledWith([2, 5]);
  });

  it('"Not now" answers without importing anything', () => {
    const onImport = jest.fn();
    const onDismiss = jest.fn();
    render(
      <DerivedAccountsSheet visible finds={FINDS} onImport={onImport} onDismiss={onDismiss} />
    );

    fireEvent.press(screen.getByTestId('derived-accounts-sheet-dismiss'));

    expect(onDismiss).toHaveBeenCalled();
    expect(onImport).not.toHaveBeenCalled();
  });

  it('says so when a rescan found nothing', () => {
    render(<DerivedAccountsSheet visible finds={[]} onImport={jest.fn()} onDismiss={jest.fn()} />);

    expect(screen.getByTestId('derived-accounts-sheet-empty')).toBeTruthy();
    expect(screen.queryByTestId('derived-accounts-sheet-import')).toBeNull();
  });

  it('never draws a derivation index', () => {
    const { toJSON } = render(
      <DerivedAccountsSheet visible finds={FINDS} onImport={jest.fn()} onDismiss={jest.fn()} />
    );

    const drawn = JSON.stringify(toJSON());
    expect(drawn).not.toContain('m/44');
    expect(drawn).not.toContain('· 5');
  });
});
