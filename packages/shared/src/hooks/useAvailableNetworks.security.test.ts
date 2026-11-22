/**
 * Abuse case: a compromised or impersonated salmon-api. `/v1/networks` is the
 * one answer that could tell the wallet which server to treat as the chain —
 * the server that simulates what the user is about to sign and receives what
 * they signed. Whatever it says, a store build talks only to hosts it shipped
 * knowing.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { fetchAndMergeNetworkConfigs } from './useAvailableNetworks';
import { SOLANA_NETWORKS } from '../blockchain/solana/networks';
import { ETHEREUM_NETWORKS } from '../blockchain/ethereum/networks';
import { BITCOIN_NETWORKS } from '../blockchain/bitcoin/networks';
import * as networkService from '../api/services/network';

vi.mock('../api/services/network', () => ({ getNetworks: vi.fn() }));

const compiled = {
  solana: { ...SOLANA_NETWORKS['solana-mainnet'].config },
  ethereum: { ...ETHEREUM_NETWORKS['ethereum-mainnet'].config },
  bitcoin: { ...BITCOIN_NETWORKS['bitcoin-mainnet'].config },
};

const answerWith = async (url: string) => {
  vi.mocked(networkService.getNetworks).mockResolvedValue([
    { id: 'solana-mainnet', blockchain: 'solana', config: { nodeUrl: url, wsUrl: url } },
    { id: 'ethereum-mainnet', blockchain: 'ethereum', config: { rpcUrl: url } },
    { id: 'bitcoin-mainnet', blockchain: 'bitcoin', config: { apiUrl: url } },
  ] as never);
  await fetchAndMergeNetworkConfigs();
};

const endpointHosts = () =>
  [
    SOLANA_NETWORKS['solana-mainnet'].config.nodeUrl,
    SOLANA_NETWORKS['solana-mainnet'].config.wsUrl,
    ETHEREUM_NETWORKS['ethereum-mainnet'].config.rpcUrl,
    BITCOIN_NETWORKS['bitcoin-mainnet'].config.apiUrl,
  ]
    .filter((url): url is string => typeof url === 'string')
    .map((url) => new URL(url).hostname);

afterEach(() => {
  vi.unstubAllEnvs();
  SOLANA_NETWORKS['solana-mainnet'].config = { ...compiled.solana };
  ETHEREUM_NETWORKS['ethereum-mainnet'].config = { ...compiled.ethereum };
  BITCOIN_NETWORKS['bitcoin-mainnet'].config = { ...compiled.bitcoin };
});

describe('abuse: the network catalogue names an attacker’s server', () => {
  const attackerUrl = fc
    .webUrl({ validSchemes: ['https', 'wss', 'http', 'ws'] })
    .filter(
      (url) => !/(^|\.)(solana\.com|rpcpool\.com|llamarpc\.com)$/.test(new URL(url).hostname)
    );

  it.each(['production', 'staging'])(
    'a %s build keeps every chain on a host it shipped with',
    async (environment) => {
      vi.stubEnv('VITE_SALMON_ENV', environment);
      const shipped = endpointHosts();

      await fc.assert(
        fc.asyncProperty(attackerUrl, async (url) => {
          await answerWith(url);
          expect(endpointHosts()).toEqual(shipped);
        })
      );
    }
  );

  it.each([
    ['a lookalike host', 'https://eth.llamarpc.com.evil.example/'],
    ['the real host as a subdomain label', 'https://evil-eth.llamarpc.com/'],
    ['the real host in the userinfo', 'https://eth.llamarpc.com@evil.example/'],
    ['the real host in the path', 'https://evil.example/eth.llamarpc.com'],
    ['plain http on the real host', 'http://eth.llamarpc.com/'],
  ])('Ethereum ignores %s', async (_label, url) => {
    await answerWith(url);

    expect(ETHEREUM_NETWORKS['ethereum-mainnet'].config.rpcUrl).toBe(compiled.ethereum.rpcUrl);
  });

  it('Ethereum still takes a new path on the host it shipped with', async () => {
    const { hostname } = new URL(compiled.ethereum.rpcUrl);

    await answerWith(`https://${hostname}/v2/key`);

    expect(ETHEREUM_NETWORKS['ethereum-mainnet'].config.rpcUrl).toBe(`https://${hostname}/v2/key`);
  });

  it('Bitcoin takes no endpoint from the catalogue at all', async () => {
    vi.stubEnv('VITE_SALMON_ENV', 'local');

    await answerWith('https://mempool.space/api');

    expect(BITCOIN_NETWORKS['bitcoin-mainnet'].config).toEqual(compiled.bitcoin);
  });
});
