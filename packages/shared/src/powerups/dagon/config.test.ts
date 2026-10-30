import { describe, expect, it, vi } from 'vitest';
import devnet from './fixtures/devnet.json';
import { CONFIG_URL } from './constants';
import { DagonConfigError, fetchDagonConfig, parseDagonConfig } from './config';

const copy = (): Record<string, any> => JSON.parse(JSON.stringify(devnet));

describe('parseDagonConfig — spec 043 FR-010, research R8', () => {
  it('accepts the epoch-2 devnet.json', () => {
    const config = parseDagonConfig(devnet);
    expect(config).not.toBeNull();
    expect(config?.epoch).toBe(2);
    expect(config?.sides.USDC.pcMint).toBe('55vZLCwUfy9DN9k4g9enbrB73beNsxrVFnTy8Ju3Kksg');
    expect(config?.sides.DOGE.decimals).toBe(2);
    expect(config?.faucetUrl).toBeNull();
  });

  it.each([null, 'devnet', [], 42])('refuses a non-object (%s)', (doc) => {
    expect(parseDagonConfig(doc)).toBeNull();
  });

  it('refuses another cluster', () => {
    const doc = copy();
    doc.cluster = 'mainnet-beta';
    expect(parseDagonConfig(doc)).toBeNull();
  });

  it.each(['encrypt', 'pcToken', 'pcSwap'])('refuses a changed %s program id', (name) => {
    const doc = copy();
    doc.programs[name] = '11111111111111111111111111111111';
    expect(parseDagonConfig(doc)).toBeNull();
  });

  it.each([
    'https://evil.example.com:443',
    'http://pre-alpha-dev-1.encrypt.ika-network.net',
    'https://pre-alpha-dev-1.encrypt.ika-network.net.evil.com',
    // React Native's URL polyfill reads this hostname as the pinned host.
    'https://evil.example/@pre-alpha-dev-1.encrypt.ika-network.net',
    'https://user@pre-alpha-dev-1.encrypt.ika-network.net',
    'https://pre-alpha-dev-1.encrypt.ika-network.net/other',
    'https://pre-alpha-dev-1.encrypt.ika-network.net:8443',
    'not a url',
  ])('refuses an executor on another host (%s)', (url) => {
    const doc = copy();
    doc.encryptGrpcUrl = url;
    expect(parseDagonConfig(doc)).toBeNull();
  });

  it('accepts the executor host without its port', () => {
    const doc = copy();
    doc.encryptGrpcUrl = 'https://pre-alpha-dev-1.encrypt.ika-network.net';
    expect(parseDagonConfig(doc)).not.toBeNull();
  });

  it.each(['USDC', 'DOGE'])('refuses a missing %s side', (side) => {
    const doc = copy();
    delete doc.sides[side];
    expect(parseDagonConfig(doc)).toBeNull();
  });

  it('refuses a side with other decimals', () => {
    const doc = copy();
    doc.sides.DOGE.decimals = 6;
    expect(parseDagonConfig(doc)).toBeNull();
  });

  it('refuses a side with a malformed address', () => {
    const doc = copy();
    doc.sides.USDC.pcMint = 'not-an-address';
    expect(parseDagonConfig(doc)).toBeNull();
  });

  it.each([
    ['pcAccountBalanceCtOffset', [64, 97]],
    ['ciphertextDigestOffset', [3, 34]],
    ['ciphertextVerifiedFlagByte', 98],
  ])('refuses a changed layout offset %s', (name, value) => {
    const doc = copy();
    doc.layout[name] = value;
    expect(parseDagonConfig(doc)).toBeNull();
  });

  it('refuses a missing layout', () => {
    const doc = copy();
    delete doc.layout;
    expect(parseDagonConfig(doc)).toBeNull();
  });

  it('ignores an https faucet that is not the pinned one, refuses any other faucet value', () => {
    const doc = copy();
    // No faucet is pinned (research: Dagon funds on request), so no remote
    // URL can put a link behind a wallet button.
    doc.faucetUrl = 'https://faucet.example.com/faucet';
    expect(parseDagonConfig(doc)).not.toBeNull();
    expect(parseDagonConfig(doc)?.faucetUrl).toBeNull();
    doc.faucetUrl = 'http://faucet.example.com';
    expect(parseDagonConfig(doc)).toBeNull();
    doc.faucetUrl = 7;
    expect(parseDagonConfig(doc)).toBeNull();
  });
});

describe('fetchDagonConfig', () => {
  it('reads the pinned URL and returns the accepted config', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(devnet), { status: 200 }));
    const config = await fetchDagonConfig(fetchFn as unknown as typeof fetch);
    expect(fetchFn).toHaveBeenCalledWith(CONFIG_URL);
    expect(config.epoch).toBe(2);
  });

  it('rejects on a fetch failure, a non-2xx answer or a refused document; no default stands in', async () => {
    const failing = vi.fn(async () => {
      throw new TypeError('offline');
    });
    await expect(fetchDagonConfig(failing as unknown as typeof fetch)).rejects.toBeInstanceOf(
      DagonConfigError
    );
    const notFound = vi.fn(async () => new Response('nope', { status: 404 }));
    await expect(fetchDagonConfig(notFound as unknown as typeof fetch)).rejects.toBeInstanceOf(
      DagonConfigError
    );
    const doc = copy();
    doc.cluster = 'testnet';
    const refused = vi.fn(async () => new Response(JSON.stringify(doc), { status: 200 }));
    await expect(fetchDagonConfig(refused as unknown as typeof fetch)).rejects.toBeInstanceOf(
      DagonConfigError
    );
  });
});
