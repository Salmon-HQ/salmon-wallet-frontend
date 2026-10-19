import { describe, expect, it } from 'vitest';
import { startTestAnalytics } from '../../test-utils/analytics';
import { buildMemoProposal, memoNoteBytes, type MemoBuildEnvelope } from './useMemoScreenLogic';

const ENVELOPE: MemoBuildEnvelope = {
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
};

describe('memo — the reference Powerup', () => {
  it('counts the note in UTF-8 bytes, as the Memo program does', () => {
    expect(memoNoteBytes('gm')).toBe(2);
    expect(memoNoteBytes('ñ')).toBe(2);
  });

  it('maps the flat envelope to the proposal core signs, contributor and attribution included', () => {
    const proposal = buildMemoProposal(ENVELOPE, 'solana-mainnet');
    expect(proposal.transaction).toBe('AQ==');
    expect(proposal.networkId).toBe('solana-mainnet');
    expect(proposal.display.rows.map((row) => row.value)).toContain('gm from salmon');
    expect(proposal.display.attribution).toBeUndefined();
    expect(proposal.display.contributor?.name).toBe('Fixture Labs');
  });

  it('reports each attempt as memo_sent with its outcome (FR-009)', async () => {
    const analytics = await startTestAnalytics();
    const proposal = buildMemoProposal(ENVELOPE, 'solana-mainnet');

    proposal.onOutcome?.(false);
    proposal.onOutcome?.(true);

    expect(await analytics.sent()).toEqual([
      { event: 'memo_sent', props: { success: false } },
      { event: 'memo_sent', props: { success: true } },
    ]);
  });
});
