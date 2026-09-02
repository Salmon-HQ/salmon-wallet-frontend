/**
 * @vitest-environment jsdom
 *
 * The chain-identity vocabulary of a token row (DESIGN.md, §Chain identity):
 * mainnet Solana is silent, Bitcoin carries its own quiet mark, and anything
 * that is not mainnet keeps the loud text chip. The last one is a fund-safety
 * rule wearing a typographic disguise — a devnet token must never be mistaken
 * for the real thing, so that assertion is the one that must not be deleted.
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The fallback strings carry `{{name}}` / `{{network}}`, so the stub
// interpolates: a label assertion has to see the announced sentence, not the
// template.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: Record<string, unknown>) => {
      const template = fallback ?? key;
      return options
        ? template.replace(/{{(\w+)}}/g, (_match, name: string) => String(options[name] ?? ''))
        : template;
    },
  }),
}));

// useTokenSearch's real implementation debounces/filters async, which would
// make the assertions here order- and timing-dependent. Stub it so the rows
// under test are exactly the tokens the test passes in.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useTokenSearch: (tokens: unknown[]) => ({
    searchQuery: '',
    setSearchQuery: vi.fn(),
    isSearching: false,
    paginatedTokens: tokens,
    hasMore: false,
    loadMore: vi.fn(),
    reset: vi.fn(),
    retry: vi.fn(),
    error: null,
    isError: false,
  }),
}));

import { TokenSelectorModal } from './TokenSelectorModal';
import type { TokenSelectorToken } from './types';

const solMainnet: TokenSelectorToken = {
  mint: 'sol-mint',
  name: 'Solana',
  symbol: 'SOL',
  uiAmount: 12.5,
  network: 'solana-mainnet',
};
const btcMainnet: TokenSelectorToken = {
  mint: 'btc',
  name: 'Bitcoin',
  symbol: 'BTC',
  uiAmount: 0,
  network: 'bitcoin-mainnet',
};
const solDevnet: TokenSelectorToken = {
  mint: 'dev-mint',
  name: 'Dev Token',
  symbol: 'DEV',
  uiAmount: 3,
  network: 'solana-devnet',
};

const renderModal = (props: Partial<React.ComponentProps<typeof TokenSelectorModal>> = {}) =>
  render(
    <TokenSelectorModal
      visible={true}
      onClose={vi.fn()}
      tokens={[solMainnet, btcMainnet, solDevnet]}
      onSelect={vi.fn()}
      showNetworkChip={true}
      {...props}
    />
  );

afterEach(cleanup);

describe('TokenSelectorModal network identity', () => {
  it('keeps Solana mainnet rows silent — no chip, no chain mark', () => {
    renderModal();
    expect(screen.queryByText('SOLANA-MAINNET')).toBeNull();
    expect(screen.queryByTestId('chain-mark-solana')).toBeNull();
  });

  it('marks Bitcoin mainnet with the quiet chain mark instead of a text chip', () => {
    renderModal();
    expect(screen.getByTestId('chain-mark-bitcoin')).toBeTruthy();
    expect(screen.queryByText('BITCOIN-MAINNET')).toBeNull();
  });

  it('keeps the loud text chip for non-mainnet networks so devnet is never mistaken for mainnet', () => {
    renderModal();
    expect(screen.getByText('SOLANA-DEVNET')).toBeTruthy();
  });

  it('treats a bare chain name as mainnet — Bitcoin fallback gets the mark, not a chip', () => {
    renderModal({ tokens: [{ ...btcMainnet, network: 'Bitcoin' }] });
    expect(screen.getByTestId('chain-mark-bitcoin')).toBeTruthy();
    expect(screen.queryByText('BITCOIN')).toBeNull();
  });
});

describe('TokenSelectorModal announced network', () => {
  it('speaks the network of a silent Solana mainnet row', () => {
    renderModal();
    expect(screen.getByLabelText('Select Solana on Solana Mainnet')).toBeTruthy();
  });

  it('speaks the human name of a devnet row while the chip stays the raw identifier', () => {
    renderModal();
    expect(screen.getByLabelText('Select Dev Token on Solana Devnet')).toBeTruthy();
    expect(screen.getByText('SOLANA-DEVNET')).toBeTruthy();
  });

  it('announces the network even when the row is told not to draw one', () => {
    renderModal({ showNetworkChip: false });
    expect(screen.getByLabelText('Select Bitcoin on Bitcoin Mainnet')).toBeTruthy();
  });

  it('keeps the plain label for a row that carries no network', () => {
    renderModal({ tokens: [{ mint: 'no-net', name: 'Orphan', symbol: 'ORP', uiAmount: 1 }] });
    expect(screen.getByLabelText('Select Orphan')).toBeTruthy();
  });
});

describe('TokenSelectorModal balance visibility', () => {
  it('shows holdings by default (You Send)', () => {
    renderModal();
    expect(screen.getByText('12.5 SOL')).toBeTruthy();
  });

  it('hides holdings when showBalances is false (You Receive) — symbol stays as identity', () => {
    renderModal({ showBalances: false });
    expect(screen.queryByText('12.5 SOL')).toBeNull();
    expect(screen.getByText('SOL')).toBeTruthy();
  });
});

describe('TokenSelectorModal ground', () => {
  // A modal is the DOM's sheet, so it is made of the material rather than of
  // an opaque fill. See DESIGN.md §The thermocline is the sheet material.
  it('grounds on the material rather than on a fill', () => {
    renderModal();
    expect(screen.getByTestId('thermocline')).toBeTruthy();
  });

  it('carries no scales layer — the membrane field is retired (2026-09-01)', () => {
    renderModal();
    expect(screen.queryByTestId('scales-background')).toBeNull();
  });
});
