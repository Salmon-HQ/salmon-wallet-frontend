import { describe, expect, it, vi } from 'vitest';
import { SolanaOutcomeUnknownError } from './confirm';

vi.mock('../../core/broadcast/solana', () => ({
  signAndSendSolanaTransaction: vi.fn(async () => {
    throw new SolanaOutcomeUnknownError('sig-maybe' as never);
  }),
}));
// The flow checks every step before sending; this test is about the send.
vi.mock('../../core/verify', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  assertSolanaTransactionMatches: vi.fn(),
  bubblegumAssets: vi.fn(async () => new Map()),
}));

const { signAndSendPreparedSolanaTransactions } = await import('./prepared-transactions');

describe('signAndSendPreparedSolanaTransactions with an unknown outcome', () => {
  it('passes the unknown outcome through unwrapped, so the screen knows not to offer a retry', async () => {
    const account = {
      signer: { address: 'payer' },
      getRpc: () => ({}),
      getRpcSubscriptions: () => ({}),
    };

    await expect(
      signAndSendPreparedSolanaTransactions(
        account as never,
        { transactions: [{ transaction: 'AQ==', step: 'burn' }] },
        { nftAction: { asset: 'nft-mint' } } as never
      )
    ).rejects.toBeInstanceOf(SolanaOutcomeUnknownError);
  });
});
