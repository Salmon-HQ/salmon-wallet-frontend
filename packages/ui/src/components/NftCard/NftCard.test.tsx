/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NftCard } from './NftCard';

// The shared barrel pulls React Native modules that this bundler cannot parse;
// every component test here mocks it down to the tokens the component reads.
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/theme')),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// MUI's Box observes its element; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as never;

const BASE_NFT = {
  mint: 'Mint111',
  name: 'Okay Bear #9635',
  image: 'https://example.test/bear.png',
  blockchain: 'solana',
} as never;

afterEach(cleanup);

describe('NftCard in a large collection', () => {
  it('lets the browser skip images that are far from the viewport', () => {
    // The collectibles grid renders the whole list with no virtualization, so a
    // wallet with hundreds of NFTs mounts hundreds of these at once, and each
    // decoded image is held in memory. Native lazy loading is what keeps that
    // bounded — a virtualization dependency would buy back the same thing.
    render(<NftCard nft={BASE_NFT} />);

    const image = screen.getByRole('img');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('decoding')).toBe('async');
  });
});
