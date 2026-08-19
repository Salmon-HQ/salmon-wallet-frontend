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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

// The real `@salmon/shared` barrel pulls react-native into the jsdom bundle,
// which Rollup cannot parse. Everything under test here is which identity a row
// draws, so plain token stand-ins are faithful; the token values themselves are
// asserted in `packages/shared/src/theme/contrast.test.ts`.
vi.mock('@salmon/shared', () => ({
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
  colors: {
    text: { primary: '#EDF1F7', secondary: '#B4BCCC', tertiary: '#8B96AD' },
    accent: { primary: '#F5674F' },
    background: { primary: '#10131C', secondary: '#0B0F19', card: '#151A24', tertiary: '#1B2130' },
    input: { background: '#151A24', border: '#3A4356' },
    card: { border: '#3A4356' },
    border: { default: '#3A4356' },
    skeleton: { base: '#1B2130', highlight: '#3A4356' },
    button: { dangerHover: '#C7503C' },
  },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 32 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, iconLg: 20 },
  borderWidth: { thin: 1 },
  componentSizes: {
    sheetWidthSm: 360,
    sheetWidthLg: 480,
    iconSizeXxsm: 14,
    iconSizeXs: 16,
    iconSize2XL: 40,
    iconSize3XL: 48,
  },
  fontFamily: { sans: 'DM Sans', mono: 'Geist Mono' },
  fontWeight: { medium: 500, semibold: 600 },
  fontSize: { xs: 12, sm: 14, base: 16, bodyLg: 18, lg: 20, xl: 24 },
  opacity: { full: 1 },
  duration: { normal: '180ms' },
  easing: { ease: 'ease' },
  tabularNums: { css: {} },
  getIconSize: (size?: number) => size ?? 24,
  getShortAddress: (value?: string) => (value ? value.slice(0, 8) : ''),
  getTokenKey: (token: { mint?: string; address?: string; symbol?: string }) =>
    token.mint || token.address || token.symbol || '',
  ContentLoader: () => null,
  Rect: () => null,
  Circle: () => null,
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
