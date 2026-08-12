import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isEnsDomain, isEthereumAddress, validateDestinationAccount } from './validation';

const VALID_ETH_ADDRESS = '0x742D35cc6634c0532925a3B844bc9e7595f35b32';

describe('ethereum validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('helpers', () => {
    it('recognizes valid Ethereum addresses', () => {
      expect(isEthereumAddress(VALID_ETH_ADDRESS)).toBe(true);
      expect(isEthereumAddress('invalid')).toBe(false);
    });

    it('recognizes ENS-style domains and excludes addresses', () => {
      expect(isEnsDomain('vitalik.eth')).toBe(true);
      expect(isEnsDomain('Example.XYZ')).toBe(true);
      expect(isEnsDomain('0x742d35Cc6634C0532925a3b844Bc9e7595f35b32')).toBe(false);
      expect(isEnsDomain('not-a-domain')).toBe(false);
    });
  });

  describe('validateDestinationAccount', () => {
    it('rejects empty input before provider calls', async () => {
      const provider = {
        getBalance: vi.fn(),
        resolveName: vi.fn(),
      } as any;

      await expect(validateDestinationAccount(provider, '   ')).resolves.toEqual({
        type: 'ERROR',
        code: 'invalid',
      });
      expect(provider.getBalance).not.toHaveBeenCalled();
      expect(provider.resolveName).not.toHaveBeenCalled();
    });

    it('returns valid for addresses with ETH balance', async () => {
      const provider = {
        getBalance: vi.fn().mockResolvedValue(5n),
      } as any;

      await expect(validateDestinationAccount(provider, VALID_ETH_ADDRESS)).resolves.toEqual({
        type: 'SUCCESS',
        code: 'valid',
        addressType: 'ADDRESS',
        balance: 5n,
      });
    });

    it('returns no_funds for zero-balance addresses', async () => {
      const provider = {
        getBalance: vi.fn().mockResolvedValue(0n),
      } as any;

      await expect(validateDestinationAccount(provider, VALID_ETH_ADDRESS)).resolves.toEqual({
        type: 'SUCCESS',
        code: 'no_funds',
        addressType: 'ADDRESS',
        balance: 0n,
      });
    });

    it('downgrades provider balance failures to no_info', async () => {
      const provider = {
        getBalance: vi.fn().mockRejectedValue(new Error('rpc down')),
      } as any;

      await expect(validateDestinationAccount(provider, VALID_ETH_ADDRESS)).resolves.toEqual({
        type: 'WARNING',
        code: 'no_info',
      });
    });

    it('resolves ENS domains and rejects unresolved ones', async () => {
      const provider = {
        resolveName: vi
          .fn()
          .mockResolvedValueOnce('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
          .mockResolvedValueOnce(null),
      } as any;

      await expect(validateDestinationAccount(provider, 'vitalik.eth')).resolves.toEqual({
        type: 'SUCCESS',
        code: 'valid',
        addressType: 'DOMAIN',
        resolvedAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      });
      await expect(validateDestinationAccount(provider, 'missing.eth')).resolves.toEqual({
        type: 'ERROR',
        code: 'invalid_domain',
      });
    });

    it('treats ENS resolver exceptions as invalid_domain', async () => {
      const provider = {
        resolveName: vi.fn().mockRejectedValue(new Error('resolver down')),
      } as any;

      await expect(validateDestinationAccount(provider, 'broken.eth')).resolves.toEqual({
        type: 'ERROR',
        code: 'invalid_domain',
      });
    });
  });
});
