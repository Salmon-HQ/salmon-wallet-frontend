/**
 * @vitest-environment jsdom
 *
 * The chain selector's own contract: what it shows in place of "Total
 * balance" (one tab per chain, each reading its own `NETWORK_DISPLAY` name)
 * and what picking a tab reports back. `BalanceHeader.test.tsx` mocks this
 * component out entirely, so its behaviour is asserted here instead.
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { semantic, type BlockchainBalance } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { ChainSelector } from './ChainSelector';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('reduced-motion') ? reduced : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

const SOLANA: BlockchainBalance = {
  network: { id: 'solana-mainnet', name: 'Solana', blockchain: 'solana' },
  usdTotal: 1,
};
const BITCOIN: BlockchainBalance = {
  network: { id: 'bitcoin-mainnet', name: 'Bitcoin', blockchain: 'bitcoin' },
  usdTotal: 1,
};
const SOLANA_DEVNET: BlockchainBalance = {
  network: { id: 'solana-devnet', name: 'Solana', blockchain: 'solana' },
  usdTotal: undefined,
};

const render = (node: React.ReactNode) => renderInMode('dark', node);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ChainSelector', () => {
  it('renders nothing for a single mainnet chain — nothing to say, nothing to switch to', () => {
    stubMatchMedia(false);
    render(<ChainSelector blockchains={[SOLANA]} activeIndex={0} onSelect={vi.fn()} />);
    expect(screen.queryByText('Solana')).toBeNull();
  });

  it('names the environment on a single non-mainnet chain', () => {
    stubMatchMedia(false);
    render(<ChainSelector blockchains={[SOLANA_DEVNET]} activeIndex={0} onSelect={vi.fn()} />);
    expect(screen.getByText('Solana Devnet')).toBeTruthy();
  });

  it('labels every tab with the chain name alone on mainnet', () => {
    stubMatchMedia(false);
    render(<ChainSelector blockchains={[SOLANA, BITCOIN]} activeIndex={0} onSelect={vi.fn()} />);
    expect(screen.getByText('Solana')).toBeTruthy();
    expect(screen.getByText('Bitcoin')).toBeTruthy();
  });

  it('reports the tapped tab', () => {
    stubMatchMedia(false);
    const onSelect = vi.fn();
    render(
      <ChainSelector
        blockchains={[SOLANA, BITCOIN]}
        activeIndex={0}
        onSelect={onSelect}
        testID="balance-chain-selector"
      />
    );

    fireEvent.click(screen.getByTestId('balance-chain-selector-option-bitcoin-mainnet'));

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('does not report a tap on the chain already active', () => {
    stubMatchMedia(false);
    const onSelect = vi.fn();
    render(
      <ChainSelector
        blockchains={[SOLANA, BITCOIN]}
        activeIndex={0}
        onSelect={onSelect}
        testID="balance-chain-selector"
      />
    );

    fireEvent.click(screen.getByTestId('balance-chain-selector-option-solana-mainnet'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('takes the underline colour from the active chain, not the shared accent', () => {
    stubMatchMedia(false);
    const { container } = render(
      <ChainSelector
        blockchains={[BITCOIN, SOLANA]}
        activeIndex={0}
        onSelect={vi.fn()}
        testID="balance-chain-selector"
      />
    );
    // jsdom normalizes an inline `background-color` to `rgb(...)`, so the
    // expected hex is normalized through the same DOM API before comparing.
    const probe = document.createElement('div');
    probe.style.backgroundColor = semantic.chain.hintInk.bitcoin;
    expect(container.innerHTML).toContain(probe.style.backgroundColor);
  });
});
