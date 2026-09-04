/**
 * The chain selector's own contract: what it shows in place of "Total
 * balance" (one tab per chain, each reading its own `NETWORK_DISPLAY` name)
 * and what picking a tab reports back. `BalanceHeader.test.tsx` mocks this
 * component out entirely, so its behaviour is asserted here instead.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
  // Real derivation, not a stub: it is what each tab's label is built on.
  getChainSelectorTabs: jest.requireActual('@salmon/shared/src/utils/network').getChainSelectorTabs,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

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
    useSharedValue: (initial: unknown) => {
      const ref = ReactActual.useRef({ value: initial });
      return ref.current;
    },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
    interpolateColor: (value: number, _input: number[], output: string[]) =>
      value >= 1 ? output[1] : output[0],
    Easing: { bezier: (...coefficients: number[]) => coefficients },
  };
});

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
    expect(view.queryByText('Solana')).toBeNull();
  });

  it('names the environment on a single non-mainnet chain', () => {
    const view = render(
      <ChainSelector blockchains={[SOLANA_DEVNET] as any} activeIndex={0} onSelect={jest.fn()} />
    );
    expect(view.getByText('Solana Devnet')).toBeTruthy();
  });

  it('labels every tab with the chain name alone on mainnet', () => {
    const view = render(
      <ChainSelector blockchains={[SOLANA, BITCOIN] as any} activeIndex={0} onSelect={jest.fn()} />
    );
    expect(view.getByText('Solana')).toBeTruthy();
    expect(view.getByText('Bitcoin')).toBeTruthy();
  });

  it('reports the tapped tab', () => {
    const onSelect = jest.fn();
    const view = render(
      <ChainSelector
        blockchains={[SOLANA, BITCOIN] as any}
        activeIndex={0}
        onSelect={onSelect}
        testID="balance-chain-selector"
      />
    );

    fireEvent.press(view.getByTestId('balance-chain-selector-option-bitcoin-mainnet'));

    expect(onSelect).toHaveBeenCalledWith(1);
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

    fireEvent.press(view.getByTestId('balance-chain-selector-option-solana-mainnet'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('takes the underline colour from the active chain, not the shared accent', () => {
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
