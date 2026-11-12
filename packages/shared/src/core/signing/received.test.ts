/**
 * `signProposal` routes by proposal kind (spec 043). Kept out of
 * `index.test.ts`, which stays byte-identical (owner's before/after condition).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signProposal } from './index';
import type { ReceivedTransactionProposal, TransactionProposal } from '../confirmation/types';

const { signAndSend, sendReceived } = vi.hoisted(() => ({
  signAndSend: vi.fn(async () => 'sig-proposal'),
  sendReceived: vi.fn(async () => 'sig-received'),
}));
vi.mock('../broadcast', () => ({
  signAndSendSolanaTransaction: signAndSend,
  sendReceivedSolanaTransaction: sendReceived,
}));

const OWNER = 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';
const ACCOUNT = {
  signer: { address: OWNER },
  getRpc: vi.fn(),
  getRpcSubscriptions: vi.fn(),
} as never;
const display = { title: 'Review', rows: [], pendingTitle: 'Processing' };

beforeEach(() => {
  signAndSend.mockClear();
  sendReceived.mockClear();
});

describe('signProposal routes by kind', () => {
  it('sends a received proposal as is, for the address it was requested for', async () => {
    const proposal: ReceivedTransactionProposal = {
      id: 'r-1',
      source: 'received',
      networkId: 'solana-devnet',
      transaction: 'AQID',
      signer: OWNER,
      display,
    };

    expect(await signProposal(ACCOUNT, proposal)).toEqual({ signature: 'sig-received' });
    expect(sendReceived).toHaveBeenCalledWith(ACCOUNT, 'AQID', OWNER);
    expect(signAndSend).not.toHaveBeenCalled();
  });

  it('keeps a Powerup proposal on the declared-effects path, fee payer from the signer', async () => {
    const proposal: TransactionProposal = {
      id: 'p-1',
      networkId: 'solana-mainnet',
      transaction: 'AQID',
      expect: { allowedPrograms: ['11111111111111111111111111111111'] },
      display,
    };

    expect(await signProposal(ACCOUNT, proposal)).toEqual({ signature: 'sig-proposal' });
    expect(signAndSend).toHaveBeenCalledWith(ACCOUNT, 'AQID', {
      feePayer: OWNER,
      allowedPrograms: ['11111111111111111111111111111111'],
    });
    expect(sendReceived).not.toHaveBeenCalled();
  });
});
