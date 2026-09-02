/**
 * Wallets — where a derived wallet sits.
 *
 * A derived path is a wallet of its own (spec 025): its own card, its own
 * name, its own place in the total. The only thing that says where it came
 * from is its position — right under the wallet it shares a seed with, stepped
 * in, joined by a descent line, subtitled "Derived from {parent}". That, and
 * the rescan action being offered exactly where there is a seed to scan, is
 * what is pinned here. No index number appears anywhere.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockRouter = { back: jest.fn(), push: jest.fn() };

const mockChangeAccount = jest.fn(async () => {});
const mockChangePathIndex = jest.fn(async () => {});
const mockRescan = jest.fn(async () => {});

const mockDerived: { scanningAccountId: string | null } = { scanningAccountId: null };

const blockchainAccount = (address: string) => ({ getReceiveAddress: () => address });

const seedWallet = {
  id: 'w1',
  name: 'Account 1',
  avatar: '',
  secret: { kind: 'mnemonic', mnemonic: 'twelve words' },
  networksAccounts: {
    'solana-mainnet': [blockchainAccount('AAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa')],
  },
};

// Created from the same phrase at a derived path: its only address sits at
// that position, with holes before it.
const derivedWallet = {
  id: 'w3',
  name: 'Account 3',
  avatar: '',
  derivedFrom: 'w1',
  secret: { kind: 'mnemonic', mnemonic: 'twelve words' },
  networksAccounts: {
    'solana-mainnet': [null, null, blockchainAccount('CCCCccccCCCCccccCCCCccccCCCCccccCCCCcccc')],
  },
};

const watchedWallet = {
  id: 'w2',
  name: 'Watched',
  avatar: '',
  secret: { kind: 'watchOnly', networkId: 'solana-mainnet', address: 'DDDD' },
  networksAccounts: {
    'solana-mainnet': [blockchainAccount('DDDDddddDDDDddddDDDDddddDDDDddddDDDDdddd')],
  },
};

const mockAccountState = {
  ready: true,
  locked: false,
  // Deliberately out of descent order: the screen is what puts a derived
  // wallet under its parent, not the order the accounts happen to be stored in.
  accounts: [seedWallet, watchedWallet, derivedWallet],
  accountId: 'w1',
  pathIndex: 0,
  networkId: 'solana-mainnet',
  activeBlockchainAccount: seedWallet.networksAccounts['solana-mainnet'][0],
};

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('react-i18next', () => {
  const dictionary = require('../../../../packages/shared/src/locales/en/translation.json');
  const resolve = (key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as never)?.[part], dictionary);
  return {
    useTranslation: () => ({
      // Plurals resolve through `_one`/`_other` as i18next does, and a second
      // argument that is an interpolation bag is not a fallback string.
      t: (key: string, second?: unknown, third?: unknown) => {
        const options = (typeof second === 'object' ? second : third) as
          { count?: number } | undefined;
        const plural =
          options?.count !== undefined
            ? resolve(`${key}_${options.count === 1 ? 'one' : 'other'}`)
            : undefined;
        const value = plural ?? resolve(key) ?? (typeof second === 'string' ? second : key);
        return typeof value === 'string'
          ? value.replace(/{{(\w+)}}/g, (_match, name: string) =>
              String((options as Record<string, unknown> | undefined)?.[name] ?? '')
            )
          : key;
      },
    }),
  };
});

jest.mock('@salmon/shared', () => {
  // `account-secret` is pure type-level work, so the real predicates can run;
  // `utils/account` cannot be required here (it reaches @solana/kit, which
  // jest-expo will not transform), so its one helper is stood in for.
  const actualSecret = jest.requireActual('../../../../packages/shared/src/utils/account-secret');
  return {
    ...jest.requireActual('../../test-utils/themeTokens'),
    ...jest.requireActual('../../../../packages/shared/src/motion/crest'),
    getAccountMnemonic: actualSecret.getAccountMnemonic,
    isWatchOnlyAccount: actualSecret.isWatchOnlyAccount,
    getAccountAddress: (account: {
      networksAccounts: Record<string, ({ getReceiveAddress: () => string } | null)[]>;
    }) => Object.values(account.networksAccounts)[0]?.find(Boolean)?.getReceiveAddress() ?? '',
    getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
    getShortAddress: (value: string) => (value ? `${value.slice(0, 4)}…${value.slice(-4)}` : ''),
    useAccountsContext: () => [
      mockAccountState,
      { changeAccount: mockChangeAccount, changePathIndex: mockChangePathIndex },
    ],
    useBalance: () => ({ hiddenBalance: false, toggleHidden: jest.fn() }),
    useCurrencyContext: () => [
      {},
      { formatValue: (value: number | undefined) => `$${value ?? 0}` },
    ],
    useUserConfig: () => ({
      excludedFromTotal: [],
      setIncludedInTotal: jest.fn(),
    }),
    useWalletTotals: () => ({ totals: { w1: 10, w2: 5, w3: 3 } }),
    sumIncludedTotals: () => 18,
    ContentLoader: () => null,
    Rect: () => null,
  };
});

jest.mock('../../src/contexts/DerivedAccountsContext', () => ({
  useDerivedAccounts: () => ({
    scanningAccountId: mockDerived.scanningAccountId,
    rescan: mockRescan,
  }),
}));

jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  const identity = (value: unknown) => value;
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    Easing: {
      bezier: () => identity,
      linear: identity,
      ease: identity,
      in: identity,
      out: identity,
      inOut: identity,
    },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: identity,
    withDelay: (_delay: number, value: unknown) => value,
    withSpring: identity,
    withRepeat: identity,
    interpolateColor: (value: number, _input: number[], output: string[]) =>
      value >= 1 ? output[1] : output[0],
  };
});

jest.mock('../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

jest.mock('../../src/components/FleshBackground', () => ({ FleshBackground: () => null }));
jest.mock('../../src/components/PressSpecular', () => ({
  PressSpecular: () => null,
  SPECULAR_OPACITY: 0.12,
}));

import WalletsScreen from '../../app/(app)/wallets';

beforeEach(() => {
  jest.clearAllMocks();
  mockDerived.scanningAccountId = null;
});

describe('Wallets — wallets of one seed', () => {
  it('puts a derived wallet right after the wallet it came from', () => {
    render(<WalletsScreen />);

    const order = screen.getAllByTestId(/^wallet-card-/).map((node) => node.props.testID as string);
    expect(order).toEqual(['wallet-card-w1', 'wallet-card-w3', 'wallet-card-w2']);
  });

  it('draws the descent and names the wallet it descends from', () => {
    render(<WalletsScreen />);

    expect(screen.getByTestId('wallet-descent-w3')).toBeTruthy();
    expect(screen.getByTestId('wallet-derived-from-w3').props.children).toBe(
      'Derived from Account 1'
    );

    // A wallet nobody derived carries neither.
    expect(screen.queryByTestId('wallet-descent-w1')).toBeNull();
    expect(screen.queryByTestId('wallet-derived-from-w1')).toBeNull();
  });

  it('reads a derived wallet at its own path, not at the hole in front of it', () => {
    render(<WalletsScreen />);

    expect(screen.getByTestId('wallet-balance-w3').props.children.join('')).toBe('$3 · CCCC…cccc');
  });

  it('says nothing about derivation indexes', () => {
    const { toJSON } = render(<WalletsScreen />);

    // "Account 1 · 2" and every other index label is gone: a wallet is read by
    // name, never by its position in a derivation tree.
    expect(JSON.stringify(toJSON())).not.toContain('· 2');
  });

  it('activates a wallet by its card alone', async () => {
    render(<WalletsScreen />);

    fireEvent.press(screen.getByTestId('wallet-card-w3'));

    expect(mockChangeAccount).toHaveBeenCalledWith('w3');
    // The card is the whole wallet now — there is no path index to fall back to.
    expect(mockChangePathIndex).not.toHaveBeenCalled();
  });

  it('offers the rescan only where there is a seed to scan, and stops it while one runs', () => {
    const { rerender } = render(<WalletsScreen />);

    // A watched address has no derivation tree, so no action is offered.
    expect(screen.queryByTestId('wallet-rescan-w2')).toBeNull();

    fireEvent.press(screen.getByTestId('wallet-rescan-w1'));
    expect(mockRescan).toHaveBeenCalledWith('w1');

    mockRescan.mockClear();
    mockDerived.scanningAccountId = 'w1';
    rerender(<WalletsScreen />);
    fireEvent.press(screen.getByTestId('wallet-rescan-w1'));
    expect(mockRescan).not.toHaveBeenCalled();
  });
});
