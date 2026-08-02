import { describe, expect, it, vi, beforeEach } from 'vitest';
import { address, getProgramDerivedAddress } from '@solana/kit';

vi.mock('./domains', () => ({
  getPublicKeyFromDomain: vi.fn(),
}));

import { getPublicKeyFromDomain } from './domains';
import { validateDestinationAccount } from './validation';

const mockGetPublicKeyFromDomain = vi.mocked(getPublicKeyFromDomain);

/** Builds a minimal rpc stub whose getAccountInfo(...).send() resolves to `value`. */
function mockRpc(value: { lamports: bigint } | null) {
  return {
    getAccountInfo: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue({ value }),
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

  it('returns warning for on-curve addresses with no account info', async () => {
    const rpc = mockRpc(null);

    await expect(
      validateDestinationAccount(rpc, 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk')
    ).resolves.toEqual({
      type: 'WARNING',
      code: 'no_info',
    });
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
});
