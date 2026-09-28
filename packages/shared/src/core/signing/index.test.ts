import { describe, expect, it, vi } from 'vitest';
import { signProposal } from './index';
import { SolanaTransactionMismatchError, SYSTEM_PROGRAM, TOKEN_METADATA_PROGRAM } from '../verify';
import type { TransactionProposal } from '../confirmation/types';

/** A v0 transaction paying from AKnL…RSZ9 and invoking the System program. */
const FIXTURE_B64 =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQABAoqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAgACDAIAAAABAAAAAAAAAAHtSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QEAAA==';

const OWNER = 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';

/** An account whose RPC is a trap: reaching it means the check let this through. */
function accountThatMustNotBeUsed() {
  const getRpc = vi.fn(() => {
    throw new Error('the network was reached for a transaction that should have been refused');
  });
  return { signer: { address: OWNER }, getRpc, getRpcSubscriptions: vi.fn() } as never;
}

function proposal(expectOverride: TransactionProposal['expect']): TransactionProposal {
  return {
    id: 'p-1',
    networkId: 'solana-mainnet',
    transaction: FIXTURE_B64,
    expect: expectOverride,
    display: { title: 'Review', rows: [], pendingTitle: 'Processing' },
  };
}

describe('signProposal', () => {
  it('refuses a proposal whose transaction invokes a program it did not declare', async () => {
    await expect(
      signProposal(
        accountThatMustNotBeUsed(),
        proposal({ allowedPrograms: [TOKEN_METADATA_PROGRAM] })
      )
    ).rejects.toThrow(SolanaTransactionMismatchError);
  });

  it('refuses a proposal whose transaction pays from another account', async () => {
    const account = {
      signer: { address: 'So11111111111111111111111111111111111111112' },
      getRpc: vi.fn(),
      getRpcSubscriptions: vi.fn(),
    } as never;

    await expect(
      signProposal(account, proposal({ allowedPrograms: [SYSTEM_PROGRAM] }))
    ).rejects.toThrow(/pays from/);
  });
});
