/**
 * Activity (CORE 08) — what the screen owns.
 *
 * The row's own drawing is pinned by `TransactionItem`'s suite; this one is
 * about the screen: the filters are client-side over the loaded pages, the
 * empty state tells the truth about which of the two emptinesses it is, a row
 * opens the detail as a sheet over the screen rather than navigating, and the
 * list keeps its pagination, refresh and error paths.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockRouter = { back: jest.fn(), push: jest.fn() };

const mockTransactionsState = {
  transactions: [] as unknown[],
  loading: false,
  loadingMore: false,
  refreshing: false,
  error: null as unknown,
  hasMore: true,
  loadMore: jest.fn(),
  refresh: jest.fn(),
};

const mockAccountState = {
  ready: true,
  locked: false,
  networkId: 'solana-mainnet',
  activeBlockchainAccount: { getReceiveAddress: () => 'MyOwnAddress1111111111111111111111111111111' },
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
      t: (key: string, fallback?: string) => (resolve(key) as string) ?? fallback ?? key,
    }),
  };
});

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../test-utils/themeTokens'),
  // The components barrel is imported whole, so a handful of exports that
  // have nothing to do with this screen still have to exist.
  ...jest.requireActual('../../../../packages/shared/src/motion/crest'),
  useAccountsContext: () => [mockAccountState, {}],
  useBalance: () => ({ hiddenBalance: false, toggleHidden: jest.fn() }),
  useSendContacts: () => ({ contacts: [], ownWallets: [], isLoading: false }),
  useTransactions: () => mockTransactionsState,
  ContentLoader: () => null,
  Rect: () => null,
}));

jest.mock('../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ scrollBottomPadding: 0, floatingBottomOffset: 0 }),
}));

jest.mock('../../src/contexts/DeveloperModeContext', () => ({
  useDeveloperMode: () => false,
}));

/** The row is its own suite's subject; here it only needs an id and a press. */
jest.mock('../../src/components/Activity/TransactionItem', () => {
  const ReactActual = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    TransactionItem: ({
      transaction,
      onPress,
    }: {
      transaction: { id: string };
      onPress?: (tx: { id: string }) => void;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        { testID: `activity-tx-row-${transaction.id}`, onPress: () => onPress?.(transaction) },
        ReactActual.createElement(Text, null, transaction.id)
      ),
  };
});

jest.mock('../../src/components/TransactionDetail', () => {
  const ReactActual = require('react');
  const { Text } = require('react-native');
  return {
    TransactionDetail: ({ transaction }: { transaction: { id: string } }) =>
      ReactActual.createElement(Text, { testID: 'activity-detail' }, transaction.id),
  };
});

jest.mock('../../src/components/BottomSheetContainer', () => {
  const ReactActual = require('react');
  return {
    BottomSheetContainer: ({
      visible,
      children,
      testID,
    }: {
      visible: boolean;
      children?: React.ReactNode;
      testID?: string;
    }) =>
      visible
        ? ReactActual.createElement(ReactActual.Fragment, { key: testID }, children)
        : null,
  };
});

jest.mock('../../src/components/DepthBackground', () => ({ DepthBackground: () => null }));
jest.mock('../../src/components/ScalesBackground', () => ({ ScalesBackground: () => null }));

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

import ActivityScreen from '../../app/(app)/activity';
import { groupByDay, matchesFilter } from '../../src/components/Activity/activityRows';

const NOW_SECONDS = Date.now() / 1000;

const TRANSACTIONS = [
  { id: 'tx-send', type: 'send', status: 'completed', timestamp: NOW_SECONDS, inputs: [], outputs: [] },
  { id: 'tx-receive', type: 'receive', status: 'completed', timestamp: NOW_SECONDS, inputs: [], outputs: [] },
  { id: 'tx-swap', type: 'swap', status: 'completed', timestamp: 1, inputs: [], outputs: [] },
];

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockTransactionsState, {
    transactions: TRANSACTIONS,
    loading: false,
    loadingMore: false,
    refreshing: false,
    error: null,
    hasMore: true,
  });
  mockAccountState.locked = false;
});

describe('matchesFilter', () => {
  it('lets everything through on ALL', () => {
    for (const type of ['send', 'receive', 'swap', 'stake', 'whatever-is-next']) {
      expect(matchesFilter(type, 'all')).toBe(true);
    }
  });

  it('matches SEND and RECEIVE by type', () => {
    expect(matchesFilter('send', 'send')).toBe(true);
    expect(matchesFilter('receive', 'send')).toBe(false);
    expect(matchesFilter('receive', 'receive')).toBe(true);
  });

  it('defines OTHER by exclusion, so a type this build has never seen lands in it', () => {
    expect(matchesFilter('swap', 'other')).toBe(true);
    expect(matchesFilter('stake', 'other')).toBe(true);
    expect(matchesFilter('whatever-is-next', 'other')).toBe(true);
    expect(matchesFilter('send', 'other')).toBe(false);
    expect(matchesFilter('receive', 'other')).toBe(false);
  });
});

describe('groupByDay', () => {
  it('opens a run per day and never repeats a label', () => {
    const rows = groupByDay(TRANSACTIONS as never);
    const labels = rows.filter((row) => row.kind === 'header').map((row) => row.key);
    expect(labels).toEqual(['activity-group-today', 'activity-group-earlier']);
  });

  it('returns nothing at all for an empty list', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('Activity screen', () => {
  it('draws the list under the screen header, with the filter chips', () => {
    render(<ActivityScreen />);

    expect(screen.getByTestId('activity-screen')).toBeTruthy();
    expect(screen.getByTestId('activity-list')).toBeTruthy();
    expect(screen.getByTestId('activity-filters')).toBeTruthy();
    expect(screen.getByTestId('activity-tx-row-tx-send')).toBeTruthy();
  });

  it('filters the loaded rows client-side, without asking the indexer again', () => {
    render(<ActivityScreen />);

    fireEvent.press(screen.getByTestId('activity-filters-send'));

    expect(screen.getByTestId('activity-tx-row-tx-send')).toBeTruthy();
    expect(screen.queryByTestId('activity-tx-row-tx-receive')).toBeNull();
    expect(screen.queryByTestId('activity-tx-row-tx-swap')).toBeNull();
    // No refetch: the pages are already here.
    expect(mockTransactionsState.refresh).not.toHaveBeenCalled();
    expect(mockTransactionsState.loadMore).not.toHaveBeenCalled();
  });

  it('puts everything that is neither send nor receive under OTHER', () => {
    render(<ActivityScreen />);

    fireEvent.press(screen.getByTestId('activity-filters-other'));

    expect(screen.getByTestId('activity-tx-row-tx-swap')).toBeTruthy();
    expect(screen.queryByTestId('activity-tx-row-tx-send')).toBeNull();
  });

  it('says the filter is empty, not the wallet, when a filter matches nothing', () => {
    mockTransactionsState.transactions = [TRANSACTIONS[0]];
    render(<ActivityScreen />);

    fireEvent.press(screen.getByTestId('activity-filters-receive'));

    expect(screen.getByTestId('activity-empty')).toBeTruthy();
    expect(screen.getByText('No transactions match this filter')).toBeTruthy();
  });

  it('keeps the wallet-is-empty copy when nothing is filtered out', () => {
    mockTransactionsState.transactions = [];
    render(<ActivityScreen />);

    expect(screen.getByText('Your transaction history will appear here')).toBeTruthy();
  });

  it('opens the detail as a sheet over the screen, not a route', () => {
    render(<ActivityScreen />);

    expect(screen.queryByTestId('activity-detail')).toBeNull();

    fireEvent.press(screen.getByTestId('activity-tx-row-tx-swap'));

    expect(screen.getByTestId('activity-detail').props.children).toBe('tx-swap');
    // The list is still mounted underneath: the sheet covers it, the router
    // never moved.
    expect(screen.getByTestId('activity-list')).toBeTruthy();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('offers a retry that refreshes when the load failed', () => {
    mockTransactionsState.error = new Error('boom');
    render(<ActivityScreen />);

    expect(screen.queryByTestId('activity-list')).toBeNull();
    fireEvent.press(screen.getByTestId('activity-retry-button'));
    expect(mockTransactionsState.refresh).toHaveBeenCalled();
  });

  it('pulls to refresh and pages on end reached', () => {
    render(<ActivityScreen />);

    const list = screen.getByTestId('activity-list');
    list.props.refreshControl.props.onRefresh();
    expect(mockTransactionsState.refresh).toHaveBeenCalled();

    fireEvent(list, 'endReached');
    expect(mockTransactionsState.loadMore).toHaveBeenCalled();
  });

  it('does not self-close on lock — the lock overlay now mounts above the whole `(app)` stack and covers this screen directly', () => {
    mockAccountState.locked = true;
    render(<ActivityScreen />);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
