/**
 * The provider's credit is drawn verbatim from the backend and opens the
 * provider's link; a network that owes none draws nothing at all.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockOpenLink = jest.fn();
let mockAttribution: { text: string; url: string } | null = null;

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
  useDataAttribution: () => mockAttribution,
  useOpenLink: () => mockOpenLink,
}));

import { DataAttribution } from './DataAttribution';

describe('DataAttribution', () => {
  beforeEach(() => {
    mockOpenLink.mockReset();
    mockAttribution = {
      text: 'Data provided by CoinGecko',
      url: 'https://www.coingecko.com/en/api',
    };
  });

  it('draws the credit verbatim and opens its link', () => {
    render(<DataAttribution networkId="solana-mainnet" />);

    fireEvent.press(screen.getByText('Data provided by CoinGecko'));

    expect(mockOpenLink).toHaveBeenCalledWith('https://www.coingecko.com/en/api');
    expect(screen.getByTestId('data-attribution').props.accessibilityRole).toBe('link');
  });

  it('draws nothing when the network owes no credit', () => {
    mockAttribution = null;
    render(<DataAttribution networkId="bitcoin-mainnet" />);

    expect(screen.queryByTestId('data-attribution')).toBeNull();
  });
});
