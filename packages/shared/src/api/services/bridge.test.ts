import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BridgeAvailableToken, BridgeExchange, BridgeTransaction } from '../../types/bridge';

vi.mock('../client', async () => {
  const actual = await vi.importActual<typeof import('../client')>('../client');

  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

import { apiClient, createApiClient } from '../client';
import {
  BRIDGE_PARTNER_FEE_PERCENT,
  createBridgeExchange,
  getBridgeAvailableTokens,
  getBridgeEstimatedAmount,
  getBridgeMinimalAmount,
  getBridgeTransaction,
} from './bridge';
import { formatPercent } from '../../utils/formatting';

const mockApiClientGet = vi.mocked(apiClient.get);
const mockApiClientPost = vi.mocked(apiClient.post);
const DEFAULT_LOCAL_HOST = 'localhost';

function getBackendBaseUrlCandidates(): string[] {
  const envApiUrl =
    process.env.EXPO_PUBLIC_API_URL || process.env.VITE_API_URL || process.env.API_URL;
  const envHost =
    process.env.EXPO_PUBLIC_API_HOST || process.env.VITE_API_HOST || DEFAULT_LOCAL_HOST;
  const envPort = process.env.EXPO_PUBLIC_API_PORT || process.env.VITE_API_PORT;
  const candidates = [
    envApiUrl,
    envPort ? `http://${envHost}:${envPort}/local` : undefined,
    'http://127.0.0.1:3001/local',
    'http://127.0.0.1:3000/local',
    'http://localhost:3001/local',
    'http://localhost:3000/local',
  ];

  return [...new Set(candidates.filter(Boolean))] as string[];
}

async function getReachableBackendBaseUrl(): Promise<string | null> {
  for (const baseUrl of getBackendBaseUrlCandidates()) {
    try {
      const client = createApiClient({
        baseUrl,
        timeout: 2000,
      });
      await client.get('/health');
      return baseUrl;
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

const MOCK_AVAILABLE_TOKENS: BridgeAvailableToken[] = [
  { symbol: 'BTC', name: 'Bitcoin', network: 'BITCOIN', available: true },
];

const MOCK_EXCHANGE: BridgeExchange = {
  id: 'exchange-123',
  currencyFrom: 'sol',
  currencyTo: 'btc',
  amountExpectedFrom: 1.5,
  amountExpectedTo: 0.0021,
  payinAddress: 'deposit-address',
  payoutAddress: 'destination-address',
  status: 'waiting',
};

const MOCK_TRANSACTION: BridgeTransaction = {
  id: 'exchange-123',
  currencyFrom: 'sol',
  currencyTo: 'btc',
  payinAddress: 'deposit-address',
  payoutAddress: 'destination-address',
  // BridgeTransactionStatus is a closed enum; salmon-api normalizes
  // upstream StealthEX `waiting` into `inProgress` before the FE sees it.
  status: 'inProgress',
};

describe('bridge service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lowercases the source symbol for available bridge tokens', async () => {
    mockApiClientGet.mockResolvedValueOnce({ data: MOCK_AVAILABLE_TOKENS });

    const result = await getBridgeAvailableTokens('SOL');

    expect(mockApiClientGet).toHaveBeenCalledWith('/v1/bridge/available', {
      params: { symbol: 'sol' },
    });
    expect(result).toEqual(MOCK_AVAILABLE_TOKENS);
  });

  it('includes optional network filters when fetching bridge estimates', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: { estimated_amount: 0.0021 },
    });

    const result = await getBridgeEstimatedAmount('SOL', 'BTC', 1.5, 'SOLANA', 'BITCOIN');

    expect(mockApiClientGet).toHaveBeenCalledWith('/v1/bridge/estimate', {
      params: {
        symbolIn: 'sol',
        symbolOut: 'btc',
        amount: 1.5,
        networkIn: 'SOLANA',
        networkOut: 'BITCOIN',
      },
    });
    expect(result).toBe(0.0021);
  });

  it('returns null when estimate payload omits estimated amount', async () => {
    mockApiClientGet.mockResolvedValueOnce({ data: {} });

    const result = await getBridgeEstimatedAmount('SOL', 'BTC', 1.5);

    expect(result).toBeNull();
  });

  it('includes optional network filters when fetching bridge minimum amount', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: { min_amount: '0.1' },
    });

    const result = await getBridgeMinimalAmount('SOL', 'BTC', 'SOLANA', 'BITCOIN');

    expect(mockApiClientGet).toHaveBeenCalledWith('/v1/bridge/minimal', {
      params: {
        symbolIn: 'sol',
        symbolOut: 'btc',
        networkIn: 'SOLANA',
        networkOut: 'BITCOIN',
      },
    });
    expect(result).toEqual({ min: 0.1, max: null });
  });

  it('coerces string min_amount and max_amount to numbers', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: { min_amount: '0.39359748097612175282', max_amount: '250' },
    });

    const result = await getBridgeMinimalAmount('SOL', 'BTC');

    // Number('0.39359748097612175282') rounds to the nearest double — assert
    // against the same coercion instead of a literal that loses precision.
    expect(result).toEqual({ min: Number('0.39359748097612175282'), max: 250 });
  });

  it('returns max null when the pair has no upstream cap', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: { min_amount: '0.015' },
    });

    const result = await getBridgeMinimalAmount('SOL', 'BTC');

    expect(result).toEqual({ min: 0.015, max: null });
  });

  it('returns null amounts when the payload is missing or unparsable', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: { min_amount: 'not-a-number', max_amount: 'also-bad' },
    });

    const result = await getBridgeMinimalAmount('SOL', 'BTC');

    expect(result).toEqual({ min: null, max: null });
  });

  it('creates an exchange over POST so a retried request cannot duplicate the order', async () => {
    mockApiClientPost.mockResolvedValueOnce({ data: MOCK_EXCHANGE });

    const result = await createBridgeExchange(
      'SOL',
      'BTC',
      1.5,
      'destination-address',
      'SOLANA',
      'BITCOIN'
    );

    expect(mockApiClientPost).toHaveBeenCalledWith('/v1/bridge/exchange', {
      symbolIn: 'sol',
      symbolOut: 'btc',
      amount: 1.5,
      addressTo: 'destination-address',
      networkIn: 'SOLANA',
      networkOut: 'BITCOIN',
    });
    expect(mockApiClientGet).not.toHaveBeenCalled();
    expect(result).toEqual(MOCK_EXCHANGE);
  });

  it('forwards a refund address when the caller supplies one', async () => {
    mockApiClientPost.mockResolvedValueOnce({ data: MOCK_EXCHANGE });

    await createBridgeExchange(
      'SOL',
      'BTC',
      1.5,
      'destination-address',
      'SOLANA',
      'BITCOIN',
      'source-chain-address'
    );

    expect(mockApiClientPost).toHaveBeenCalledWith(
      '/v1/bridge/exchange',
      expect.objectContaining({ refundAddress: 'source-chain-address' })
    );
  });

  it('omits refundAddress when the caller has no source address', async () => {
    mockApiClientPost.mockResolvedValueOnce({ data: MOCK_EXCHANGE });

    await createBridgeExchange('SOL', 'BTC', 1.5, 'destination-address');

    expect(mockApiClientPost.mock.calls[0][1]).not.toHaveProperty('refundAddress');
  });

  it('fetches a bridge transaction by id', async () => {
    mockApiClientGet.mockResolvedValueOnce({ data: MOCK_TRANSACTION });

    const result = await getBridgeTransaction('exchange-123');

    expect(mockApiClientGet).toHaveBeenCalledWith('/v1/bridge/transaction', {
      params: { id: 'exchange-123' },
    });
    expect(result).toEqual(MOCK_TRANSACTION);
  });

  it('wraps exchange creation failures with bridge-specific context', async () => {
    mockApiClientPost.mockRejectedValueOnce(new Error('exchange down'));

    await expect(createBridgeExchange('SOL', 'BTC', 1.5, 'destination-address')).rejects.toThrow(
      'Bridge create exchange failed: exchange down'
    );
  });
});

const backendBaseUrl = await getReachableBackendBaseUrl();

describe('bridge service integration', () => {
  it('reads the live bridge transaction endpoint contract from salmon-api', async () => {
    if (!backendBaseUrl) {
      console.log('Skipping live bridge integration assertions: backend not reachable');
      return;
    }

    const client = createApiClient({
      baseUrl: backendBaseUrl,
      timeout: 10000,
    });

    // StealthEX enforces a dynamic minimum per pair that drifts with market
    // conditions. Query it first so the integration test stays valid as the
    // min amount changes. Apply a 50% safety buffer to absorb sub-second
    // fluctuations between the minimal query and the exchange call.
    const minimalResponse = await client.get<{ min_amount: string; max_amount?: string }>(
      '/v1/bridge/minimal',
      {
        params: { symbolIn: 'sol', symbolOut: 'btc' },
      }
    );

    // Contract: min_amount is a decimal string; max_amount is additive and,
    // when present, must also be a positive decimal string.
    expect(typeof minimalResponse.data?.min_amount).toBe('string');
    if (minimalResponse.data?.max_amount !== undefined) {
      expect(typeof minimalResponse.data.max_amount).toBe('string');
      expect(Number(minimalResponse.data.max_amount)).toBeGreaterThan(0);
    }

    const minAmount = Number(minimalResponse.data?.min_amount);
    if (!Number.isFinite(minAmount) || minAmount <= 0) {
      throw new Error(
        `Invalid min_amount from /v1/bridge/minimal: ${minimalResponse.data?.min_amount}`
      );
    }

    const safeAmount = Number((minAmount * 1.5).toFixed(8));

    const exchangeResponse = await client.post<BridgeExchange>('/v1/bridge/exchange', {
      symbolIn: 'sol',
      symbolOut: 'btc',
      amount: safeAmount,
      addressTo: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      networkIn: 'SOLANA',
      networkOut: 'BITCOIN',
    });

    expect(exchangeResponse.status).toBe(200);
    expect(exchangeResponse.data.id).toBeTruthy();

    const response = await client.get<BridgeTransaction>('/v1/bridge/transaction', {
      params: { id: exchangeResponse.data.id },
    });

    expect(response.status).toBe(200);
    expect(response.data.id).toBe(exchangeResponse.data.id);
    expect(response.data.status).toBeTruthy();
  }, 20000);
});

// ============================================================================
// Partner fee disclosure
// ============================================================================

describe('bridge partner fee disclosure', () => {
  it('states the rate the backend actually charges', () => {
    expect(BRIDGE_PARTNER_FEE_PERCENT).toBe(0.4);
    // Rendered by both bridge review screens with the swap's own formatter,
    // so the two disclosures read identically ("0.50%" / "0.40%").
    expect(formatPercent(BRIDGE_PARTNER_FEE_PERCENT)).toBe('0.40%');
  });

  it('matches STEALTHEX_PARTNER_FEE in the sibling salmon-api repo', async () => {
    // The fee lives in the backend; this constant only discloses it. If the
    // sibling repo is not checked out next to this one, there is nothing to
    // compare against — skip rather than fail (CI has no salmon-api).
    const { readFileSync, existsSync } = await import('node:fs');
    const servicePath = new URL(
      '../../../../../../salmon-api/src/services/shared/bridge-service.js',
      import.meta.url
    ).pathname;

    if (!existsSync(servicePath)) {
      console.log('Skipping partner-fee drift check: ../salmon-api not present');
      return;
    }

    const source = readFileSync(servicePath, 'utf8');
    // The backend renamed this from STEALTHEX_PARTNER_FEE and dropped the
    // quotes; the pattern accepts either spelling so a rename does not read as
    // a fee drift, which is the only thing this check is here to catch.
    const match = source.match(/(?:STEALTHEX_PARTNER_FEE|PARTNER_FEE_PERCENT)\s*=\s*'?([\d.]+)'?/);

    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(BRIDGE_PARTNER_FEE_PERCENT);
  });
});
