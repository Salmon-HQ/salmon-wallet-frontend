/**
 * Abuse case: a recipient name that dodges its own resolver. A name ending in
 * `.sol` or `.sns` belongs to SNS, which has paused `.sol`; the wallet must
 * say so rather than ask another name service who owns it. Letter case is the
 * cheapest way to try: `NAME.SOL` is the same name to a person and a
 * different string to `endsWith`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import * as SnsSdkKit from '@solana-name-service/sns-sdk-kit';
import { getPublicKeyFromDomain, isSnsDomain, SolDomainPausedError } from './domains';
import type { SolanaRpc } from './networks';

vi.mock('@solana-name-service/sns-sdk-kit', () => ({
  getPrimaryDomain: vi.fn(),
  resolve: vi.fn(),
  UnsupportedTldError: class UnsupportedTldError extends Error {},
}));

const allDomainsLookup = vi.fn();
vi.mock('@onsol/tldparser-kit', () => ({
  TldParser: class {
    getOwnerFromDomainTld = allDomainsLookup;
  },
}));

const rpc = {} as SolanaRpc;

/** Every upper/lower spelling of a suffix: `.sol`, `.SOL`, `.sOl`, … */
const anyCase = (suffix: string) =>
  fc
    .array(fc.boolean(), { minLength: suffix.length, maxLength: suffix.length })
    .map((upper) => [...suffix].map((ch, i) => (upper[i] ? ch.toUpperCase() : ch)).join(''));

beforeEach(() => {
  vi.mocked(SnsSdkKit.resolve).mockReset();
  allDomainsLookup.mockReset().mockResolvedValue('AttackerOwnedAddress');
});

describe('abuse: an SNS name spelled to skip the SNS resolver', () => {
  it('a .sol or .sns suffix in any letter case is an SNS name', () => {
    fc.assert(
      fc.property(fc.constantFrom('.sol', '.sns').chain(anyCase), (suffix) => {
        expect(isSnsDomain(`alice${suffix}`)).toBe(true);
      })
    );
  });

  it('never asks AllDomains who owns an SNS name, whatever its case', async () => {
    vi.mocked(SnsSdkKit.resolve).mockResolvedValue(null as never);

    await fc.assert(
      fc.asyncProperty(fc.constantFrom('.sol', '.sns').chain(anyCase), async (suffix) => {
        expect(await getPublicKeyFromDomain(rpc, `alice${suffix}`)).toBeNull();
        expect(allDomainsLookup).not.toHaveBeenCalled();
      })
    );
  });

  it('reports the .sol pause for a capitalised suffix too', async () => {
    vi.mocked(SnsSdkKit.resolve).mockRejectedValue(new SnsSdkKit.UnsupportedTldError('x' as never));

    await expect(getPublicKeyFromDomain(rpc, 'alice.SOL')).rejects.toThrow(SolDomainPausedError);
    expect(SnsSdkKit.resolve).toHaveBeenCalledWith({ rpc, domain: 'alice.sol' });
  });

  it('a name that only contains the suffix is not an SNS name', () => {
    expect(isSnsDomain('alice.sol.abc')).toBe(false);
    expect(isSnsDomain('alicesol')).toBe(false);
  });
});
