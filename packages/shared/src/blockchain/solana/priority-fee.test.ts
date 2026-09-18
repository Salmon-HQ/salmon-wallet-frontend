import { describe, expect, it, vi } from 'vitest';
import { AccountRole, address, type Instruction } from '@solana/kit';

import {
  PRIORITY_FEE_MAX_MICRO_LAMPORTS,
  PRIORITY_FEE_MIN_MICRO_LAMPORTS,
  resolvePriorityFeeMicroLamports,
  toPriorityFeeLamports,
  writableAccountsOf,
} from './priority-fee';
import type { SolanaRpc } from './networks';

const ADDRESS_A = address('11111111111111111111111111111111');
const ADDRESS_B = address('So11111111111111111111111111111111111111112');

const instruction = (accounts: { address: string; role: AccountRole }[]): Instruction =>
  ({ programAddress: ADDRESS_A, accounts }) as unknown as Instruction;

const rpcReporting = (fees: number[]) =>
  ({
    getRecentPrioritizationFees: vi.fn().mockReturnValue({
      send: async () => fees.map((fee, i) => ({ prioritizationFee: BigInt(fee), slot: BigInt(i) })),
    }),
  }) as unknown as SolanaRpc;

describe('writableAccountsOf', () => {
  it('collects only the accounts a transaction writes to', () => {
    const accounts = writableAccountsOf([
      instruction([
        { address: ADDRESS_A, role: AccountRole.WRITABLE },
        { address: ADDRESS_B, role: AccountRole.READONLY },
      ]),
    ]);
    expect(accounts).toEqual([ADDRESS_A]);
  });

  it('counts a writable signer as writable', () => {
    const accounts = writableAccountsOf([
      instruction([{ address: ADDRESS_B, role: AccountRole.WRITABLE_SIGNER }]),
    ]);
    expect(accounts).toEqual([ADDRESS_B]);
  });

  it('reports each account once, however many instructions touch it', () => {
    const accounts = writableAccountsOf([
      instruction([{ address: ADDRESS_A, role: AccountRole.WRITABLE }]),
      instruction([{ address: ADDRESS_A, role: AccountRole.WRITABLE }]),
    ]);
    expect(accounts).toEqual([ADDRESS_A]);
  });

  it('survives an instruction with no accounts', () => {
    expect(writableAccountsOf([{ programAddress: ADDRESS_A } as Instruction])).toEqual([]);
  });
});

describe('resolvePriorityFeeMicroLamports', () => {
  const anyInstruction = [instruction([{ address: ADDRESS_A, role: AccountRole.WRITABLE }])];

  it('bids the 75th percentile of what recently landed', async () => {
    // Sorted [0, 5_000, 12_000, 50_000]; the p75 index is 2.
    const fee = await resolvePriorityFeeMicroLamports(
      rpcReporting([50_000, 0, 12_000, 5_000]),
      anyInstruction
    );
    expect(fee).toBe(12_000);
  });

  it('keeps zero-fee blocks in the sample, so an idle network reads as cheap', async () => {
    const fee = await resolvePriorityFeeMicroLamports(rpcReporting([0, 0, 0, 0]), anyInstruction);
    expect(fee).toBe(PRIORITY_FEE_MIN_MICRO_LAMPORTS);
  });

  it('refuses to let one expensive block set the price', async () => {
    const fee = await resolvePriorityFeeMicroLamports(
      rpcReporting([900_000, 900_000, 900_000, 900_000]),
      anyInstruction
    );
    expect(fee).toBe(PRIORITY_FEE_MAX_MICRO_LAMPORTS);
  });

  it('bids the floor rather than nothing when the node will not answer', async () => {
    const rpc = {
      getRecentPrioritizationFees: vi.fn().mockReturnValue({
        send: async () => {
          throw new Error('rpc down');
        },
      }),
    } as unknown as SolanaRpc;
    expect(await resolvePriorityFeeMicroLamports(rpc, anyInstruction)).toBe(
      PRIORITY_FEE_MIN_MICRO_LAMPORTS
    );
  });

  it('bids the floor when the node has no recent fees to report', async () => {
    expect(await resolvePriorityFeeMicroLamports(rpcReporting([]), anyInstruction)).toBe(
      PRIORITY_FEE_MIN_MICRO_LAMPORTS
    );
  });

  it('asks about the accounts the transaction writes to', async () => {
    const rpc = rpcReporting([1_000]);
    await resolvePriorityFeeMicroLamports(rpc, anyInstruction);
    expect(rpc.getRecentPrioritizationFees).toHaveBeenCalledWith([ADDRESS_A]);
  });
});

describe('toPriorityFeeLamports', () => {
  it('converts a rate per compute unit into one total, as v1 wants it', () => {
    expect(toPriorityFeeLamports(12_000, 200_000)).toBe(2_400n);
  });

  it('rounds up, so the bid never lands under what was resolved', () => {
    expect(toPriorityFeeLamports(1, 1)).toBe(1n);
  });

  it('is zero when nothing is bid', () => {
    expect(toPriorityFeeLamports(0, 200_000)).toBe(0n);
  });
});
