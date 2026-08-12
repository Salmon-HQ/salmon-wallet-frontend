/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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
  styled: (_component: unknown) => () => {
    const React = require('react');
    const StyledMock = ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement('div', props, children);
    return StyledMock;
  },
  NftCarouselSection: ({ title, nfts }: { title: string; nfts: Array<{ name: string }> }) => (
    <div>
      <div>{title}</div>
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
  getNftSectionTitle: () => 'Solana',
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
  },
};

describe('CollectiblesTab', () => {
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
    render(<CollectiblesTab activeAccount={mockAccount as any} developerNetworks={false} />);

    expect(await screen.findByText('Burned NFT')).toBeTruthy();
  });
});
