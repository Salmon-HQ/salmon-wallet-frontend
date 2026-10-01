import { describe, expect, it } from 'vitest';
import { buildSwapProposal, toSwapToken } from './useSwapScreenLogic';
import { swapManifest } from './manifest';
import type { SwapBuildEnvelope } from './api';

const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const envelope = (overrides: Partial<SwapBuildEnvelope> = {}): SwapBuildEnvelope => ({
  provider: 'jupiter',
  providerDisplayName: 'Jupiter',
  attribution: 'Powered by Jupiter',
  providerRequestId: null,
  transaction: 'AQ==',
  expiresAt: '2026-10-01T00:00:00Z',
  input: { mint: SOL, amount: '10000000', decimals: 9, symbol: 'SOL', logo: 'sol.png' },
  output: {
    mint: USDC,
    amount: '1174479',
    minAmount: '1168607',
    decimals: 6,
    symbol: 'USDC',
    logo: 'usdc.png',
  },
  route: [
    { label: 'Whirlpool', percent: 100 },
    { label: 'Whirlpool', percent: 50 },
  ],
  priceImpactPct: 0.36,
  slippageBps: 50,
  inUsdValue: 1.18,
  outUsdValue: 1.17,
  salmonFee: { amount: '5902', mint: USDC, side: 'output', bps: 50, decimals: 6, symbol: 'USDC' },
  routeFee: null,
  ...overrides,
});

const formatValue = (usd: number | null | undefined) => `$${usd}`;

describe('swap — the proposal core signs', () => {
  it('maps the build into exchange sides, fee and quote rows, receipt and pending summary', () => {
    const proposal = buildSwapProposal(envelope(), { networkId: 'solana-mainnet', formatValue });

    expect(proposal.transaction).toBe('AQ==');
    expect(proposal.expect.allowedPrograms).toBe(swapManifest.programs);
    expect(proposal.display.exchange?.send).toMatchObject({
      symbol: 'SOL',
      amount: '0.01 SOL',
      usdValue: '$1.18',
    });
    expect(proposal.display.exchange?.receive).toMatchObject({
      symbol: 'USDC',
      amount: '1.174479 USDC',
      emphasis: true,
    });
    const rows = Object.fromEntries(proposal.display.rows.map((row) => [row.label, row.value]));
    expect(rows['swap.review.rate']).toMatch(/^1 SOL ≈ .* USDC$/);
    expect(rows['swap.review.salmonFee']).toBe('0.005902 USDC (0.5%)');
    expect(rows['swap.review.minReceived']).toBe('1.168607 USDC');
    expect(rows['swap.review.routeFee']).toBeUndefined();
    const advanced = Object.fromEntries(
      (proposal.display.advancedRows ?? []).map((row) => [row.label, row.value])
    );
    expect(advanced['swap.review.slippage']).toBe('0.5%');
    expect(advanced['swap.review.priceImpact']).toBe('0.36%');
    expect(advanced['swap.review.route']).toBe('Whirlpool');
    expect(proposal.display.attribution).toBe('Powered by Jupiter');
    expect(proposal.display.warning).toBeUndefined();
    expect(proposal.display.receipt).toEqual({
      title: 'swap.complete',
      rate: rows['swap.review.rate'],
      fee: '0.5%',
    });
    expect(proposal.pending).toEqual({ kind: 'send', summary: '0.01 SOL → 1.174479 USDC' });
    expect(proposal.display.pendingSubtitle).toBe('0.01 SOL → 1.174479 USDC');
  });

  it('warns on a high price impact and shows a provider fee when one is reported', () => {
    const proposal = buildSwapProposal(
      envelope({ priceImpactPct: 7.5, routeFee: { bps: 15 }, salmonFee: null, provider: '0x' }),
      { networkId: 'solana-mainnet', formatValue }
    );
    expect(proposal.display.warning).toEqual({
      title: 'swap.review.highImpactTitle',
      body: 'swap.review.highImpactBody',
    });
    const rows = Object.fromEntries(proposal.display.rows.map((row) => [row.label, row.value]));
    expect(rows['swap.review.routeFee']).toBe('0.15%');
    expect(rows['swap.review.salmonFee']).toBeUndefined();
    expect(proposal.display.receipt?.fee).toBeUndefined();
  });

  it('keeps the refresh so core can rebuild an expired quote', async () => {
    const refreshed = buildSwapProposal(envelope({ transaction: 'Ag==' }), {
      networkId: 'solana-mainnet',
      formatValue,
    });
    const proposal = buildSwapProposal(envelope(), {
      networkId: 'solana-mainnet',
      formatValue,
      refresh: async () => refreshed,
    });
    await expect(proposal.refresh?.()).resolves.toBe(refreshed);
    expect(proposal.id).not.toBe(refreshed.id);
  });

  it('reads a catalogue entry into the picker shape with no balance and the verified tag', () => {
    expect(
      toSwapToken({ address: USDC, symbol: 'USDC', name: 'USD Coin', decimals: 6, logo: 'u.png' })
    ).toEqual({
      address: USDC,
      name: 'USD Coin',
      symbol: 'USDC',
      logo: 'u.png',
      decimals: 6,
      price: undefined,
      uiAmount: 0,
      tags: ['verified'],
    });
  });
});
