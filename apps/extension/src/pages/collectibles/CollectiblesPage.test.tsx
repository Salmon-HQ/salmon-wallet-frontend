/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectiblesPage } from './CollectiblesPage';

const mockUseSolanaNfts = vi.fn();
const mockCanonicalNftToSolanaNftData = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('../../utils/styled', () => ({
  styled: (_component: unknown) => () => {
    const React = require('react');
    const MockStyledComponent = ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement('div', props, children);
    MockStyledComponent.displayName = 'MockStyledComponent';
    return MockStyledComponent;
  },
}));

vi.mock('@salmon/shared', () => ({
  colors: {
    text: { primary: '#fff', secondary: '#aaa', disabled: '#666' },
    background: { card: '#111' },
  },
  spacing: { sm: 8, md: 12, lg: 16, xl: 24 },
  fontSize: { sm: 14, base: 16, bodyLg: 18, lg: 20 },
  borderRadius: { lg: 16 },
  fontFamily: { sans: 'sans-serif' },
  canonicalNftToSolanaNftData: (...args: unknown[]) => mockCanonicalNftToSolanaNftData(...args),
  getNftSectionTitle: (key: string) => (key === 'solana-devnet' ? 'Solana Devnet' : 'Solana'),
  useSolanaNfts: (...args: unknown[]) => mockUseSolanaNfts(...args),
}));

vi.mock('@/components', () => ({
  NftCarouselSection: ({
    title,
    nfts,
    showChainLabel = true,
  }: {
    title: string;
    nfts: Array<{ name: string }>;
    showChainLabel?: boolean;
  }) => (
    <div>
      {showChainLabel && <div>{title}</div>}
      {nfts.map((nft) => (
        <div key={nft.name}>{nft.name}</div>
      ))}
    </div>
  ),
  WarningNotice: () => <div />,
  visuallyHidden: {},
}));

const mockRawNft = {
  mint: { address: 'Mint111' },
  owner: 'Owner111',
  name: 'Burned NFT',
  media: 'https://example.com/nft.png',
};

const mockAccount = {
  networksAccounts: {
    'solana-mainnet': [
      {
        getReceiveAddress: () => 'Owner111',
      },
    ],
    'solana-devnet': [
      {
        getReceiveAddress: () => 'Owner222',
      },
    ],
  },
};

describe('CollectiblesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanonicalNftToSolanaNftData.mockReturnValue({
      mint: 'Mint111',
      name: 'Burned NFT',
      media: 'https://example.com/nft.png',
      blockchain: 'solana',
    });
    mockUseSolanaNfts.mockImplementation(({ networkId }: { networkId: string }) => ({
      nfts: networkId === 'solana-mainnet' ? [mockRawNft] : [],
      loading: false,
      error: null,
      isError: false,
      refresh: vi.fn(),
    }));
  });

  it('renders mainnet NFTs from the useSolanaNfts query', async () => {
    render(<CollectiblesPage activeAccount={mockAccount as any} developerNetworks={false} />);

    expect(await screen.findByText('Burned NFT')).toBeTruthy();
  });

  it('hides the chain label when only one chain has collectibles', async () => {
    render(<CollectiblesPage activeAccount={mockAccount as any} developerNetworks={false} />);

    await screen.findByText('Burned NFT');
    expect(screen.queryByText('Solana')).toBeNull();
    expect(screen.queryByText('(1)')).toBeNull();
  });

  it('shows the chain label for each chain when more than one has collectibles', async () => {
    mockUseSolanaNfts.mockImplementation(() => ({
      nfts: [mockRawNft],
      loading: false,
      error: null,
      isError: false,
      refresh: vi.fn(),
    }));

    render(<CollectiblesPage activeAccount={mockAccount as any} developerNetworks={true} />);

    expect(await screen.findByText('Solana')).toBeTruthy();
    expect(screen.getByText('Solana Devnet')).toBeTruthy();
  });
});
