import { describe, expect, it } from 'vitest';

import {
  getNftBlockchainLabel,
  getNftSectionTitle,
  getVisibleNftSectionKeys,
  INITIAL_NFT_SECTIONS,
  SECTION_TO_NETWORK,
  type BitcoinNftData,
  type SolanaNftData,
} from './nft';

describe('NFT shared section contract', () => {
  it('exposes only active Solana NFT sections', () => {
    expect(getVisibleNftSectionKeys(false)).toEqual(['solana']);
    expect(getVisibleNftSectionKeys(true)).toEqual(['solana', 'solana-devnet']);
    expect(Object.keys(INITIAL_NFT_SECTIONS)).toEqual(['solana', 'solana-devnet']);
    expect(SECTION_TO_NETWORK).toEqual({
      solana: 'solana-mainnet',
      'solana-devnet': 'solana-devnet',
    });
  });

  it('labels active NFT section titles', () => {
    expect(getNftSectionTitle('solana', INITIAL_NFT_SECTIONS.solana)).toBe('Solana');
    expect(getNftSectionTitle('solana-devnet', INITIAL_NFT_SECTIONS['solana-devnet'])).toBe(
      'Solana Devnet'
    );
  });
});

describe('NFT blockchain labels', () => {
  it('labels supported NFT data chains', () => {
    const solanaNft = {
      blockchain: 'solana',
      mint: 'mint-1',
      name: 'Solana NFT',
    } satisfies SolanaNftData;

    const bitcoinNft = {
      blockchain: 'bitcoin',
      mint: 'inscription-1',
      name: 'Ordinal',
      inscriptionId: 'inscription-1',
      inscriptionNumber: 1,
      contentType: 'image/png',
    } satisfies BitcoinNftData;

    expect(getNftBlockchainLabel(solanaNft)).toBe('Solana');
    expect(getNftBlockchainLabel(bitcoinNft)).toBe('Bitcoin Ordinal');
  });
});
