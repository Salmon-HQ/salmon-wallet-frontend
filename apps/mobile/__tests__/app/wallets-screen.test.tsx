/**
 * Wallets — the descent under a wallet card.
 *
 * The chips that used to sit under a wallet said nothing about where a derived
 * account came from; the rows that replaced them are drawn as descendants and
 * carry the address they activate. What is pinned here is that half: the rows
 * belong to the right parent and arrive in index order, tapping one makes both
 * calls in the order that works, the active one is marked, a scan draws
 * skeletons instead of rows, and the rescan action is present exactly where a
 * seed can be scanned and inert while a scan is running.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockRouter = { back: jest.fn(), push: jest.fn() };

const mockChangeAccount = jest.fn(async () => {});
const mockChangePathIndex = jest.fn(async () => {});
const mockRescan = jest.fn(async () => {});

const mockDerivedStatus: { scanningAccountId: string | null } = { scanningAccountId: null };
const mockHidden: Record<string, number[]> = {};
const mockSetDerivedHidden = jest.fn(async () => {});

const blockchainAccount = (address: string) => ({ getReceiveAddress: () => address });

const seedWallet = {
  id: 'w1',
  name: 'Account 1',
  avatar: '',
  secret: { kind: 'mnemonic', mnemonic: 'twelve words' },
  networksAccounts: {
    'solana-mainnet': [
      blockchainAccount('AAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa'),
      blockchainAccount('BBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbb'),
      blockchainAccount('CCCCccccCCCCccccCCCCccccCCCCccccCCCCcccc'),
    ],
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
  accounts: [seedWallet, watchedWallet],
  accountId: 'w1',
  pathIndex: 1,
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
      networksAccounts: Record<string, { getReceiveAddress: () => string }[]>;
    }) => Object.values(account.networksAccounts)[0]?.[0]?.getReceiveAddress() ?? '',
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
      hiddenDerivedAccounts: mockHidden,
      setDerivedHidden: mockSetDerivedHidden,
    }),
    useWalletTotals: () => ({ totals: { w1: 10, w2: 5 } }),
    sumIncludedTotals: () => 15,
    ContentLoader: () => null,
    Rect: () => null,
  };
});

jest.mock('../../src/contexts/DerivedAccountsContext', () => ({
  useDerivedAccounts: () => ({ status: mockDerivedStatus, rescan: mockRescan }),
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
  mockDerivedStatus.scanningAccountId = null;
  for (const key of Object.keys(mockHidden)) delete mockHidden[key];
});

describe('Wallets — derived accounts', () => {
  it('draws one row per derived account, nested under its own wallet, in index order', () => {
    render(<WalletsScreen />);

    const block = screen.getByTestId('wallet-derived-w1');
    // Index 0 is the card itself, never a row under it.
    expect(screen.queryByTestId('wallet-derived-w1-0')).toBeNull();
    const rows = ['wallet-derived-w1-1', 'wallet-derived-w1-2'];
    for (const id of rows) expect(screen.getByTestId(id)).toBeTruthy();
    // The rows are inside the wallet's own block, not siblings of the card.
    for (const id of rows) expect(screen.getByTestId(id).parent).toBeTruthy();
    expect(block).toBeTruthy();

    // A wallet with a single path index has nothing to descend into.
    expect(screen.queryByTestId('wallet-derived-w2')).toBeNull();
  });

  it('activates a derived account with both calls, in the order that works', async () => {
    render(<WalletsScreen />);

    fireEvent.press(screen.getByTestId('wallet-derived-w1-2'));

    // Same wallet, so only the path index moves; the wallet switch would have
    // to land first if it were another one.
    await waitFor(() => expect(mockChangePathIndex).toHaveBeenCalledWith(2));
    expect(mockChangeAccount).not.toHaveBeenCalled();
  });

  it('marks the derived account the wallet is currently on', () => {
    render(<WalletsScreen />);

    // `pathIndex` is 1 on the active wallet, so that row — and only that row —
    // announces itself as the one in use.
    expect(screen.getByTestId('wallet-derived-w1-1').props.accessibilityLabel).toContain('active');
    expect(screen.getByTestId('wallet-derived-w1-2').props.accessibilityLabel).not.toContain(
      'active'
    );
  });

  it('leaves a hidden derived account out of the rows, behind its own disclosure', () => {
    mockHidden.w1 = [2];
    render(<WalletsScreen />);

    expect(screen.queryByTestId('wallet-derived-w1-2')).toBeNull();

    // Collapsed by default; opening it shows the hidden one with a way back.
    fireEvent.press(screen.getByTestId('wallet-hidden-toggle-w1'));
    expect(screen.getByTestId('wallet-derived-w1-2')).toBeTruthy();

    fireEvent.press(screen.getByTestId('wallet-derived-hide-w1-2'));
    expect(mockSetDerivedHidden).toHaveBeenCalledWith('w1', 2, false);
  });

  it('never offers to hide index 0 — that is the wallet itself', () => {
    render(<WalletsScreen />);

    expect(screen.queryByTestId('wallet-derived-hide-w1-0')).toBeNull();
    expect(screen.getByTestId('wallet-derived-hide-w1-1')).toBeTruthy();
  });

  it('lands on index 0 when the card itself is picked', async () => {
    render(<WalletsScreen />);

    fireEvent.press(screen.getByTestId('wallet-card-w1'));

    await waitFor(() => expect(mockChangePathIndex).toHaveBeenCalledWith(0));
  });

  it('falls back to index 0 before hiding the account in use', async () => {
    render(<WalletsScreen />);

    // `pathIndex` is 1, so hiding row 1 would leave the app standing on
    // something it no longer shows.
    fireEvent.press(screen.getByTestId('wallet-derived-hide-w1-1'));

    await waitFor(() => expect(mockSetDerivedHidden).toHaveBeenCalledWith('w1', 1, true));
    expect(mockChangePathIndex).toHaveBeenCalledWith(0);
    expect(mockChangePathIndex.mock.invocationCallOrder[0]).toBeLessThan(
      mockSetDerivedHidden.mock.invocationCallOrder[0]
    );
  });

  it('draws skeleton rows in place of the descent while that wallet is scanning', () => {
    mockDerivedStatus.scanningAccountId = 'w1';
    render(<WalletsScreen />);

    expect(screen.getByTestId('wallet-derived-skeleton-w1')).toBeTruthy();
    expect(screen.queryByTestId('wallet-derived-w1-1')).toBeNull();
  });

  it('offers the rescan only where there is a seed to scan, and stops it while one runs', () => {
    const { rerender } = render(<WalletsScreen />);

    // A watched address has no derivation tree, so no action is offered.
    expect(screen.queryByTestId('wallet-rescan-w2')).toBeNull();

    fireEvent.press(screen.getByTestId('wallet-rescan-w1'));
    expect(mockRescan).toHaveBeenCalledWith('w1');

    mockRescan.mockClear();
    mockDerivedStatus.scanningAccountId = 'w1';
    rerender(<WalletsScreen />);
    fireEvent.press(screen.getByTestId('wallet-rescan-w1'));
    expect(mockRescan).not.toHaveBeenCalled();
  });
});
