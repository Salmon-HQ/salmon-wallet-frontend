import { describe, expect, it, vi } from 'vitest';
import { buildSwapProposal, formatFeeLine, swapProposalId } from './proposal';
import type { SwapBuildResponse } from './types';

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}));

const SOL = { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9, logo: 'sol.png' };
const USDC = { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6 };

function build(overrides: Partial<SwapBuildResponse> = {}): SwapBuildResponse {
  return {
    provider: '0x',
    providerDisplayName: '0x',
    attribution: 'Powered by 0x',
    transaction: 'AQ'.repeat(40),
    expiresAt: '2026-09-10T12:00:00.000Z',
    input: { mint: SOL.address, amount: '1000000000', decimals: 9, symbol: 'SOL' },
    output: { mint: USDC.address, amount: '150000000', minAmount: '149250000', decimals: 6, symbol: 'USDC' },
    route: [
      { label: 'Raydium', percent: 60 },
      { label: 'Orca', percent: 100 },
    ],
    priceImpactPct: 0.12,
    slippageBps: 50,
    inUsdValue: 150,
    outUsdValue: 149.8,
    salmonFee: { amount: '1275000', mint: USDC.address, side: 'output', bps: 85, decimals: 6, symbol: 'USDC' },
    routeFee: null,
    ...overrides,
  };
}

describe('buildSwapProposal', () => {
  const refresh = vi.fn();

  it('carries the unsigned bytes, the expiry and the refresh to core', () => {
    const proposal = buildSwapProposal(build(), { inToken: SOL, outToken: USDC, refresh });
    expect(proposal.transaction).toBe('AQ'.repeat(40));
    expect(proposal.expiresAt).toBe('2026-09-10T12:00:00.000Z');
    expect(proposal.refresh).toBe(refresh);
    expect(proposal.networkId).toBe('solana-mainnet');
    expect(proposal.id).toBe(swapProposalId(build()));
  });

  // Jupiter/0x licence terms and spec 027 §2: the Salmon fee is its own line,
  // never folded into the quote, and the provider is named from the response.
  it('shows the Salmon fee as its own line with amount and rate, and the attribution verbatim', () => {
    const proposal = buildSwapProposal(build(), { inToken: SOL, outToken: USDC, refresh });
    const fee = proposal.display.rows.find((row) => row.label === 'swap.review.salmonFee');
    expect(fee?.value).toBe('1.275 USDC (0.85%)');
    expect(proposal.display.attribution).toBe('Powered by 0x');
    expect(proposal.display.advancedRows).toContainEqual({
      label: 'swap.review.provider',
      value: '0x',
    });
    expect(proposal.display.rows.map((row) => row.label)).not.toContain('swap.review.routeFee');
  });

  it('adds the route fee line only when the provider charges one', () => {
    const proposal = buildSwapProposal(
      build({ routeFee: { amount: '500', mint: USDC.address, side: 'output', bps: 5, decimals: 6, symbol: 'USDC' } }),
      { inToken: SOL, outToken: USDC, refresh }
    );
    expect(proposal.display.rows).toContainEqual({
      label: 'swap.review.routeFee',
      value: '0.0005 USDC (0.05%)',
    });
  });

  it('renders the exchange from the build, not the form, with USD lines when a formatter is given', () => {
    const proposal = buildSwapProposal(build(), {
      inToken: SOL,
      outToken: USDC,
      refresh,
      formatUsd: (value) => `~$${value.toFixed(2)}`,
    });
    expect(proposal.display.exchange?.send).toMatchObject({
      symbol: 'SOL',
      amount: '1 SOL',
      usdValue: '~$150.00',
      logo: 'sol.png',
    });
    expect(proposal.display.exchange?.receive).toMatchObject({
      symbol: 'USDC',
      amount: '150 USDC',
      usdValue: '~$149.80',
      pendingAmount: true,
    });
    expect(proposal.display.pendingSubtitle).toBe('1 SOL → 150 USDC');
  });

  it('treats an unknown price impact as unknown, not zero', () => {
    const proposal = buildSwapProposal(build({ priceImpactPct: null, inUsdValue: null }), {
      inToken: SOL,
      outToken: USDC,
      refresh,
      formatUsd: (value) => `$${value}`,
    });
    expect(proposal.display.rows.map((row) => row.label)).not.toContain(
      'swap.review.totalPriceImpact'
    );
    expect(proposal.display.exchange?.send.usdValue).toBeUndefined();
  });

  it('joins the route legs by label and states the minimum received', () => {
    const proposal = buildSwapProposal(build(), { inToken: SOL, outToken: USDC, refresh });
    expect(proposal.display.advancedRows).toContainEqual(
      expect.objectContaining({ label: 'swap.review.route', value: 'Raydium → Orca' })
    );
    expect(proposal.display.rows).toContainEqual(
      expect.objectContaining({ label: 'swap.minimum_received', value: '149.25 USDC' })
    );
  });
});

describe('formatFeeLine', () => {
  it('formats the base-unit amount in the fee token with its rate', () => {
    expect(
      formatFeeLine({ amount: '2100000', mint: 'm', side: 'input', bps: 85, decimals: 9, symbol: 'SOL' })
    ).toBe('0.0021 SOL (0.85%)');
  });
});
