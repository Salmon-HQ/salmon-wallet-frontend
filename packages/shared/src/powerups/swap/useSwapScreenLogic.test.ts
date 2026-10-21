import { describe, expect, it } from 'vitest';
import {
  SWAP_CODES,
  assertEnvelopeMatches,
  buildSwapProposal,
  sortNativeFirst,
  swapBlocker,
  toBaseUnits,
  toSwapToken,
} from './useSwapScreenLogic';
import { SWAP_INSTRUCTIONS } from './expectation';
import { describePowerupBuildError } from '../backend/errors';
import { ApiError } from '../../api/client';
import { swapManifest } from './manifest';
import type { SwapBuildEnvelope } from './api';
import en from './locales/en.json';
import es from './locales/es.json';

const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const envelope = (overrides: Partial<SwapBuildEnvelope> = {}): SwapBuildEnvelope => ({
  provider: 'jupiter',
  providerDisplayName: 'Metis',
  attribution: 'Powered by Metis (Jupiter)',
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

const formatValue = (usd: number | null | undefined) => `$${usd?.toFixed(2)}`;

/** The picked tokens, as the wallet's own lists carry them: decimals and USD price. */
const pay = { address: SOL, name: 'Solana', symbol: 'SOL', decimals: 9, uiAmount: 1, price: 118 };
const receive = {
  address: USDC,
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  uiAmount: 0,
  price: 1,
};
const tokens = { pay, receive };

describe('swap — the proposal core signs', () => {
  it('maps the build into exchange sides, fee and quote rows, receipt and pending summary', () => {
    const proposal = buildSwapProposal(envelope(), {
      networkId: 'solana-mainnet',
      formatValue,
      destinations: [],
      sources: [],
      tokens,
    });

    expect(proposal.transaction).toBe('AQ==');
    expect(proposal.expect.allowedPrograms).toBe(swapManifest.programs);
    expect(proposal.expect.allowedInstructions).toBe(SWAP_INSTRUCTIONS);
    expect(proposal.display.exchange?.send).toMatchObject({
      symbol: 'SOL',
      amount: '0.01 SOL',
      usdValue: '$1.18',
    });
    expect(proposal.display.exchange?.receive).toMatchObject({
      symbol: 'USDC',
      amount: '1.174479 USDC',
      usdValue: '$1.17',
      emphasis: true,
    });
    const rows = Object.fromEntries(proposal.display.rows.map((row) => [row.label, row.value]));
    expect(rows['swap.review.rate']).toMatch(/^1 SOL ≈ .* USDC$/);
    expect(rows['swap.review.salmonFee']).toBe('swap.review.salmonFeeOutput');
    expect(rows['swap.review.minReceived']).toBe('1.168607 USDC');
    expect(rows['swap.review.routeFee']).toBeUndefined();
    const advanced = Object.fromEntries(
      (proposal.display.advancedRows ?? []).map((row) => [row.label, row.value])
    );
    expect(advanced['swap.review.slippage']).toBe('0.5%');
    expect(advanced['swap.review.priceImpact']).toBe('0.47%');
    expect(advanced['swap.review.route']).toBe('Whirlpool');
    expect(proposal.display.attribution).toBe('Powered by Metis (Jupiter)');
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
      envelope({ priceImpactPct: 0, routeFee: { bps: 15 }, salmonFee: null, provider: '0x' }),
      {
        networkId: 'solana-mainnet',
        formatValue,
        destinations: [],
        sources: [],
        tokens: { pay, receive: { ...receive, price: 0.9 } },
      }
    );
    expect(proposal.display.warning).toEqual({
      title: 'swap.review.highImpactTitle',
      body: 'swap.review.highImpactBody',
    });
    const rows = Object.fromEntries(proposal.display.rows.map((row) => [row.label, row.value]));
    expect(rows['swap.review.routeFee']).toBe('0.15%');
    expect(rows['swap.review.salmonFee']).toBe('swap.review.noSalmonFee');
    expect(proposal.display.receipt?.fee).toBeUndefined();
  });

  // T&C Power-ups 1.4 §10.2: the review says which side the Salmon fee comes
  // out of, says so when there is none, and discloses 0x's own terms.
  describe('fee disclosure (T&C §10.2)', () => {
    const rowsOf = (env: SwapBuildEnvelope) =>
      Object.fromEntries(
        buildSwapProposal(env, {
          networkId: 'solana-mainnet',
          formatValue,
          destinations: [],
          sources: [],
          tokens,
        }).display.rows.map((row) => [row.label, row.value])
      );

    it('says the fee is taken from what you receive when it is charged on the output', () => {
      expect(rowsOf(envelope())['swap.review.salmonFee']).toBe('swap.review.salmonFeeOutput');
    });

    it('says the fee is taken from what you pay when it is charged on the input', () => {
      const env = envelope({
        salmonFee: {
          amount: '50000',
          mint: SOL,
          side: 'input',
          bps: 50,
          decimals: 9,
          symbol: 'SOL',
        },
      });
      expect(rowsOf(env)['swap.review.salmonFee']).toBe('swap.review.salmonFeeInput');
    });

    it('keeps the Salmon fee row and says there is no fee when none is charged', () => {
      expect(rowsOf(envelope({ salmonFee: null }))['swap.review.salmonFee']).toBe(
        'swap.review.noSalmonFee'
      );
    });

    it("shows 0x's fee and price-improvement terms on 0x routes only", () => {
      const zeroEx = rowsOf(envelope({ provider: '0x' }));
      expect(zeroEx['swap.review.zeroExFee']).toBe('swap.review.zeroExFeeValue');
      expect(zeroEx['swap.review.priceImprovement']).toBe('swap.review.priceImprovementValue');
      const jupiter = rowsOf(envelope({ provider: 'jupiter' }));
      expect(jupiter['swap.review.zeroExFee']).toBeUndefined();
      expect(jupiter['swap.review.priceImprovement']).toBeUndefined();
    });

    it('carries the approved copy in both languages', () => {
      expect(es.review.salmonFeeOutput).toBe(
        '{{amount}} ({{percent}}), se descuenta de lo que recibís'
      );
      expect(en.review.salmonFeeInput).toBe('{{amount}} ({{percent}}), taken from what you pay');
      expect(es.review.noSalmonFee).toBe('Sin cargo en este swap');
      expect(en.review.priceImprovementValue).toBe(
        'If it executes at a better price than quoted, 0x keeps the difference'
      );
    });
  });

  it('keeps the refresh so core can rebuild an expired quote', async () => {
    const refreshed = buildSwapProposal(envelope({ transaction: 'Ag==' }), {
      networkId: 'solana-mainnet',
      formatValue,
      destinations: [],
      sources: [],
      tokens,
    });
    const proposal = buildSwapProposal(envelope(), {
      networkId: 'solana-mainnet',
      formatValue,
      destinations: [],
      sources: [],
      tokens,
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

  it('presents the wrapped-SOL catalogue entry as SOL, and lists it first', () => {
    const wsol = toSwapToken({ address: SOL, symbol: 'WSOL', name: 'Wrapped SOL', decimals: 9 });
    expect(wsol).toMatchObject({ address: SOL, symbol: 'SOL', name: 'Solana' });
    expect(wsol.logo).toContain('solana');
    const usdc = toSwapToken({ address: USDC, symbol: 'USDC', name: 'USD Coin', decimals: 6 });
    expect(sortNativeFirst([usdc, wsol]).map((token) => token.symbol)).toEqual(['SOL', 'USDC']);
    expect(sortNativeFirst([usdc])).toEqual([usdc]);
  });

  describe('what stops a swap before it is asked for', () => {
    it('asks for more SOL when the wallet cannot pay the fee and the token accounts', () => {
      expect(swapBlocker({ nativeSol: 0.0001 })).toEqual({
        key: 'swap.errors.insufficientSolFor',
        params: { amount: expect.stringMatching(/^0\.\d+$/) },
      });
    });

    it('sets no minimum of its own: the providers decide what routes', () => {
      expect(swapBlocker({ nativeSol: 1 })).toBeNull();
    });

    it('waits for the balance before judging the SOL', () => {
      expect(swapBlocker({ nativeSol: undefined })).toBeNull();
    });
  });

  it('gives every backend refusal of the swap route its own copy', () => {
    const describe = (code: string) =>
      describePowerupBuildError(new ApiError('x', 422, code), { codes: SWAP_CODES });
    expect(describe('slippage_exceeded')).toEqual({
      kind: 'message',
      message: 'swap.errors.slippageExceeded',
    });
    expect(describe('insufficient_funds')).toEqual({
      kind: 'message',
      message: 'swap.errors.insufficientFunds',
    });
    expect(describe('insufficient_sol')).toEqual({
      kind: 'message',
      message: 'swap.errors.insufficientSol',
    });
    expect(describe('token_not_supported')).toEqual({
      kind: 'message',
      message: 'swap.errors.tokenNotSupported',
    });
    expect(describe('no_route')).toEqual({
      kind: 'message',
      message: 'transaction.errors.noRoute',
    });
    expect(describe('simulation_failed')).toEqual({
      kind: 'message',
      message: 'transaction.errors.simulationFailed',
    });
    expect(describe('region_restricted')).toEqual({ kind: 'unavailable', reason: 'region' });
    expect(describe('wallet_restricted')).toEqual({ kind: 'unavailable', reason: 'wallet' });
  });

  describe('holding the build to the request', () => {
    const facts = { payToken: pay, receiveToken: receive, amount: '0.01' };

    it('converts a typed amount to base units exactly', () => {
      expect(toBaseUnits('0.01', 9)).toBe('10000000');
      expect(toBaseUnits('1', 6)).toBe('1000000');
      expect(toBaseUnits('0.1234567891', 9)).toBe('123456789');
      expect(toBaseUnits('12.5', 0)).toBe('12');
      expect(toBaseUnits('abc', 9)).toBe('');
    });

    it('accepts the build the user asked for', () => {
      expect(() => assertEnvelopeMatches(envelope(), facts)).not.toThrow();
    });

    it.each([
      ['input mint', { input: { ...envelope().input, mint: USDC } }],
      ['output mint', { output: { ...envelope().output, mint: SOL } }],
      ['input decimals', { input: { ...envelope().input, decimals: 6 } }],
      ['input decimals', { input: { ...envelope().input, decimals: undefined } }],
      ['output decimals', { output: { ...envelope().output, decimals: 9 } }],
      ['output decimals', { output: { ...envelope().output, decimals: undefined } }],
      [
        'fee mint',
        {
          salmonFee: {
            ...envelope().salmonFee,
            mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
          },
        },
      ],
      ['input amount', { input: { ...envelope().input, amount: '10000001' } }],
      ['minimum', { output: { ...envelope().output, minAmount: '9999999999' } }],
      ['slippage', { slippageBps: 5000 }],
      ['output amount', { output: { ...envelope().output, amount: 'lots' } }],
    ])("refuses a build whose %s is not the request's", (why, overrides) => {
      expect(() => assertEnvelopeMatches(envelope(overrides as never), facts)).toThrow(why);
    });

    it('refuses a build for a token whose decimals the wallet does not know', () => {
      const unknown = { ...receive, decimals: undefined as unknown as number };
      expect(() => assertEnvelopeMatches(envelope(), { ...facts, receiveToken: unknown })).toThrow(
        'output decimals'
      );
    });

    // The backend's figures are not shown: a build that says it pays 15,000
    // USDC worth $15,000 is drawn from the bytes' base units, the wallet's own
    // decimals and the wallet's own prices.
    it('scales and values every amount by the wallet’s own token data, never the build’s', () => {
      const proposal = buildSwapProposal(
        envelope({
          output: { ...envelope().output, decimals: 0 },
          inUsdValue: 15_000,
          outUsdValue: 15_000,
          priceImpactPct: 0,
        }),
        { networkId: 'solana-mainnet', formatValue, destinations: [], sources: [], tokens }
      );
      expect(proposal.display.exchange?.send).toMatchObject({
        amount: '0.01 SOL',
        usdValue: '$1.18',
      });
      expect(proposal.display.exchange?.receive).toMatchObject({
        amount: '1.174479 USDC',
        usdValue: '$1.17',
      });
      const rows = Object.fromEntries(proposal.display.rows.map((row) => [row.label, row.value]));
      expect(rows['swap.review.minReceived']).toBe('1.168607 USDC');
      expect(proposal.pending).toEqual({ kind: 'send', summary: '0.01 SOL → 1.174479 USDC' });
    });

    it('drops the dollar values and the price impact it cannot check', () => {
      const unpriced = {
        pay: { ...pay, price: undefined },
        receive: { ...receive, price: undefined },
      };
      const proposal = buildSwapProposal(
        envelope({ inUsdValue: 15_000, outUsdValue: 15_000, priceImpactPct: 0.01 }),
        {
          networkId: 'solana-mainnet',
          formatValue,
          destinations: [],
          sources: [],
          tokens: unpriced,
        }
      );
      expect(proposal.display.exchange?.send.usdValue).toBeUndefined();
      expect(proposal.display.exchange?.receive.usdValue).toBeUndefined();
      const advanced = Object.fromEntries(
        (proposal.display.advancedRows ?? []).map((row) => [row.label, row.value])
      );
      expect(advanced['swap.review.priceImpact']).toBe('—');
      expect(proposal.display.warning).toBeUndefined();
    });

    it('names and draws the picked tokens, not what the backend says', () => {
      const proposal = buildSwapProposal(
        envelope({
          input: { ...envelope().input, symbol: 'USDC', logo: 'evil.png' },
          output: { ...envelope().output, symbol: 'SOL', logo: 'evil2.png' },
        }),
        {
          networkId: 'solana-mainnet',
          formatValue,
          destinations: [],
          sources: [],
          tokens: { pay, receive },
        }
      );
      expect(proposal.display.exchange?.send).toMatchObject({ symbol: 'SOL', logo: undefined });
      expect(proposal.display.exchange?.receive).toMatchObject({ symbol: 'USDC', logo: undefined });
      const advanced = Object.fromEntries(
        (proposal.display.advancedRows ?? []).map((row) => [row.label, row.value])
      );
      expect(advanced['swap.review.payMint']).toMatch(/^So1111.*112$/);
      expect(advanced['swap.review.receiveMint']).toMatch(/^EPjFWd.*Dt1v$/);
    });

    it("keeps a search result's own tags instead of calling it verified", () => {
      const scam = toSwapToken(
        { address: 'scam', symbol: 'USDC', name: 'USDC', decimals: 6, tags: ['unknown'] },
        { verified: false }
      );
      expect(scam.tags).toEqual(['unknown']);
      const bare = toSwapToken(
        { address: 'x', symbol: 'X', name: 'X', decimals: 6 },
        { verified: false }
      );
      expect(bare.tags).toEqual([]);
    });
  });
});
