import { describe, expect, it, vi } from 'vitest';
import type { SolanaRpc } from './networks';
import { findTransferRequestSettlement } from './transfer-request-settlement';

const REFERENCE = '82ZJ7nbGpixjeDCmEhUcmwXYfvurzAgGdtSMuHnUgyny';
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const OWNER = 'mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN';
const PAYER = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

const query = { reference: REFERENCE, mint: MINT, recipientOwner: OWNER, amountAtomic: '500000' };

const thunk = <T>(value: T) => vi.fn().mockReturnValue({ send: async () => value });

function balances(pre: string, post: string, mint = MINT, owner = OWNER) {
  return {
    preTokenBalances: [{ accountIndex: 1, mint, owner, uiTokenAmount: { amount: pre } }],
    postTokenBalances: [{ accountIndex: 1, mint, owner, uiTokenAmount: { amount: post } }],
  };
}

function tx(meta: Record<string, unknown>, err: unknown = null) {
  return {
    blockTime: 1_700_000_000n,
    meta: { err, ...meta },
    transaction: { message: { accountKeys: [{ pubkey: PAYER }] } },
  };
}

function rpcWith(signatures: unknown[], transactions: Record<string, unknown>) {
  const getTransaction = vi.fn((signature: string) => ({
    send: async () => transactions[signature] ?? null,
  }));
  return {
    rpc: { getSignaturesForAddress: thunk(signatures), getTransaction } as unknown as SolanaRpc,
    getTransaction,
  };
}

describe('findTransferRequestSettlement', () => {
  it('settles on a finalized transfer of exactly the amount to the owner', async () => {
    const { rpc } = rpcWith([{ signature: 'sig1', err: null }], {
      sig1: tx(balances('1000000', '1500000')),
    });
    await expect(findTransferRequestSettlement(rpc, query)).resolves.toEqual({
      signature: 'sig1',
      payer: PAYER,
      blockTime: 1_700_000_000,
    });
  });

  it.each([
    ['a different amount', balances('0', '400000')],
    ['a different mint', balances('0', '500000', 'So11111111111111111111111111111111111111112')],
    ['an account the receiver does not own', balances('0', '500000', MINT, PAYER)],
    ['no token balances at all', {}],
  ])('stays pending on %s', async (_label, meta) => {
    const { rpc } = rpcWith([{ signature: 'sig1', err: null }], { sig1: tx(meta) });
    await expect(findTransferRequestSettlement(rpc, query)).resolves.toBeNull();
  });

  it('skips an errored signature and a failed transaction, and keeps looking', async () => {
    const { rpc, getTransaction } = rpcWith(
      [
        { signature: 'failed-at-index', err: { InstructionError: [0, 'Custom'] } },
        { signature: 'failed-meta', err: null },
        { signature: 'good', err: null },
      ],
      {
        'failed-meta': tx(balances('0', '500000'), { InstructionError: [1, 'Custom'] }),
        good: tx(balances('0', '500000')),
      }
    );
    const settlement = await findTransferRequestSettlement(rpc, query);
    expect(settlement?.signature).toBe('good');
    expect(getTransaction).not.toHaveBeenCalledWith('failed-at-index', expect.anything());
  });

  it('asks the network at finalized and by the reference', async () => {
    const { rpc } = rpcWith([], {});
    await expect(findTransferRequestSettlement(rpc, query)).resolves.toBeNull();
    expect(rpc.getSignaturesForAddress).toHaveBeenCalledWith(REFERENCE, {
      limit: 12,
      commitment: 'finalized',
    });
  });

  it('lets an RPC failure through so the caller keeps its last state', async () => {
    const rpc = {
      getSignaturesForAddress: vi.fn().mockReturnValue({
        send: async () => {
          throw new Error('rpc down');
        },
      }),
    } as unknown as SolanaRpc;
    await expect(findTransferRequestSettlement(rpc, query)).rejects.toThrow('rpc down');
  });
});

describe('who paid', () => {
  const RELAYER = 'GDDMwNyyx8uB6zrqwBFHjLLG3TBYk2F8Az4yrQC5RzMp';

  it('names the account whose tokens left, not whoever paid the fee', async () => {
    const meta = {
      preTokenBalances: [
        { accountIndex: 1, mint: MINT, owner: OWNER, uiTokenAmount: { amount: '0' } },
        { accountIndex: 2, mint: MINT, owner: PAYER, uiTokenAmount: { amount: '900000' } },
      ],
      postTokenBalances: [
        { accountIndex: 1, mint: MINT, owner: OWNER, uiTokenAmount: { amount: '500000' } },
        { accountIndex: 2, mint: MINT, owner: PAYER, uiTokenAmount: { amount: '400000' } },
      ],
    };
    const { rpc } = rpcWith([{ signature: 'sig1', err: null }], {
      sig1: {
        blockTime: 1_700_000_000n,
        meta: { err: null, ...meta },
        transaction: { message: { accountKeys: [{ pubkey: RELAYER }] } },
      },
    });
    await expect(findTransferRequestSettlement(rpc, query)).resolves.toMatchObject({
      payer: PAYER,
    });
  });

  it('falls back to the fee payer when no token account was debited on chain', async () => {
    const { rpc } = rpcWith([{ signature: 'sig1', err: null }], {
      sig1: tx(balances('1000000', '1500000')),
    });
    await expect(findTransferRequestSettlement(rpc, query)).resolves.toMatchObject({
      payer: PAYER,
    });
  });
});
