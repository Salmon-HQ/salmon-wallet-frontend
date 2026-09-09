import { describe, expect, it } from 'vitest';

import { normalizeIpfsUrl } from './url';

describe('normalizeIpfsUrl', () => {
  it('rewrites a subdomain-style IPFS URL to the default gateway, path included', () => {
    const hash = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

    expect(normalizeIpfsUrl(`https://${hash}.ipfs.dweb.link/`)).toContain(hash);
    expect(normalizeIpfsUrl(`https://${hash}.ipfs.dweb.link/1.png?x=1#f`)).toMatch(
      new RegExp(`${hash}/1\\.png$`)
    );
  });

  it('answers a hostile, very long URL without stalling', () => {
    // A subdomain host followed by a long run with no slash used to make the
    // matcher backtrack polynomially; it must return in a few milliseconds.
    const hostile = `https://abc.ipfs.${'a'.repeat(50_000)}`;
    const started = performance.now();
    normalizeIpfsUrl(hostile);
    expect(performance.now() - started).toBeLessThan(200);
  });
});
