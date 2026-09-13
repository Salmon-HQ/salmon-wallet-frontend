import { describe, expect, it } from 'vitest';
import { summarizeKaminoObligations } from './positions';

const market = { name: 'SOL/BTC Market', lendingMarket: '7u3H' };
const stats = (deposit: string, borrow: string, net: string, ltv = '0.2', liq = '0.9') => ({
  userTotalDeposit: deposit,
  userTotalBorrow: borrow,
  netAccountValue: net,
  loanToValue: ltv,
  liquidationLtv: liq,
});

describe('kamino-positions — one card per loan, in USD', () => {
  it('reads the refreshed totals, drops empty loans, and sorts by net value', () => {
    const positions = summarizeKaminoObligations([
      {
        market,
        obligations: [
          { obligationAddress: 'small', humanTag: 'Vanilla', refreshedStats: stats('1', '0', '1') },
          { obligationAddress: 'empty', humanTag: 'Vanilla', refreshedStats: stats('0', '0', '0') },
          {
            obligationAddress: 'big',
            humanTag: 'Multiply',
            refreshedStats: stats('0.675', '0.157', '0.518', '0.2327', '0.92'),
          },
        ],
      },
    ]);
    expect(positions.map((p) => p.id)).toEqual(['small', 'big']);
    expect(positions[1]).toMatchObject({
      marketName: 'SOL/BTC Market',
      kind: 'Multiply',
      depositUsd: 0.675,
      borrowUsd: 0.157,
      netUsd: 0.518,
      loanToValue: 0.2327,
      liquidationLtv: 0.92,
    });
  });

  it('survives a stats block with garbage or missing numbers', () => {
    const positions = summarizeKaminoObligations([
      {
        market,
        obligations: [
          { obligationAddress: 'odd', refreshedStats: stats('abc', '2', undefined as never) },
        ],
      },
    ]);
    expect(positions[0]).toMatchObject({ depositUsd: 0, borrowUsd: 2, netUsd: 0, kind: undefined });
  });
});

describe('kamino-positions — the card', () => {
  it('lists the four facts, tones the net value, and names the market with its kind', async () => {
    const { kaminoPositionRows, kaminoPositionTitle } = await import('./format');
    const position = {
      id: 'x',
      marketName: 'SOL/BTC Market',
      kind: 'Multiply',
      depositUsd: 0.675,
      borrowUsd: 0.157,
      netUsd: 0.518,
      loanToValue: 0.2327,
      liquidationLtv: 0.92,
    };
    const t = (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key;
    const rows = kaminoPositionRows(position, t, (v) => `$${v}`, 'en');
    expect(rows.map((r) => r.key)).toEqual(['deposited', 'borrowed', 'net', 'ltv']);
    expect(rows[2]).toMatchObject({ value: '$0.518', valueTone: 'success' });
    expect(rows[3].value).toContain('23.27%');
    expect(rows[3].value).toContain('92.00%');
    expect(kaminoPositionTitle(position)).toBe('SOL/BTC Market · Multiply');
    expect(kaminoPositionTitle({ ...position, kind: undefined })).toBe('SOL/BTC Market');
  });
});
