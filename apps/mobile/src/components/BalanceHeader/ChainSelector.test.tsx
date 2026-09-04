/**
 * The chain selector's own contract: what it shows in place of "Total
 * balance" (trigger label, chevron, environment tag) and what selecting a
 * row in its dropdown reports back. `BalanceHeader.test.tsx` mocks this
 * component out entirely, so its behaviour is asserted here instead.
 *
 * Opening the dropdown reads the trigger's window position via
 * `measureInWindow` on the ref RN attaches to a host component. RN's own
 * jest mock (`react-native/jest/mocks/View.js`) wires every `View`
 * instance's `measureInWindow` to one shared `jest.fn()` from
 * `MockNativeMethods` — giving that a synchronous implementation up front
 * is what lets the dropdown open in this environment at all.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const MockNativeMethods = require('react-native/jest/MockNativeMethods').default as {
  measureInWindow: jest.Mock;
};

MockNativeMethods.measureInWindow.mockImplementation(
  (callback: (x: number, y: number, width: number, height: number) => void) =>
    callback(0, 100, 200, 40)
);

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
  // Real derivations, not stubs: they are what the trigger label and the
  // dropdown's rows are built on.
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
    expect(view.getByText('Solana Devnet')).toBeTruthy();
    expect(view.queryByTestId('balance-chain-selector')).toBeNull();
  });

  it('labels the trigger with the chain name alone on mainnet', () => {
    const view = render(
      <ChainSelector blockchains={[SOLANA, BITCOIN] as any} activeIndex={0} onSelect={jest.fn()} />
    );
    expect(view.getByText('Solana')).toBeTruthy();
  });

  it('opens the dropdown and reports the tapped option, closing after', () => {
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
    expect(view.queryByTestId('balance-chain-selector-dropdown')).toBeNull();
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
