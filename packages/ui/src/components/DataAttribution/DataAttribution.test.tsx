/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockAttribution: { text: string; url: string } | null = null;
vi.mock('@salmon/shared', async () => {
  const actual = await vi.importActual<typeof import('@salmon/shared')>('@salmon/shared');
  return { ...actual, useDataAttribution: () => mockAttribution };
});

import { renderInMode } from '../../test/renderInMode';
import { DataAttribution } from './DataAttribution';

afterEach(cleanup);

describe('DataAttribution', () => {
  beforeEach(() => {
    mockAttribution = {
      text: 'Data provided by CoinGecko',
      url: 'https://www.coingecko.com/en/api',
    };
  });

  it('draws the credit verbatim as a link to the provider, in a new tab', () => {
    renderInMode('light', <DataAttribution networkId="solana-mainnet" />);

    const link = screen.getByRole('link', { name: 'Data provided by CoinGecko' });
    expect(link.getAttribute('href')).toBe('https://www.coingecko.com/en/api');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('draws nothing when the network owes no credit', () => {
    mockAttribution = null;
    renderInMode('light', <DataAttribution networkId="bitcoin-mainnet" />);

    expect(screen.queryByTestId('data-attribution')).toBeNull();
  });
});
