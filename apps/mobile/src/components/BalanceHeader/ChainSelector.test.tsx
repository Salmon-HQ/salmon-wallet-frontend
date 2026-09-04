/**
 * The chain selector's own contract: what it shows in place of "Total
 * balance" (trigger label, chevron, environment tag) and what selecting a
 * row in its sheet reports back. `BalanceHeader.test.tsx` mocks this
 * component out entirely, so its behaviour is asserted here instead.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
  // Real derivations, not stubs: they are what the trigger label and the
  // sheet's rows are built on.
  getChainSelectorTrigger: jest.requireActual('@salmon/shared/src/utils/network')
    .getChainSelectorTrigger,
  getChainSelectorOptions: jest.requireActual('@salmon/shared/src/utils/network')
    .getChainSelectorOptions,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

// The container's own suite covers the handle, the backdrop and the exit;
// here it only has to put its children on screen when visible.
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
  useBottomSheetChrome: () => ({ compactContentBottomPadding: 0 }),
}));

import { semantic } from '@salmon/shared';
import { ChainSelector } from './ChainSelector';

const SOLANA = { network: { id: 'solana-mainnet', name: 'Solana', blockchain: 'solana' } };
const BITCOIN = { network: { id: 'bitcoin-mainnet', name: 'Bitcoin', blockchain: 'bitcoin' } };
const SOLANA_DEVNET = {
  network: { id: 'solana-devnet', name: 'Solana', blockchain: 'solana' },
};

describe('ChainSelector', () => {
  it('renders nothing for a single mainnet chain — nothing to say, nothing to switch to', () => {
    const view = render(
      <ChainSelector blockchains={[SOLANA] as any} activeIndex={0} onSelect={jest.fn()} />
    );
    expect(view.queryByTestId('balance-chain-selector')).toBeNull();
    expect(view.queryByText('Solana')).toBeNull();
  });

  it('names the environment on a single non-mainnet chain, with no chevron to press', () => {
    const view = render(
      <ChainSelector blockchains={[SOLANA_DEVNET] as any} activeIndex={0} onSelect={jest.fn()} />
    );
    expect(view.getByText('Solana · Devnet')).toBeTruthy();
    expect(view.queryByTestId('balance-chain-selector')).toBeNull();
  });

  it('labels the trigger with the chain name alone on mainnet', () => {
    const view = render(
      <ChainSelector blockchains={[SOLANA, BITCOIN] as any} activeIndex={0} onSelect={jest.fn()} />
    );
    expect(view.getByText('Solana')).toBeTruthy();
  });

  it('opens the sheet and reports the tapped option, closing after', () => {
    const onSelect = jest.fn();
    const view = render(
      <ChainSelector
        blockchains={[SOLANA, BITCOIN] as any}
        activeIndex={0}
        onSelect={onSelect}
        testID="balance-chain-selector"
      />
    );

    fireEvent.press(view.getByTestId('balance-chain-selector'));
    fireEvent.press(view.getByTestId('balance-chain-selector-option-1'));

    expect(onSelect).toHaveBeenCalledWith(1);
    expect(view.queryByTestId('balance-chain-selector-sheet')).toBeNull();
  });

  it('does not report a tap on the chain already active', () => {
    const onSelect = jest.fn();
    const view = render(
      <ChainSelector
        blockchains={[SOLANA, BITCOIN] as any}
        activeIndex={0}
        onSelect={onSelect}
        testID="balance-chain-selector"
      />
    );

    fireEvent.press(view.getByTestId('balance-chain-selector'));
    fireEvent.press(view.getByTestId('balance-chain-selector-option-0'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('takes the underline colour from the chain hue tokens, never a literal', () => {
    const view = render(
      <ChainSelector
        blockchains={[BITCOIN, SOLANA] as any}
        activeIndex={0}
        onSelect={jest.fn()}
        testID="balance-chain-selector"
      />
    );
    const flat = JSON.stringify(view.toJSON());
    expect(flat).toContain(semantic.chain.hintInk.bitcoin);
  });
});
