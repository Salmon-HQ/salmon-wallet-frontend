import { describe, expect, it, vi, beforeEach } from 'vitest';
import { address, getProgramDerivedAddress } from '@solana/kit';

vi.mock('./domains', () => {
  // Declared inside the factory (vi.mock is hoisted): the validator's
  // `instanceof` runs against this class, and so does the test that throws it.
  class SolDomainPausedError extends Error {}
  return {
    SolDomainPausedError,
    getPublicKeyFromDomain: vi.fn(),
  };
});

import { getPublicKeyFromDomain, SolDomainPausedError } from './domains';
import { validateDestinationAccount } from './validation';

const mockGetPublicKeyFromDomain = vi.mocked(getPublicKeyFromDomain);

/**
 * Builds a minimal rpc stub whose getAccountInfo(...).send() resolves to `value`
 * and whose getTokenAccountsByOwner(...).send() resolves to `tokenAccounts`.
 */
function mockRpc(value: { lamports: bigint } | null, tokenAccounts: unknown[] = []) {
  return {
    getAccountInfo: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue({ value }),
    }),
    getTokenAccountsByOwner: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue({ value: tokenAccounts }),
    }),
  } as any;
}

/** Builds a minimal rpc stub whose getAccountInfo(...).send() rejects. */
function mockRpcNetworkError(error: Error) {
  return {
    getAccountInfo: vi.fn().mockReturnValue({
      send: vi.fn().mockRejectedValue(error),
    }),
  } as any;
}

describe('solana validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects empty input before touching the network', async () => {
    const rpc = mockRpc(null);

    await expect(validateDestinationAccount(rpc, '')).resolves.toEqual({
      type: 'ERROR',
      code: 'invalid',
    });
    expect(rpc.getAccountInfo).not.toHaveBeenCalled();
  });

  it('validates on-curve accounts with funds', async () => {
    const rpc = mockRpc({ lamports: 1_000_000n });
    const addr = 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk';

    await expect(validateDestinationAccount(rpc, addr)).resolves.toEqual({
      type: 'SUCCESS',
      code: 'valid',
      addressType: 'PUBLIC_KEY',
    });
    expect(rpc.getAccountInfo).toHaveBeenCalledWith(addr, { encoding: 'base64' });
  });

  it('returns warning for on-curve addresses with no account info and no token accounts', async () => {
    const rpc = mockRpc(null);

    await expect(
      validateDestinationAccount(rpc, 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk')
    ).resolves.toEqual({
      type: 'WARNING',
      code: 'no_info',
    });
    // Both classic SPL and Token-2022 programs are checked before warning
    expect(rpc.getTokenAccountsByOwner).toHaveBeenCalledTimes(2);
  });

  it('validates active wallets whose system account was deallocated but own token accounts', async () => {
    const rpc = mockRpc(null, [{ pubkey: 'someTokenAccount' }]);

    await expect(
      validateDestinationAccount(rpc, 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk')
    ).resolves.toEqual({
      type: 'SUCCESS',
      code: 'valid',
      addressType: 'PUBLIC_KEY',
    });
  });

  it('validates active wallets funded only via Token-2022 accounts', async () => {
    const rpc = mockRpc(null);
    rpc.getTokenAccountsByOwner
      .mockReturnValueOnce({ send: vi.fn().mockResolvedValue({ value: [] }) })
      .mockReturnValueOnce({
        send: vi.fn().mockResolvedValue({ value: [{ pubkey: 'token2022Account' }] }),
      });

    await expect(
      validateDestinationAccount(rpc, 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk')
    ).resolves.toEqual({
      type: 'SUCCESS',
      code: 'valid',
      addressType: 'PUBLIC_KEY',
    });
  });

  it('falls back to the warning when the token account lookup fails', async () => {
    const rpc = mockRpc(null);
    rpc.getTokenAccountsByOwner.mockReturnValue({
      send: vi.fn().mockRejectedValue(new Error('rpc down')),
    });

    await expect(
      validateDestinationAccount(rpc, 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk')
    ).resolves.toEqual({
      type: 'WARNING',
      code: 'no_info',
    });
  });

  it('does not query token accounts for funded on-curve wallets', async () => {
    const rpc = mockRpc({ lamports: 1_000_000n });

    await expect(
      validateDestinationAccount(rpc, 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk')
    ).resolves.toEqual({
      type: 'SUCCESS',
      code: 'valid',
      addressType: 'PUBLIC_KEY',
    });
    expect(rpc.getTokenAccountsByOwner).not.toHaveBeenCalled();
  });

  it('distinguishes off-curve addresses with and without funds', async () => {
    const [pdaAddress] = await getProgramDerivedAddress({
      programAddress: address('11111111111111111111111111111111'),
      seeds: ['validation-test'],
    });

    const emptyRpc = mockRpc(null);
    const fundedRpc = mockRpc({ lamports: 123n });

    await expect(validateDestinationAccount(emptyRpc, pdaAddress)).resolves.toEqual({
      type: 'SUCCESS',
      code: 'off_curve_no_funds',
      addressType: 'PUBLIC_KEY',
    });
    await expect(validateDestinationAccount(fundedRpc, pdaAddress)).resolves.toEqual({
      type: 'SUCCESS',
      code: 'off_curve_has_funds',
      addressType: 'PUBLIC_KEY',
    });
  });

  it('returns network_error when account lookup fails', async () => {
    const rpc = mockRpcNetworkError(new Error('rpc down'));

    await expect(
      validateDestinationAccount(rpc, 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk')
    ).resolves.toEqual({
      type: 'ERROR',
      code: 'network_error',
    });
  });

  it('resolves trimmed domain inputs through the domain service', async () => {
    const rpc = mockRpc(null);
    mockGetPublicKeyFromDomain.mockResolvedValueOnce(
      'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk'
    );

    await expect(validateDestinationAccount(rpc, '  salmon.sol  ')).resolves.toEqual({
      type: 'SUCCESS',
      code: 'valid',
      addressType: 'DOMAIN',
      resolvedAddress: 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk',
    });
    expect(mockGetPublicKeyFromDomain).toHaveBeenCalledWith(rpc, 'salmon.sol');
  });

  it('returns invalid_domain or network_error for failed domain resolution', async () => {
    const rpc = mockRpc(null);

    mockGetPublicKeyFromDomain.mockResolvedValueOnce(null);
    await expect(validateDestinationAccount(rpc, 'missing.sol')).resolves.toEqual({
      type: 'ERROR',
      code: 'invalid_domain',
    });

    mockGetPublicKeyFromDomain.mockRejectedValueOnce(new Error('resolver down'));
    await expect(validateDestinationAccount(rpc, 'broken.sol')).resolves.toEqual({
      type: 'ERROR',
      code: 'network_error',
    });
  });

  it('says a paused .sol name should be typed as .sns, not that the domain is invalid', async () => {
    mockGetPublicKeyFromDomain.mockRejectedValueOnce(new SolDomainPausedError('bonfida.sol'));

    const result = await validateDestinationAccount(mockRpc(null), 'bonfida.sol');

    expect(result).toEqual({ type: 'ERROR', code: 'sol_domain_paused' });
  });
});
