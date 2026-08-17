import { afterEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const getSignatureStatusesMock = vi.fn(() => ({ send: sendMock }));

vi.mock('@solana/kit', () => ({
  createSolanaRpc: () => ({ getSignatureStatuses: getSignatureStatusesMock }),
  signature: (s: string) => s,
}));

import { getSolanaSignatureOutcomes, BLOCKHASH_EXPIRY_CEILING_MS } from './signature-status';

const NET = 'solana-mainnet';
const NOW = 1_000_000_000_000;

function statuses(...value: unknown[]) {
  sendMock.mockResolvedValueOnce({ value });
}

describe('getSolanaSignatureOutcomes', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports confirmed for a signature the cluster voted on', async () => {
    statuses({ err: null, confirmationStatus: 'confirmed' });

    const outcomes = await getSolanaSignatureOutcomes(
      NET,
      [{ signature: 'sig-1', submittedAt: NOW }],
      NOW
    );

    expect(outcomes).toEqual({ 'sig-1': 'confirmed' });
  });

  it('reports failed when the transaction landed with an error', async () => {
    statuses({ err: { InstructionError: [0, 'Custom'] }, confirmationStatus: 'finalized' });

    const outcomes = await getSolanaSignatureOutcomes(
      NET,
      [{ signature: 'sig-2', submittedAt: NOW }],
      NOW
    );

    // Landed and reverted — the fee was spent. Never conflated with `expired`.
    expect(outcomes).toEqual({ 'sig-2': 'failed' });
  });

  it('keeps a merely processed signature pending', async () => {
    statuses({ err: null, confirmationStatus: 'processed' });

    const outcomes = await getSolanaSignatureOutcomes(
      NET,
      [{ signature: 'sig-3', submittedAt: NOW }],
      NOW
    );

    expect(outcomes).toEqual({ 'sig-3': 'pending' });
  });

  it('stays pending for an unknown signature still inside its blockhash window', async () => {
    statuses(null);

    const outcomes = await getSolanaSignatureOutcomes(
      NET,
      [{ signature: 'sig-4', submittedAt: NOW - 10_000 }],
      NOW
    );

    expect(outcomes).toEqual({ 'sig-4': 'pending' });
    expect(getSignatureStatusesMock).toHaveBeenCalledWith(['sig-4'], {
      searchTransactionHistory: false,
    });
  });

  it('declares expired once the blockhash window has closed and the ledger was searched', async () => {
    statuses(null);

    const outcomes = await getSolanaSignatureOutcomes(
      NET,
      [{ signature: 'sig-5', submittedAt: NOW - BLOCKHASH_EXPIRY_CEILING_MS - 1_000 }],
      NOW
    );

    expect(outcomes).toEqual({ 'sig-5': 'expired' });
    // The ledger search is what makes the verdict safe: without it a confirmed
    // signature that fell out of the recent-status cache reads as `null`.
    expect(getSignatureStatusesMock).toHaveBeenCalledWith(['sig-5'], {
      searchTransactionHistory: true,
    });
  });

  it('never expires on a cache-only miss, even past the ceiling', async () => {
    // An old entry batched with a fresh one still forces the ledger search, so
    // this asserts the inverse: the ceiling alone is not sufficient. Here the
    // entry is old enough for the search, and the search finds it confirmed.
    statuses({ err: null, confirmationStatus: 'finalized' });

    const outcomes = await getSolanaSignatureOutcomes(
      NET,
      [{ signature: 'sig-6', submittedAt: NOW - BLOCKHASH_EXPIRY_CEILING_MS - 60_000 }],
      NOW
    );

    expect(outcomes).toEqual({ 'sig-6': 'confirmed' });
  });

  it('turns on the ledger search for the whole batch when any entry is old', async () => {
    statuses(null, { err: null, confirmationStatus: 'confirmed' });

    const outcomes = await getSolanaSignatureOutcomes(
      NET,
      [
        { signature: 'old', submittedAt: NOW - BLOCKHASH_EXPIRY_CEILING_MS - 1 },
        { signature: 'fresh', submittedAt: NOW - 1_000 },
      ],
      NOW
    );

    expect(outcomes).toEqual({ old: 'expired', fresh: 'confirmed' });
    expect(getSignatureStatusesMock).toHaveBeenCalledWith(['old', 'fresh'], {
      searchTransactionHistory: true,
    });
  });

  it('returns pending rather than a verdict for an unknown network', async () => {
    const outcomes = await getSolanaSignatureOutcomes(
      'solana-nonexistent',
      [{ signature: 'sig-7', submittedAt: 0 }],
      NOW
    );

    expect(outcomes).toEqual({ 'sig-7': 'pending' });
    expect(getSignatureStatusesMock).not.toHaveBeenCalled();
  });

  it('makes no RPC call for an empty batch', async () => {
    expect(await getSolanaSignatureOutcomes(NET, [], NOW)).toEqual({});
    expect(getSignatureStatusesMock).not.toHaveBeenCalled();
  });
});
