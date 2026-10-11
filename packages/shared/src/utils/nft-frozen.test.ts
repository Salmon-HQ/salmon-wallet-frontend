import { describe, expect, it } from 'vitest';
import { canonicalNftToSolanaNftData, isFrozenNft } from './nft';
import type { Nft } from '../types/nft';

const nft = (frozen?: boolean) =>
  ({
    mint: { address: 'Sgt111' },
    name: 'Seeker Genesis Token',
    media: 'https://x/s.png',
    collection: null,
    extras: {},
    frozen,
  }) as unknown as Nft;

describe('isFrozenNft', () => {
  it('is true for an NFT whose token the issuer froze', () => {
    expect(isFrozenNft(canonicalNftToSolanaNftData(nft(true)))).toBe(true);
  });

  it('is false for an ordinary NFT, an unknown flag, or no NFT', () => {
    expect(isFrozenNft(canonicalNftToSolanaNftData(nft(false)))).toBe(false);
    expect(isFrozenNft(canonicalNftToSolanaNftData(nft()))).toBe(false);
    expect(isFrozenNft(null)).toBe(false);
  });
});
