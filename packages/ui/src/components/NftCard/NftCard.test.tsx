/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { NftCard } from './NftCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const BASE_NFT = {
  mint: 'Mint111',
  name: 'Okay Bear #9635',
  collectionName: 'Okay Bears',
  image: 'https://example.test/bear.png',
  blockchain: 'solana',
} as never;

afterEach(cleanup);

describe('NftCard', () => {
  it('lets the browser skip images that are far from the viewport', () => {
    // The grid renders the whole list with no virtualization, so a wallet with
    // hundreds of collectibles mounts hundreds of these at once and each
    // decoded image is held in memory. Native lazy loading is what keeps that
    // bounded — a virtualization dependency would buy back the same thing.
    renderInMode('dark', <NftCard nft={BASE_NFT} />);

    const image = screen.getByRole('img');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('decoding')).toBe('async');
  });

  it.each(['dark', 'light'] as const)('draws the name band over the art in %s', (mode) => {
    renderInMode(mode, <NftCard nft={BASE_NFT} />);

    // The band carries the name over the collection line — the mobile tile's
    // anatomy, not the blurred badge this replaced.
    expect(screen.getByText('Okay Bear #9635')).toBeTruthy();
    expect(screen.getByText('Okay Bears')).toBeTruthy();
  });

  it('falls back to a surface, never a salmon fill, when there is no art', () => {
    renderInMode('dark', <NftCard nft={{ ...(BASE_NFT as object), image: undefined } as never} />);

    // A missing image is an empty surface, not an accent: a grid of salmon
    // rectangles would break the One Living Thing Rule.
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Okay Bear #9635')).toBeTruthy();
  });
});
