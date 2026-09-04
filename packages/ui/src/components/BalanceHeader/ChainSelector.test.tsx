/**
 * @vitest-environment jsdom
 *
 * The chain selector's own contract: what it shows in place of "Total
 * balance" (trigger label, chevron, environment tag) and what selecting a
 * row in its sheet reports back. `BalanceHeader.test.tsx` mocks this
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

  it('names the environment on a single non-mainnet chain, with no chevron to press', () => {
    stubMatchMedia(false);
    render(<ChainSelector blockchains={[SOLANA_DEVNET]} activeIndex={0} onSelect={vi.fn()} />);
    expect(screen.getByText('Solana · Devnet')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('labels the trigger with the chain name alone on mainnet', () => {
    stubMatchMedia(false);
    render(
      <ChainSelector blockchains={[SOLANA, BITCOIN]} activeIndex={0} onSelect={vi.fn()} />
    );
    expect(screen.getByText('Solana')).toBeTruthy();
  });

  it('opens the sheet and reports the tapped option, closing after', () => {
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

    fireEvent.click(screen.getByTestId('balance-chain-selector'));
    fireEvent.click(screen.getByTestId('balance-chain-selector-option-1'));

    // Closing the sheet is `BottomSheetContainer`'s own animated exit
    // (its suite covers the timing) — here only the selection matters.
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

    fireEvent.click(screen.getByTestId('balance-chain-selector'));
    fireEvent.click(screen.getByTestId('balance-chain-selector-option-0'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('takes the underline colour from the chain hue tokens, never a literal', () => {
    stubMatchMedia(false);
    const { container } = render(
      <ChainSelector blockchains={[BITCOIN, SOLANA]} activeIndex={0} onSelect={vi.fn()} />
    );
    expect(container.innerHTML).toContain(semantic.chain.hintInk.bitcoin);
  });
});
