/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { NftsTab } from './NftsTab';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

const accountsState = {
  ready: true,
  networkId: 'solana-mainnet',
  activeAccount: {
    networksAccounts: {
      'solana-mainnet': [{ getReceiveAddress: () => 'Owner111' }],
    },
  },
};

const nftsResult = {
  nfts: [] as unknown[],
  loading: false,
  error: null as string | null,
  partial: false,
  refresh: vi.fn(async () => {}),
};

vi.mock('@salmon/shared', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@salmon/shared');
  return {
    ...actual,
    useAccountsContext: () => [accountsState, {}],
    useSolanaNfts: () => nftsResult,
    canonicalNftToSolanaNftData: (nft: { mint: string; name: string }) => nft,
  };
});

function stubMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

beforeEach(() => {
  stubMatchMedia();
  nftsResult.nfts = [];
  nftsResult.loading = false;
  nftsResult.error = null;
  nftsResult.partial = false;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('NftsTab', () => {
  it.each(['dark', 'light'] as const)('draws one grid on the active network, in %s', (mode) => {
    nftsResult.nfts = [
      { mint: 'A', name: 'Bear #1' },
      { mint: 'B', name: 'Bear #2' },
    ];

    renderInMode(mode, <NftsTab />);

    expect(screen.getByTestId('nft-card-A')).toBeTruthy();
    expect(screen.getByTestId('nft-card-B')).toBeTruthy();
    // No section per chain: the grid follows the network the wallet stands on.
    expect(screen.queryByTestId('collectibles-empty')).toBeNull();
  });

  it('shows the placeholder grid while it loads, never an empty state', () => {
    nftsResult.loading = true;

    renderInMode('dark', <NftsTab />);

    expect(screen.getByTestId('collectibles-loading')).toBeTruthy();
    expect(screen.queryByTestId('collectibles-empty')).toBeNull();
  });

  it('distinguishes a failed load from an empty collection', () => {
    nftsResult.error = 'boom';
    const { rerender } = renderInMode('dark', <NftsTab />);

    expect(screen.getByTestId('collectibles-load-error')).toBeTruthy();
    expect(screen.queryByTestId('collectibles-empty')).toBeNull();

    nftsResult.error = null;
    rerender(<NftsTab />);
    expect(screen.getByTestId('collectibles-empty')).toBeTruthy();
  });

  it('reports its own scroll offset so the host can fade the seam', () => {
    const onScroll = vi.fn();
    renderInMode('dark', <NftsTab testID="nfts-tab" onScroll={onScroll} />);

    fireEvent.scroll(screen.getByTestId('nfts-tab'));
    expect(onScroll).toHaveBeenCalled();
  });
});
