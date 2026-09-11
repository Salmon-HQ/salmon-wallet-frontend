import { describe, expect, it } from 'vitest';
import { buildMemoProposal, memoNoteBytes } from './useMemoScreenLogic';

describe('memo — the reference Powerup', () => {
  it('counts the note in UTF-8 bytes, as the Memo program does', () => {
    expect(memoNoteBytes('gm')).toBe(2);
    expect(memoNoteBytes('ñ')).toBe(2);
  });

  it('maps the flat envelope to the proposal core signs, contributor and attribution included', () => {
    const proposal = buildMemoProposal(
      {
        provider: 'memo',
        providerDisplayName: 'SPL Memo',
        attribution: null,
        transaction: 'AQ==',
        expiresAt: '2026-09-11T00:00:00Z',
        salmonFee: null,
        routeFee: null,
        contributor: { name: 'Fixture Labs', url: 'https://example.invalid' },
        note: 'gm from salmon',
        noteBytes: 14,
      },
      'solana-mainnet'
    );
    expect(proposal.transaction).toBe('AQ==');
    expect(proposal.networkId).toBe('solana-mainnet');
    expect(proposal.display.rows.map((row) => row.value)).toContain('gm from salmon');
    expect(proposal.display.attribution).toBeUndefined();
    expect(proposal.display.contributor?.name).toBe('Fixture Labs');
  });
});
