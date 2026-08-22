/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectiblesTab } from './CollectiblesTab';

const mockUseSolanaNfts = vi.fn();
const mockCanonicalNftToSolanaNftData = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@salmon/ui', () => ({
  visuallyHidden: {},
  styled: (_component: unknown) => () => {
    const React = require('react');
    const StyledMock = ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement('div', props, children);
    return StyledMock;
  },
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
  WarningNotice: ({ title }: { title: string }) => <div data-testid="warning-notice">{title}</div>,
}));

vi.mock('@salmon/shared', () => ({
  colors: {
    text: { secondary: '#aaa' },
  },
  spacing: { lg: 16, '2xl': 24, md: 12, sm: 8 },
  fontFamily: { sans: 'sans-serif' },
  canonicalNftToSolanaNftData: (...args: unknown[]) => mockCanonicalNftToSolanaNftData(...args),
  getNftSectionTitle: (key: string) => (key === 'solana-devnet' ? 'Solana Devnet' : 'Solana'),
  useSolanaNfts: (...args: unknown[]) => mockUseSolanaNfts(...args),
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

describe('CollectiblesTab', () => {
  beforeEach(() => {
    cleanup();
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
    render(<CollectiblesTab activeAccount={mockAccount as any} developerNetworks={false} />);

    expect(await screen.findByText('Burned NFT')).toBeTruthy();
  });

  it('hides the chain label when only one chain has collectibles', async () => {
    render(<CollectiblesTab activeAccount={mockAccount as any} developerNetworks={false} />);

    await screen.findByText('Burned NFT');
    expect(screen.queryByText('Solana')).toBeNull();
  });

  it('shows the chain label for each chain when more than one has collectibles', async () => {
    mockUseSolanaNfts.mockImplementation(() => ({
      nfts: [mockRawNft],
      loading: false,
      error: null,
      isError: false,
      refresh: vi.fn(),
    }));

    render(<CollectiblesTab activeAccount={mockAccount as any} developerNetworks={true} />);

    expect(await screen.findByText('Solana')).toBeTruthy();
    expect(screen.getByText('Solana Devnet')).toBeTruthy();
  });
});
