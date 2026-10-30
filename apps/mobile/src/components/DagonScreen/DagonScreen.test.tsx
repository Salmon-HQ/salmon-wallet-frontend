/**
 * The mobile surface renders what the shared hook composes, in the order
 * FR-020 fixes: the devnet notice, the balances cards, the actions, the
 * "In progress" card. The notice shows in every state.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import en from '@salmon/shared/src/powerups/dagon/locales/en.json';
import es from '@salmon/shared/src/powerups/dagon/locales/es.json';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  ...jest.requireActual('@salmon/shared/src/types/ui/card'),
  ...jest.requireActual('@salmon/shared/src/types/ui/key-value-row'),
  ...jest.requireActual('@salmon/shared/src/types/ui/pill'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
  ...jest.requireActual('@salmon/shared/src/hooks/useFieldFocus'),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-native-reanimated', () => {
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: { View: RNView, createAnimatedComponent: (component: unknown) => component },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
    Easing: { bezier: (...coefficients: number[]) => coefficients },
  };
});
jest.mock('../BottomSheetContainer', () => {
  const ReactActual = require('react');
  const { View, Text } = require('react-native');
  return {
    BottomSheetContainer: ({
      visible,
      title,
      children,
      testID,
    }: {
      visible: boolean;
      title?: React.ReactNode;
      children: React.ReactNode;
      testID?: string;
    }) => (visible ? ReactActual.createElement(View, { testID }, title, children) : null),
    SheetTitle: ({ children }: { children: string }) =>
      ReactActual.createElement(Text, null, children),
  };
});
jest.mock('../TokenPickerSheet', () => ({
  TokenPickerSheet: ({ visible, testID }: { visible: boolean; testID?: string }) => {
    const { View } = require('react-native');
    return visible ? <View testID={`${testID}-open`} /> : null;
  },
}));
jest.mock('../SkeletonRow', () => ({
  SkeletonRow: ({ testID }: { testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID} />;
  },
}));
jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ actionRowBottomPadding: 0, spaciousContentBottomPadding: 0 }),
}));
jest.mock('../../../hooks/useKeyboardHeight', () => ({ useKeyboardLift: () => ({}) }));
jest.mock('../../icons', () => ({ CaretRightIcon: () => null, iconSize: { md: 16 } }));
jest.mock('../WarningNotice', () => ({
  WarningNotice: ({
    title,
    children,
    testID,
  }: {
    title: string;
    children?: string;
    testID?: string;
  }) => {
    const { Text, View } = require('react-native');
    return (
      <View testID={testID}>
        <Text>{title}</Text>
        {children ? <Text>{children}</Text> : null}
      </View>
    );
  },
}));

const fresh = () => ({
  notice: { title: 'dagon.notice.title', body: 'dagon.notice.body' },
  status: 'ready' as 'loading' | 'unavailable' | 'ready',
  unavailable: {
    title: 'dagon.unavailable.title',
    body: 'dagon.unavailable.body',
    retryLabel: 'dagon.unavailable.retry',
    onRetry: jest.fn(),
  },
  activate: null as null | { label: string; body: string; onPress: jest.Mock; loading: boolean },
  cards: [] as unknown[],
  actions: [] as { key: string; label: string; onPress: jest.Mock }[],
  faucet: null as null | { label: string; url: string },
  progress: {
    title: 'dagon.progress.title',
    empty: 'dagon.progress.empty',
    items: [] as unknown[],
  },
  error: null as string | null,
  sheet: {
    visible: false,
    onClose: jest.fn(),
    mode: null,
    title: '',
    amountLabel: 'dagon.sheet.amount',
    amount: '',
    onChangeAmount: jest.fn(),
    shortcuts: { options: [], value: '', onChange: jest.fn() },
    tokenLabel: 'dagon.sheet.token',
    token: {
      side: 'USDC',
      name: 'dagon.tokens.USDC',
      hint: 'dagon.sheet.changeToken',
      onPress: jest.fn(),
    },
    picker: { visible: false, tokens: [], onSelectToken: jest.fn(), onClose: jest.fn() },
    recipient: null,
    facts: [],
    warning: null as string | null,
    submit: { label: 'dagon.sheet.continue', onPress: jest.fn(), disabled: true, loading: false },
    error: null,
  },
});

let mockLogic = fresh();
jest.mock('@salmon/shared/powerups', () => ({
  useDagonScreenLogic: () => mockLogic,
}));

import { DagonScreen } from './DagonScreen';

const card = (side: string, disabled = false) => ({
  side,
  title: `dagon.tokens.${side}`,
  rows: [
    { key: 'public', label: 'dagon.card.public', value: '1000.00' },
    { key: 'hidden', label: 'dagon.card.hidden', value: 'dagon.card.notRevealed' },
  ],
  reveal: { label: 'dagon.card.reveal', onPress: jest.fn(), disabled },
});

const activated = () => {
  mockLogic.cards = [card('USDC'), card('DOGE')];
  mockLogic.actions = [
    { key: 'hide', label: 'dagon.actions.hide', onPress: jest.fn() },
    { key: 'swap', label: 'dagon.actions.swap', onPress: jest.fn() },
  ];
};

beforeEach(() => {
  mockLogic = fresh();
});

const renderScreen = () => render(<DagonScreen publicKey="Pk" networkId="solana-devnet" />);

describe('DagonScreen', () => {
  it('shows the notice and only Activate on a first visit (FR-021)', () => {
    mockLogic.activate = {
      label: 'dagon.activate.label',
      body: 'dagon.activate.body',
      onPress: jest.fn(),
      loading: false,
    };
    renderScreen();
    expect(screen.getByTestId('dagon-notice')).toBeTruthy();
    fireEvent.press(screen.getByTestId('dagon-activate'));
    expect(mockLogic.activate.onPress).toHaveBeenCalled();
    expect(screen.queryByTestId('dagon-card-USDC')).toBeNull();
    expect(screen.queryByTestId('dagon-action-hide')).toBeNull();
  });

  it.each(['loading', 'unavailable', 'ready'] as const)(
    'keeps the devnet notice in the %s state (FR-020)',
    (status) => {
      mockLogic.status = status;
      if (status === 'ready') activated();
      renderScreen();
      expect(screen.getByText('dagon.notice.title')).toBeTruthy();
      expect(screen.getByText('dagon.notice.body')).toBeTruthy();
    }
  );

  it('shows the skeleton while loading and the retry when unavailable', () => {
    mockLogic.status = 'loading';
    const loading = renderScreen();
    expect(screen.getByTestId('dagon-loading')).toBeTruthy();
    loading.unmount();
    mockLogic.status = 'unavailable';
    renderScreen();
    fireEvent.press(screen.getByText('dagon.unavailable.retry'));
    expect(mockLogic.unavailable.onRetry).toHaveBeenCalled();
  });

  it('draws the cards, the actions and In progress, in that order (FR-020)', () => {
    activated();
    mockLogic.progress.items = [
      {
        id: 'op',
        title: 'Hide 10.00 Mock USDC',
        stateLabel: 'dagon.progress.processing',
        tone: 'accent',
      },
    ];
    renderScreen();
    expect(screen.getAllByText('dagon.card.notRevealed')).toHaveLength(2);
    expect(screen.getAllByText('1000.00')).toHaveLength(2);
    expect(screen.getByText('dagon.progress.processing')).toBeTruthy();
    const order = [
      'dagon-notice',
      'dagon-card-USDC',
      'dagon-card-DOGE',
      'dagon-actions',
      'dagon-progress',
    ];
    const json = JSON.stringify(screen.toJSON());
    const positions = order.map((id) => json.indexOf(`"testID":"${id}"`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('renders only the actions the hook offers: no Send or Withdraw with the switches off', () => {
    activated();
    renderScreen();
    expect(screen.getByTestId('dagon-action-hide')).toBeTruthy();
    expect(screen.getByTestId('dagon-action-swap')).toBeTruthy();
    expect(screen.queryByTestId('dagon-action-send')).toBeNull();
    expect(screen.queryByTestId('dagon-action-withdraw')).toBeNull();
    fireEvent.press(screen.getByTestId('dagon-action-swap'));
    expect(mockLogic.actions[1].onPress).toHaveBeenCalled();
  });

  it('disables Reveal while one is in flight', () => {
    activated();
    mockLogic.cards = [card('USDC', true), card('DOGE', true)];
    renderScreen();
    const reveal = screen.getByTestId('dagon-reveal-USDC');
    expect(reveal.props.accessibilityState?.disabled).toBe(true);
  });

  it('offers Get test tokens only with a faucet URL (FR-011)', () => {
    activated();
    const without = renderScreen();
    expect(screen.queryByTestId('dagon-faucet')).toBeNull();
    without.unmount();
    mockLogic.faucet = { label: 'dagon.actions.faucet', url: 'https://faucet.example.com' };
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderScreen();
    fireEvent.press(screen.getByTestId('dagon-faucet'));
    expect(open).toHaveBeenCalledWith('https://faucet.example.com');
  });

  it('draws the sheet from the runbook blocks when an action is open', () => {
    activated();
    mockLogic.sheet = {
      ...mockLogic.sheet,
      visible: true,
      title: 'dagon.sheet.hide',
      warning: 'dagon.warnings.publicAmount',
      submit: { ...mockLogic.sheet.submit, disabled: false },
    };
    renderScreen();
    expect(screen.getByText('dagon.sheet.hide')).toBeTruthy();
    expect(screen.getByTestId('dagon-sheet-amount')).toBeTruthy();
    expect(screen.getByText('dagon.warnings.publicAmount')).toBeTruthy();
    fireEvent.press(screen.getByTestId('dagon-sheet-token'));
    expect(mockLogic.sheet.token.onPress).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('dagon-sheet-submit'));
    expect(mockLogic.sheet.submit.onPress).toHaveBeenCalled();
  });

  // FR-005, SC-002: the owner's rule, checked on both locales.
  it('never says "private" in either language', () => {
    const strings = (node: unknown): string[] =>
      typeof node === 'string'
        ? [node]
        : Object.values(node as Record<string, unknown>).flatMap(strings);
    for (const text of [...strings(en), ...strings(es)]) {
      expect(text).not.toMatch(/privad|privacidad|private/i);
    }
  });
});
