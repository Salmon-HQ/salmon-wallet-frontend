/**
 * The activity sheet's two steps, and the order of events between them.
 *
 * The contract: the row opens the detail *inside* this sheet, not a second
 * sheet on top; back returns to the list; and the list does not speak the
 * sink-and-float on the sheet's own arrival — only when it comes back from
 * the detail (DESIGN.md §Motion: a sheet's content never speaks the verb as
 * the sheet arrives; a step change inside a mounted sheet does).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

let mockReduceMotion = false;
/** Every `entering` prop handed to a step, in render order, by step key. */
const enteringByKey: Array<[string, unknown]> = [];

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-reanimated', () => {
  const RealReact = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ({ children, testID, entering, ...rest }: Record<string, never>) => {
        enteringByKey.push([testID as unknown as string, entering]);
        return RealReact.createElement(View, { testID, ...rest }, children);
      },
    },
    useReducedMotion: () => mockReduceMotion,
  };
});

jest.mock('@salmon/shared', () => ({
  ContentLoader: () => null,
  Rect: () => null,
  colors: {
    accent: { primary: '#FF5C45' },
    background: { tokenItem: '#111' },
    skeleton: { base: '#222', highlight: '#333' },
    text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
  },
  semantic: { accent: { onFill: '#000' } },
  borderRadius: { lg: 16 },
  fontSize: { headline: 20, xl: 18, bodyLg: 16 },
  fontFamilyNative: { medium: 'System', regular: 'System', semiBold: 'System' },
  spacing: { sm: 8, md: 12, lg: 16, base: 12, '2xl': 24, '5.5xl': 64, headerPadding: 20 },
  ms: (v: number) => v,
  s: (v: number) => v,
  vs: (v: number) => v,
}));

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ bottomInset: 0, standardContentBottomPadding: 0 }),
}));

/** The verb's shapes are pinned by their own suite; here they only need identity. */
jest.mock('../../utils/sinkAndFloat', () => ({
  FLOAT_DELAY_MS: 450,
  floatEntering: () => 'float',
  sinkExiting: () => 'sink',
}));

jest.mock('../BottomSheetContainer', () => {
  const RealReact = require('react');
  return {
    BottomSheetContainer: ({
      children,
      headerContent,
    }: {
      children?: React.ReactNode;
      headerContent?: React.ReactNode;
    }) => RealReact.createElement(RealReact.Fragment, null, headerContent, children),
  };
});

jest.mock('../BottomSheetTitleHeader', () => {
  const RealReact = require('react');
  const { Text: RNText, TouchableOpacity: RNTouchable } = require('react-native');
  return {
    BottomSheetTitleHeader: ({ title, onBack }: { title: string; onBack?: () => void }) =>
      RealReact.createElement(
        RealReact.Fragment,
        null,
        RealReact.createElement(RNText, { testID: 'sheet-title' }, title),
        onBack
          ? RealReact.createElement(
              RNTouchable,
              { testID: 'screen-header-back-button', onPress: onBack },
              RealReact.createElement(RNText, null, 'back')
            )
          : null
      ),
  };
});

jest.mock('../TransactionDetail', () => {
  const RealReact = require('react');
  const { Text: RNText } = require('react-native');
  return {
    TransactionDetail: ({ transaction }: { transaction: { id: string } }) =>
      RealReact.createElement(RNText, { testID: 'activity-detail' }, transaction.id),
  };
});

jest.mock('./TransactionItem', () => {
  const RealReact = require('react');
  const { Text: RNText, TouchableOpacity: RNTouchable } = require('react-native');
  return {
    TransactionItem: ({
      transaction,
      onPress,
    }: {
      transaction: { id: string };
      onPress?: (tx: { id: string }) => void;
    }) =>
      RealReact.createElement(
        RNTouchable,
        { testID: `activity-tx-row-${transaction.id}`, onPress: () => onPress?.(transaction) },
        RealReact.createElement(RNText, null, transaction.id)
      ),
  };
});

import { TransactionHistorySheet } from './TransactionHistorySheet';

const TRANSACTIONS = [
  { id: 'tx-1', type: 'swap', status: 'completed', timestamp: 1, inputs: [], outputs: [] },
  { id: 'tx-2', type: 'send', status: 'completed', timestamp: 2, inputs: [], outputs: [] },
] as never;

function renderSheet() {
  return render(
    <TransactionHistorySheet visible onClose={jest.fn()} transactions={TRANSACTIONS} />
  );
}

/** The `entering` last handed to the list step. */
function listEntering(): unknown {
  const entries = enteringByKey.filter(([key]) => key === 'activity-list-step');
  return entries.length ? entries[entries.length - 1][1] : undefined;
}

describe('TransactionHistorySheet — the detail is a step, not a second sheet', () => {
  beforeEach(() => {
    mockReduceMotion = false;
    enteringByKey.length = 0;
  });

  it('names the surface Activity', () => {
    renderSheet();
    expect(screen.getByTestId('sheet-title').props.children).toBe('actions.activity');
  });

  it('opens the detail in place: the list leaves, the detail arrives', () => {
    renderSheet();
    expect(screen.getByTestId('activity-list')).toBeTruthy();
    expect(screen.queryByTestId('activity-detail')).toBeNull();

    fireEvent.press(screen.getByTestId('activity-tx-row-tx-1'));

    expect(screen.getByTestId('activity-detail').props.children).toBe('tx-1');
    expect(screen.queryByTestId('activity-list')).toBeNull();
  });

  it('the header back returns to the list, not out of the sheet', () => {
    const onClose = jest.fn();
    render(<TransactionHistorySheet visible onClose={onClose} transactions={TRANSACTIONS} />);

    // No back affordance while the list is the step: there is nothing behind it.
    expect(screen.queryByTestId('screen-header-back-button')).toBeNull();

    fireEvent.press(screen.getByTestId('activity-tx-row-tx-2'));
    fireEvent.press(screen.getByTestId('screen-header-back-button'));

    expect(screen.getByTestId('activity-list')).toBeTruthy();
    expect(screen.queryByTestId('activity-detail')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not speak the verb as the sheet arrives, but does on the way back', () => {
    renderSheet();
    // First render: the list is simply there — the sheet is the thing arriving.
    expect(listEntering()).toBeUndefined();

    fireEvent.press(screen.getByTestId('activity-tx-row-tx-1'));
    fireEvent.press(screen.getByTestId('screen-header-back-button'));

    // Coming back is a step, and a step floats.
    expect(listEntering()).toBe('float');
  });

  it('reduce motion still swaps the step', () => {
    mockReduceMotion = true;
    renderSheet();

    fireEvent.press(screen.getByTestId('activity-tx-row-tx-1'));

    expect(screen.getByTestId('activity-detail')).toBeTruthy();
    expect(screen.queryByTestId('activity-list')).toBeNull();
  });
});
