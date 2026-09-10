/**
 * Solana Domain Name Services Tests
 *
 * Tests for:
 * - SNS (.sns domains, legacy .sol, via SNS SDK Kit)
 * - AllDomains (multiple TLDs via TldParser Kit)
 * - Combined functions with fallback
 *
 * Uses mocked responses when services are unavailable, or tests against real services if available.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { address, createSolanaRpc } from '@solana/kit';
import * as SnsSdkKit from '@solana-name-service/sns-sdk-kit';
import {
  getSnsDomain,
  resolveSnsDomain,
  SolDomainPausedError,
  getAllDomain,
  resolveAllDomain,
  getDomain,
  getDomainFromPublicKey,
  getPublicKeyFromDomain,
} from './domains';
import { SOLANA_NETWORKS } from './factory';
import type { SolanaRpc } from './networks';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the SNS SDK Kit
vi.mock('@solana-name-service/sns-sdk-kit', () => ({
  getPrimaryDomain: vi.fn(),
  resolve: vi.fn(),
  // The real class, so `instanceof` in domains.ts matches what the SDK throws.
  UnsupportedTldError: class UnsupportedTldError extends Error {},
}));

// Mock TldParser - must be mocked as a class
const mockGetMainDomain = vi.fn();
const mockGetOwnerFromDomainTld = vi.fn();

vi.mock('@onsol/tldparser-kit', () => ({
  TldParser: class MockTldParser {
    getMainDomain = mockGetMainDomain;
    getOwnerFromDomainTld = mockGetOwnerFromDomainTld;
  },
}));

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if Solana RPC is available for integration tests
 */
async function isRpcAvailable(nodeUrl: string): Promise<boolean> {
  try {
    const rpc = createSolanaRpc(nodeUrl);
    await rpc.getVersion().send();
    return true;
  } catch {
    return false;
  }
}

/**
 * The kit rpc client is a Proxy with no own enumerable properties, so
 * vitest's deep-equal in `toHaveBeenCalledWith` can't structurally compare
 * it (it reads back as `{}`). Assert the `rpc` field by reference and the
 * rest of the call's object argument by value.
 */
function expectCalledWithRpc(mockFn: any, expectedRpc: SolanaRpc, rest: Record<string, unknown>) {
  const actualArgs = mockFn.mock.calls.at(-1)?.[0];
  expect(actualArgs.rpc).toBe(expectedRpc);
  const { rpc: _rpc, ...actualRest } = actualArgs;
  expect(actualRest).toEqual(rest);
}

// ============================================================================
// Test Data
// ============================================================================

/**
 * Test addresses and domains
 */
const TEST_DATA = {
  // Known SNS domain (Bonfida example)
  solDomain: {
    name: 'bonfida',
    fullName: 'bonfida.sns',
    publicKey: address('HKKp49qGWXd639QsuH7JiLijfVW5UtCVY4s1n2HANwEA'),
    publicKeyString: 'HKKp49qGWXd639QsuH7JiLijfVW5UtCVY4s1n2HANwEA',
  },
  // Test AllDomains domain
  allDomain: {
    name: 'test.abc',
    publicKey: address('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK'),
    publicKeyString: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
    tld: '.abc',
  },
  // Test address without domain
  noDomain: {
    publicKey: address('11111111111111111111111111111111'),
    publicKeyString: '11111111111111111111111111111111',
  },
};

// ============================================================================
// SPL Name Service (.sol domains) Tests
// ============================================================================

describe('SPL Name Service (.sol domains)', () => {
  const network = SOLANA_NETWORKS['solana-mainnet'];
  let rpc: SolanaRpc;

  beforeEach(() => {
    vi.clearAllMocks();
    rpc = createSolanaRpc(network.config.nodeUrl);
  });

  describe('getSnsDomain', () => {
    it('should get .sol domain for a public key', async () => {
      // Mock SNS SDK Kit's getPrimaryDomain
      vi.mocked(SnsSdkKit.getPrimaryDomain).mockResolvedValueOnce({
        domainAddress: TEST_DATA.solDomain.publicKey,
        domainName: TEST_DATA.solDomain.name,
        stale: false,
      });

      const result = await getSnsDomain(rpc, TEST_DATA.solDomain.publicKey);

      expectCalledWithRpc(SnsSdkKit.getPrimaryDomain, rpc, {
        walletAddress: TEST_DATA.solDomain.publicKey,
      });
      expect(result).toBe(TEST_DATA.solDomain.fullName);
    });

    it('should append .sns extension to domain name', async () => {
      vi.mocked(SnsSdkKit.getPrimaryDomain).mockResolvedValueOnce({
        domainAddress: TEST_DATA.solDomain.publicKey,
        domainName: 'testdomain',
        stale: false,
      });

      const result = await getSnsDomain(rpc, TEST_DATA.solDomain.publicKey);

      expect(result).toBe('testdomain.sns');
    });

    it('should return null if no domain found', async () => {
      vi.mocked(SnsSdkKit.getPrimaryDomain).mockResolvedValueOnce({
        domainAddress: TEST_DATA.noDomain.publicKey,
        domainName: null as unknown as string,
        stale: false,
      });

      const result = await getSnsDomain(rpc, TEST_DATA.noDomain.publicKey);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      vi.mocked(SnsSdkKit.getPrimaryDomain).mockRejectedValueOnce(new Error('Domain not found'));

      const result = await getSnsDomain(rpc, TEST_DATA.noDomain.publicKey);

      expect(result).toBeNull();
    });

    it('should handle undefined domain in response', async () => {
      vi.mocked(SnsSdkKit.getPrimaryDomain).mockResolvedValueOnce({
        domainAddress: TEST_DATA.noDomain.publicKey,
        domainName: undefined as unknown as string,
        stale: false,
      });

      const result = await getSnsDomain(rpc, TEST_DATA.noDomain.publicKey);

      expect(result).toBeNull();
    });
  });

  describe('resolveSnsDomain', () => {
    it('should resolve .sol domain to public key', async () => {
      vi.mocked(SnsSdkKit.resolve).mockResolvedValueOnce(TEST_DATA.solDomain.publicKey);

      const result = await resolveSnsDomain(rpc, TEST_DATA.solDomain.fullName);

      expectCalledWithRpc(SnsSdkKit.resolve, rpc, {
        domain: TEST_DATA.solDomain.fullName,
      });
      expect(result).toBe(TEST_DATA.solDomain.publicKeyString);
    });

    it('should append .sns to a bare name', async () => {
      vi.mocked(SnsSdkKit.resolve).mockResolvedValueOnce(TEST_DATA.solDomain.publicKey);

      const result = await resolveSnsDomain(rpc, TEST_DATA.solDomain.name);

      expectCalledWithRpc(SnsSdkKit.resolve, rpc, {
        domain: TEST_DATA.solDomain.fullName,
      });
      expect(result).toBe(TEST_DATA.solDomain.publicKeyString);
    });

    it('passes a legacy .sol name through as typed, so the SDK serves the transition', async () => {
      vi.mocked(SnsSdkKit.resolve).mockResolvedValueOnce(TEST_DATA.solDomain.publicKey);

      const result = await resolveSnsDomain(rpc, 'bonfida.sol');

      expectCalledWithRpc(SnsSdkKit.resolve, rpc, { domain: 'bonfida.sol' });
      expect(result).toBe(TEST_DATA.solDomain.publicKeyString);
    });

    it('reports a paused .sol name instead of swallowing it, so the UI can point at .sns', async () => {
      vi.mocked(SnsSdkKit.resolve).mockRejectedValueOnce(
        new SnsSdkKit.UnsupportedTldError('unsupported')
      );

      await expect(resolveSnsDomain(rpc, 'bonfida.sol')).rejects.toBeInstanceOf(
        SolDomainPausedError
      );
    });

    it('treats an unsupported TLD on a .sns name as unresolved', async () => {
      vi.mocked(SnsSdkKit.resolve).mockRejectedValueOnce(
        new SnsSdkKit.UnsupportedTldError('unsupported')
      );

      expect(await resolveSnsDomain(rpc, 'bonfida.sns')).toBeNull();
    });

    it('should return null if domain not found', async () => {
      vi.mocked(SnsSdkKit.resolve).mockResolvedValueOnce(
        null as unknown as ReturnType<typeof address>
      );

      const result = await resolveSnsDomain(rpc, 'nonexistent.sol');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      vi.mocked(SnsSdkKit.resolve).mockRejectedValueOnce(new Error('Invalid domain'));

      const result = await resolveSnsDomain(rpc, 'invalid.sol');

      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// AllDomains (multiple TLDs) Tests
// ============================================================================

describe('AllDomains (multiple TLDs)', () => {
  const network = SOLANA_NETWORKS['solana-mainnet'];
  let rpc: SolanaRpc;

  beforeEach(() => {
    vi.clearAllMocks();
    rpc = createSolanaRpc(network.config.nodeUrl);
  });

  describe('getAllDomain', () => {
    it('should get AllDomains domain for a public key', async () => {
      mockGetMainDomain.mockResolvedValueOnce({
        domain: 'test',
        tld: '.abc',
        owner: TEST_DATA.allDomain.publicKey,
      });

      const result = await getAllDomain(rpc, TEST_DATA.allDomain.publicKey);

      expect(mockGetMainDomain).toHaveBeenCalledWith(TEST_DATA.allDomain.publicKey);
      expect(result).toBe(TEST_DATA.allDomain.name);
    });

    it('should concatenate domain and tld', async () => {
      mockGetMainDomain.mockResolvedValueOnce({
        domain: 'myname',
        tld: '.bonk',
        owner: TEST_DATA.allDomain.publicKey,
      });

      const result = await getAllDomain(rpc, TEST_DATA.allDomain.publicKey);

      expect(result).toBe('myname.bonk');
    });

    it('should return null if no domain found', async () => {
      mockGetMainDomain.mockResolvedValueOnce(null);

      const result = await getAllDomain(rpc, TEST_DATA.noDomain.publicKey);

      expect(result).toBeNull();
    });

    it('should return null if domain is missing', async () => {
      mockGetMainDomain.mockResolvedValueOnce({
        domain: null,
        tld: '.abc',
      });

      const result = await getAllDomain(rpc, TEST_DATA.noDomain.publicKey);

      expect(result).toBeNull();
    });

    it('should return null if tld is missing', async () => {
      mockGetMainDomain.mockResolvedValueOnce({
        domain: 'test',
        tld: null,
      });

      const result = await getAllDomain(rpc, TEST_DATA.noDomain.publicKey);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockGetMainDomain.mockRejectedValueOnce(new Error('Domain not found'));

      const result = await getAllDomain(rpc, TEST_DATA.noDomain.publicKey);

      expect(result).toBeNull();
    });
  });

  describe('resolveAllDomain', () => {
    it('should resolve AllDomains domain to public key', async () => {
      mockGetOwnerFromDomainTld.mockResolvedValueOnce(TEST_DATA.allDomain.publicKey);

      const result = await resolveAllDomain(rpc, TEST_DATA.allDomain.name);

      expect(mockGetOwnerFromDomainTld).toHaveBeenCalledWith(TEST_DATA.allDomain.name);
      expect(result).toBe(TEST_DATA.allDomain.publicKeyString);
    });

    it('should handle various TLDs', async () => {
      const domains = ['test.abc', 'myname.bonk', 'example.poor'];

      for (const domain of domains) {
        mockGetOwnerFromDomainTld.mockResolvedValueOnce(TEST_DATA.allDomain.publicKey);

        const result = await resolveAllDomain(rpc, domain);

        expect(mockGetOwnerFromDomainTld).toHaveBeenCalledWith(domain);
        expect(result).toBe(TEST_DATA.allDomain.publicKeyString);
      }
    });

    it('should return null if domain not found', async () => {
      mockGetOwnerFromDomainTld.mockResolvedValueOnce(null);

      const result = await resolveAllDomain(rpc, 'nonexistent.abc');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockGetOwnerFromDomainTld.mockRejectedValueOnce(new Error('Invalid domain'));

      const result = await resolveAllDomain(rpc, 'invalid.xyz');

      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// Combined Functions (with fallback) Tests
// ============================================================================

describe('Combined Domain Functions', () => {
  const network = SOLANA_NETWORKS['solana-mainnet'];
  let rpc: SolanaRpc;

  beforeEach(() => {
    vi.clearAllMocks();
    rpc = createSolanaRpc(network.config.nodeUrl);
  });

  describe('getDomain', () => {
    it('should try AllDomains first, then fall back to .sol', async () => {
      // AllDomains returns null
      mockGetMainDomain.mockResolvedValueOnce(null);

      // SNS SDK Kit returns a domain
      vi.mocked(SnsSdkKit.getPrimaryDomain).mockResolvedValueOnce({
        domainAddress: TEST_DATA.solDomain.publicKey,
        domainName: TEST_DATA.solDomain.name,
        stale: false,
      });

      const result = await getDomain(rpc, TEST_DATA.solDomain.publicKey);

      expect(mockGetMainDomain).toHaveBeenCalled();
      expect(SnsSdkKit.getPrimaryDomain).toHaveBeenCalled();
      expect(result).toBe(TEST_DATA.solDomain.fullName);
    });

    it('should return AllDomains result if found', async () => {
      mockGetMainDomain.mockResolvedValueOnce({
        domain: 'test',
        tld: '.abc',
        owner: TEST_DATA.allDomain.publicKey,
      });

      const result = await getDomain(rpc, TEST_DATA.allDomain.publicKey);

      expect(result).toBe(TEST_DATA.allDomain.name);
      // Should not call SNS SDK Kit if AllDomains succeeds
      expect(SnsSdkKit.getPrimaryDomain).not.toHaveBeenCalled();
    });

    it('should return null if both fail', async () => {
      mockGetMainDomain.mockResolvedValueOnce(null);
      vi.mocked(SnsSdkKit.getPrimaryDomain).mockResolvedValueOnce({
        domainAddress: TEST_DATA.noDomain.publicKey,
        domainName: null as unknown as string,
        stale: false,
      });

      const result = await getDomain(rpc, TEST_DATA.noDomain.publicKey);

      expect(result).toBeNull();
    });
  });

  describe('getDomainFromPublicKey', () => {
    it('should be an alias for getDomain', async () => {
      mockGetMainDomain.mockResolvedValueOnce({
        domain: 'test',
        tld: '.abc',
        owner: TEST_DATA.allDomain.publicKey,
      });

      const result = await getDomainFromPublicKey(rpc, TEST_DATA.allDomain.publicKey);

      expect(result).toBe(TEST_DATA.allDomain.name);
    });
  });

  describe('getPublicKeyFromDomain', () => {
    it('should use resolveSnsDomain for .sns domains', async () => {
      vi.mocked(SnsSdkKit.resolve).mockResolvedValueOnce(TEST_DATA.solDomain.publicKey);

      const result = await getPublicKeyFromDomain(rpc, 'bonfida.sns');

      expectCalledWithRpc(SnsSdkKit.resolve, rpc, { domain: 'bonfida.sns' });
      expect(result).toBe(TEST_DATA.solDomain.publicKeyString);
    });

    it('should use resolveSnsDomain for legacy .sol domains', async () => {
      vi.mocked(SnsSdkKit.resolve).mockResolvedValueOnce(TEST_DATA.solDomain.publicKey);

      const result = await getPublicKeyFromDomain(rpc, 'bonfida.sol');

      expectCalledWithRpc(SnsSdkKit.resolve, rpc, { domain: 'bonfida.sol' });
      expect(result).toBe(TEST_DATA.solDomain.publicKeyString);
    });

    it('should use resolveAllDomain for other TLDs', async () => {
      mockGetOwnerFromDomainTld.mockResolvedValueOnce(TEST_DATA.allDomain.publicKey);

      const result = await getPublicKeyFromDomain(rpc, 'test.abc');

      expect(mockGetOwnerFromDomainTld).toHaveBeenCalledWith('test.abc');
      expect(result).toBe(TEST_DATA.allDomain.publicKeyString);
    });

    it('should handle .bonk domain', async () => {
      mockGetOwnerFromDomainTld.mockResolvedValueOnce(TEST_DATA.allDomain.publicKey);

      const result = await getPublicKeyFromDomain(rpc, 'myname.bonk');

      expect(mockGetOwnerFromDomainTld).toHaveBeenCalledWith('myname.bonk');
      expect(result).toBe(TEST_DATA.allDomain.publicKeyString);
    });

    it('should handle .poor domain', async () => {
      mockGetOwnerFromDomainTld.mockResolvedValueOnce(TEST_DATA.allDomain.publicKey);

      const result = await getPublicKeyFromDomain(rpc, 'example.poor');

      expect(mockGetOwnerFromDomainTld).toHaveBeenCalledWith('example.poor');
      expect(result).toBe(TEST_DATA.allDomain.publicKeyString);
    });

    it('should return null if domain cannot be resolved', async () => {
      mockGetOwnerFromDomainTld.mockResolvedValueOnce(null);

      const result = await getPublicKeyFromDomain(rpc, 'nonexistent.xyz');

      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Domain Error Handling', () => {
  const network = SOLANA_NETWORKS['solana-mainnet'];
  let rpc: SolanaRpc;

  beforeEach(() => {
    vi.clearAllMocks();
    rpc = createSolanaRpc(network.config.nodeUrl);
  });

  it('should handle malformed domains gracefully', async () => {
    const malformedDomains = ['', '.sol', 'nodot', '..doubledot', 'spaces in name.sol'];

    for (const domain of malformedDomains) {
      vi.mocked(SnsSdkKit.resolve).mockRejectedValueOnce(new Error('Invalid domain'));

      const result = await resolveSnsDomain(rpc, domain);
      expect(result).toBeNull();
    }
  });

  it('should handle very long domain names', async () => {
    const longDomain = 'a'.repeat(1000) + '.sol';

    vi.mocked(SnsSdkKit.resolve).mockRejectedValueOnce(new Error('Domain too long'));

    const result = await resolveSnsDomain(rpc, longDomain);
    expect(result).toBeNull();
  });

  it('should handle network timeouts gracefully', async () => {
    vi.mocked(SnsSdkKit.getPrimaryDomain).mockRejectedValueOnce(new Error('Network timeout'));

    const result = await getSnsDomain(rpc, TEST_DATA.noDomain.publicKey);
    expect(result).toBeNull();
  });

  it('should handle invalid public keys in TldParser', async () => {
    mockGetMainDomain.mockRejectedValueOnce(new Error('Invalid public key'));

    const result = await getAllDomain(rpc, TEST_DATA.noDomain.publicKey);
    expect(result).toBeNull();
  });
});

// ============================================================================
// Integration Tests (Optional - only run if RPC is available)
// ============================================================================

describe('Domain Integration Tests (optional)', () => {
  const network = SOLANA_NETWORKS['solana-mainnet'];

  it('should resolve a real .sol domain round-trip if RPC available', async () => {
    const rpc = createSolanaRpc(network.config.nodeUrl);
    const available = await isRpcAvailable(network.config.nodeUrl);

    if (!available) {
      console.log('RPC not available, skipping integration test');
      return;
    }

    // Resolve a real favorite domain first, then verify forward lookup for the
    // same live value. This avoids brittle assumptions about historical domains.
    const publicKey = address('HKKp49qGWXd639QsuH7JiLijfVW5UtCVY4s1n2HANwEA');
    const domain = await getDomain(rpc, publicKey);

    if (!domain?.endsWith('.sol')) {
      console.log('No live .sol favorite domain available, skipping integration test');
      return;
    }

    const result = await resolveSnsDomain(rpc, domain);

    expect(result).toBe(publicKey);
  });

  it('should get real domain for public key if RPC available', async () => {
    const rpc = createSolanaRpc(network.config.nodeUrl);
    const available = await isRpcAvailable(network.config.nodeUrl);

    if (!available) {
      console.log('RPC not available, skipping integration test');
      return;
    }

    // Test with known public key (Bonfida)
    const publicKey = address('HKKp49qGWXd639QsuH7JiLijfVW5UtCVY4s1n2HANwEA');
    const result = await getDomain(rpc, publicKey);

    // May return null if the public key doesn't have a favorite domain set
    if (result) {
      expect(typeof result).toBe('string');
      expect(result).toMatch(/\./); // Should contain a dot (TLD separator)
    }
  });
});
