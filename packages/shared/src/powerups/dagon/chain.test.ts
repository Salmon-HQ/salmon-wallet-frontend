import { describe, expect, it, vi } from 'vitest';
import { getAddressEncoder, getBase64Decoder } from '@solana/kit';
import devnet from './fixtures/devnet.json';
import { parseDagonConfig } from './config';
import {
  balanceCtOf,
  digestOf,
  isSettled,
  isZeroDigest,
  pcAccountAddress,
  readAccounts,
  readPositions,
} from './chain';

const config = parseDagonConfig(devnet)!;
const OWNER = 'EWTW7CHSVCNqnEikcxXJzFtGGZSRUevdfPfzavYc1bfX';
const BALANCE_CT = 'CJbH1QaZ6YvJL4eh52EEKjtYpAQdqcVfMbYwQYHcN5t9';

/** A ciphertext account: digest at [2, 34), status byte at 99. */
function ciphertext(digestByte: number, status: number): Uint8Array {
  const data = new Uint8Array(100);
  data.fill(digestByte, 2, 34);
  data[99] = status;
  return data;
}

/** A pc-account naming `balanceCt` at [64, 96). */
function pcAccount(balanceCt: string): Uint8Array {
  const data = new Uint8Array(120);
  data.set(getAddressEncoder().encode(balanceCt as never), 64);
  return data;
}

const base64 = (data: Uint8Array) => [getBase64Decoder().decode(data), 'base64'] as const;
const accountInfo = (data: Uint8Array | null) => (data ? { data: base64(data) } : null);

describe('pcAccountAddress — GUIDE §2', () => {
  // Cross-checked with @solana/web3.js PublicKey.findProgramAddressSync.
  it('derives [b"pc_account", pcMint, owner] under pc-token', async () => {
    await expect(pcAccountAddress(config.sides.USDC.pcMint, OWNER)).resolves.toBe(
      'ANKUm9JP4fUXDgiKatqqjjngmtN96NfbNfGi84ToSNUQ'
    );
  });
});

describe('ciphertext reads', () => {
  it('reads the balance ciphertext from data[64..96]', () => {
    expect(balanceCtOf(pcAccount(BALANCE_CT))).toBe(BALANCE_CT);
  });

  it('detects the all-zero digest', () => {
    expect(isZeroDigest(ciphertext(0, 1))).toBe(true);
    expect(isZeroDigest(ciphertext(5, 1))).toBe(false);
  });

  // FR-027: both signals, never one alone.
  it('is settled only when the digest changed AND the status byte is 1', () => {
    const before = digestOf(ciphertext(1, 1));
    expect(isSettled(before, ciphertext(2, 1))).toBe(true);
    expect(isSettled(before, ciphertext(2, 0))).toBe(false);
    expect(isSettled(before, ciphertext(1, 1))).toBe(false);
    expect(isSettled(before, ciphertext(1, 0))).toBe(false);
    expect(isSettled(null, ciphertext(1, 1))).toBe(true);
    expect(isSettled(null, ciphertext(1, 0))).toBe(false);
    expect(isSettled(null, null)).toBe(false);
  });
});

describe('readAccounts — O1, one batched read per poll', () => {
  it('reads every watched ciphertext in one getMultipleAccounts', async () => {
    const getMultipleAccounts = vi.fn((_addresses: string[], _config: unknown) => ({
      send: async () => ({ value: [accountInfo(ciphertext(1, 1)), null] }),
    }));
    const result = await readAccounts({ getMultipleAccounts } as never, [BALANCE_CT, OWNER]);
    expect(getMultipleAccounts).toHaveBeenCalledTimes(1);
    expect(getMultipleAccounts.mock.calls[0][0]).toEqual([BALANCE_CT, OWNER]);
    expect(result[0]?.[99]).toBe(1);
    expect(result[1]).toBeNull();
  });

  it('makes no call for nothing to watch', async () => {
    const getMultipleAccounts = vi.fn();
    await expect(readAccounts({ getMultipleAccounts } as never, [])).resolves.toEqual([]);
    expect(getMultipleAccounts).not.toHaveBeenCalled();
  });
});

describe('readPositions', () => {
  function rpcWith(pcAccounts: (Uint8Array | null)[], balances: (Uint8Array | null)[]) {
    const calls: string[][] = [];
    return {
      calls,
      rpc: {
        getMultipleAccounts: (addresses: string[]) => ({
          send: async () => {
            calls.push(addresses);
            const source = calls.length === 1 ? pcAccounts : balances;
            return { value: source.map(accountInfo) };
          },
        }),
        getTokenAccountsByOwner: (_owner: string, filter: { mint: string }) => ({
          send: async () => ({
            value:
              filter.mint === config.sides.USDC.splMint
                ? [
                    {
                      account: {
                        data: { parsed: { info: { tokenAmount: { amount: '100000' } } } },
                      },
                    },
                  ]
                : [],
          }),
        }),
        getBalance: () => ({ send: async () => ({ value: 2_000_000_000n }) }),
      },
    };
  }

  it('is activated only when both sides have a pc-account', async () => {
    const both = rpcWith(
      [pcAccount(BALANCE_CT), pcAccount(OWNER)],
      [ciphertext(0, 1), ciphertext(3, 1)]
    );
    const positions = await readPositions(both.rpc as never, config, OWNER);
    expect(positions.activated).toBe(true);
    expect(positions.sol).toBe(2_000_000_000n);
    expect(positions.sides.USDC).toMatchObject({
      activated: true,
      balanceCt: BALANCE_CT,
      zeroDigest: true,
      publicBalance: 100_000n,
    });
    expect(positions.sides.DOGE).toMatchObject({
      activated: true,
      zeroDigest: false,
      publicBalance: 0n,
    });
    expect(both.calls[1]).toEqual([BALANCE_CT, OWNER]);

    const one = rpcWith([pcAccount(BALANCE_CT), null], [ciphertext(1, 1)]);
    const half = await readPositions(one.rpc as never, config, OWNER);
    expect(half.activated).toBe(false);
    expect(half.sides.USDC.activated).toBe(true);
    expect(half.sides.DOGE).toMatchObject({ activated: false, balanceCt: null });
  });
});
