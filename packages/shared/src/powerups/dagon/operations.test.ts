import { describe, expect, it } from 'vitest';
import { DECRYPT_CAP_MS, FRESH_SIGNERS, MAX_OPERATIONS, SETTLE_CAP_MS } from './constants';
import {
  EMPTY_ACCOUNT,
  accountKey,
  advanceOperations,
  formatDagonAmount,
  fromStoredAuthorization,
  isOutOfDate,
  networkFeeLamports,
  parseDagonAmount,
  recordOperation,
  reviewDisplay,
  swapMinimum,
  toStoredAuthorization,
  watchedAddresses,
  withdrawAfter,
  type DagonAccountState,
  type DagonOperation,
} from './operations';

const CT = 'CJbH1QaZ6YvJL4eh52EEKjtYpAQdqcVfMbYwQYHcN5t9';
const CT2 = '877tcqUynNYNkwQZeWHWcyKWhAJHgehmG9ukLqs9A1Mi';

function ciphertext(digestByte: number, status: number): Uint8Array {
  const data = new Uint8Array(100);
  data.fill(digestByte, 2, 34);
  data[99] = status;
  return data;
}
const digest = (byte: number) => byte.toString(16).padStart(2, '0').repeat(32);

const op = (patch: Partial<DagonOperation> = {}): DagonOperation => ({
  id: 'op-1',
  action: 'wrap',
  sides: ['USDC'],
  amount: '1000',
  submittedAt: 1_000,
  watch: [{ address: CT, snapshot: digest(1) }],
  state: 'processing',
  ...patch,
});

const withOps = (...operations: DagonOperation[]): DagonAccountState => ({
  ...EMPTY_ACCOUNT,
  operations,
});

describe('amounts — FR-012', () => {
  it('takes up to 2 decimals and refuses the rest', () => {
    expect(parseDagonAmount('10')).toBe(1000n);
    expect(parseDagonAmount('10.5')).toBe(1050n);
    expect(parseDagonAmount('0.01')).toBe(1n);
    expect(parseDagonAmount('1.234')).toBeNull();
    expect(parseDagonAmount('0')).toBeNull();
    expect(parseDagonAmount('')).toBeNull();
    expect(parseDagonAmount('abc')).toBeNull();
    expect(parseDagonAmount('-1')).toBeNull();
  });

  it('formats base units at 2 decimals', () => {
    expect(formatDagonAmount('1000')).toBe('10.00');
    expect(formatDagonAmount(5n)).toBe('0.05');
    expect(formatDagonAmount(123456n)).toBe('1234.56');
  });

  it('sets the swap minimum at 99% of the amount in (O5)', () => {
    expect(swapMinimum(100n)).toBe(99n);
    expect(swapMinimum(1000n)).toBe(990n);
    expect(swapMinimum(1n)).toBe(0n);
  });
});

describe('fresh signers per action — FR-051', () => {
  it('matches the backend map', () => {
    expect(FRESH_SIGNERS).toEqual({
      setup: 1,
      wrap: 1,
      reveal: 1,
      send: 0,
      swap: 1,
      unwrapBurn: 1,
      unwrapDecrypt: 1,
      unwrapComplete: 0,
    });
  });
});

describe('the state slice — FR-026', () => {
  it('keys per account and network, so nothing crosses accounts', () => {
    expect(accountKey('Alice', 'solana-devnet')).toBe('Alice:solana-devnet');
    expect(accountKey('Bob', 'solana-devnet')).not.toBe(accountKey('Alice', 'solana-devnet'));
    expect(accountKey('Alice', 'solana-mainnet')).not.toBe(accountKey('Alice', 'solana-devnet'));
  });

  it('keeps the newest 10, newest first (O13)', () => {
    let account = EMPTY_ACCOUNT;
    for (let index = 0; index < MAX_OPERATIONS + 3; index += 1) {
      account = recordOperation(account, op({ id: `op-${index}` }));
    }
    expect(account.operations).toHaveLength(MAX_OPERATIONS);
    expect(account.operations[0].id).toBe(`op-${MAX_OPERATIONS + 2}`);
  });
});

describe('advanceOperations — FR-027', () => {
  const read = (data: Uint8Array | null) => () => data;

  it('turns done only once every watched ciphertext settled', () => {
    const swap = op({
      action: 'swap',
      sides: ['USDC', 'DOGE'],
      watch: [
        { address: CT, snapshot: digest(1) },
        { address: CT2, snapshot: digest(1) },
      ],
    });
    const half = advanceOperations(withOps(swap), 2_000, (address) =>
      address === CT ? ciphertext(2, 1) : ciphertext(1, 0)
    );
    expect(half.operations[0].state).toBe('processing');
    const both = advanceOperations(withOps(swap), 2_000, read(ciphertext(2, 1)));
    expect(both.operations[0].state).toBe('done');
  });

  it('turns unknown after 90 s from submission, also after a restart', () => {
    const account = withOps(op());
    expect(
      advanceOperations(account, 1_000 + SETTLE_CAP_MS - 1, read(ciphertext(1, 0))).operations[0]
        .state
    ).toBe('processing');
    expect(
      advanceOperations(account, 1_000 + SETTLE_CAP_MS + 1, read(null)).operations[0].state
    ).toBe('unknown');
  });

  it('gives the withdraw decryption 180 s and never settles it from the chain (O8)', () => {
    const decrypt = op({ action: 'unwrapDecrypt', watch: [] });
    expect(
      advanceOperations(withOps(decrypt), 1_000 + SETTLE_CAP_MS + 1, read(null)).operations[0].state
    ).toBe('processing');
    expect(
      advanceOperations(withOps(decrypt), 1_000 + DECRYPT_CAP_MS + 1, read(null)).operations[0]
        .state
    ).toBe('unknown');
  });

  it('leaves finished items alone', () => {
    const done = op({ state: 'done' });
    const unknown = op({ id: 'op-2', state: 'unknown' });
    const account = withOps(done, unknown);
    expect(advanceOperations(account, 10_000_000, read(null))).toBe(account);
  });

  it('watches only processing items within their cap, each address once', () => {
    const account = withOps(
      op({ id: 'a' }),
      op({ id: 'b', watch: [{ address: CT, snapshot: null }] }),
      op({ id: 'c', state: 'done', watch: [{ address: CT2, snapshot: null }] }),
      op({ id: 'd', submittedAt: -SETTLE_CAP_MS, watch: [{ address: CT2, snapshot: null }] })
    );
    expect(watchedAddresses(account, 2_000)).toEqual([CT]);
  });
});

describe('isOutOfDate — FR-022', () => {
  it('marks a revealed value older than a later finished operation on its side', () => {
    const base: DagonAccountState = {
      ...EMPTY_ACCOUNT,
      revealed: { USDC: { amount: '1000', readAt: 5_000 } },
    };
    expect(isOutOfDate(base, 'USDC')).toBe(false);
    const later = { ...base, operations: [op({ submittedAt: 6_000, state: 'done' })] };
    expect(isOutOfDate(later, 'USDC')).toBe(true);
    expect(isOutOfDate(later, 'DOGE')).toBe(false);
    const processing = { ...base, operations: [op({ submittedAt: 6_000 })] };
    expect(isOutOfDate(processing, 'USDC')).toBe(false);
    const earlier = { ...base, operations: [op({ submittedAt: 4_000, state: 'done' })] };
    expect(isOutOfDate(earlier, 'USDC')).toBe(false);
  });
});

describe('withdraw progress — FR-029, Q3', () => {
  const KEY_LIKE = /secret|private|seed|keypair|signer/i;

  it('stores public addresses only, step by step, and clears at the end', () => {
    const afterBurn = withdrawAfter(undefined, 'unwrapBurn', {
      side: 'USDC',
      amount: '500',
      freshSigner: CT,
      now: 1_000,
    });
    expect(afterBurn).toEqual({ side: 'USDC', amount: '500', step: 2, burnedCt: CT });
    const afterDecrypt = withdrawAfter(afterBurn, 'unwrapDecrypt', {
      freshSigner: CT2,
      now: 2_000,
    });
    expect(afterDecrypt).toEqual({
      side: 'USDC',
      amount: '500',
      step: 3,
      burnedCt: CT,
      requestAcct: CT2,
      decryptRequestedAt: 2_000,
    });
    for (const key of Object.keys(afterDecrypt ?? {})) expect(key).not.toMatch(KEY_LIKE);
    expect(withdrawAfter(afterDecrypt, 'unwrapComplete', { now: 3_000 })).toBeUndefined();
  });

  it('skips to step 3 on already_requested when the request account is known', () => {
    const progress = {
      side: 'USDC' as const,
      amount: '500',
      step: 2 as const,
      burnedCt: CT,
      requestAcct: CT2,
    };
    expect(withdrawAfter(progress, 'alreadyRequested', { now: 4_000 })).toMatchObject({ step: 3 });
    const unknown = { side: 'USDC' as const, amount: '500', step: 2 as const, burnedCt: CT };
    expect(withdrawAfter(unknown, 'alreadyRequested', { now: 4_000 })).toEqual(unknown);
  });
});

describe('read authorization storage', () => {
  it('round-trips through base64 strings', () => {
    const auth = {
      message: new Uint8Array(43).fill(1),
      signature: new Uint8Array(64).fill(2),
      signer: new Uint8Array(32).fill(3),
    };
    const stored = toStoredAuthorization(auth);
    expect(typeof stored.message).toBe('string');
    expect(fromStoredAuthorization(stored)).toEqual(auth);
  });
});

describe('the confirmation — FR-012, FR-023, FR-025, FR-030, R10', () => {
  const envelope = { priorityFeeMicroLamports: 1_000, computeUnitLimit: 200_000 };

  it('computes the network fee from the envelope, or omits it', () => {
    // 5000 × (1 + 1) + ceil(1000 × 200000 / 1e6)
    expect(networkFeeLamports(envelope, 1)).toBe(10_200n);
    expect(networkFeeLamports({ priorityFeeMicroLamports: 1, computeUnitLimit: 1 }, 0)).toBe(
      5_001n
    );
    expect(networkFeeLamports({}, 1)).toBeNull();
    expect(
      networkFeeLamports({ priorityFeeMicroLamports: 1_000, computeUnitLimit: null }, 1)
    ).toBeNull();
  });

  it('a hide shows the amount, the public-amount warning and the fee', () => {
    const display = reviewDisplay('wrap', { envelope, sides: ['USDC'], amount: 1000n });
    expect(display.rows).toEqual([
      { label: 'dagon.review.amount', value: '10.00 dagon.tokens.USDC' },
      { label: 'dagon.review.networkFee', value: '0.0000102 SOL' },
    ]);
    expect(display.warning?.title).toBe('dagon.warnings.publicAmount');
  });

  it('a swap shows the minimum and the devnet caveat', () => {
    const display = reviewDisplay('swap', {
      envelope: {},
      sides: ['USDC', 'DOGE'],
      amount: 100n,
      minimum: 99n,
    });
    expect(display.rows).toEqual([
      { label: 'dagon.review.amount', value: '1.00 dagon.tokens.USDC' },
      { label: 'dagon.review.minimum', value: '0.99 dagon.tokens.DOGE' },
    ]);
    expect(display.warning?.title).toBe('dagon.warnings.minimumCaveat');
  });

  it('a reveal states its cost before the user confirms', () => {
    const display = reviewDisplay('reveal', { envelope: {}, sides: ['DOGE'] });
    expect(display.rows).toContainEqual({
      label: 'dagon.review.cost',
      value: 'dagon.review.costValue',
    });
    expect(display.warning?.title).toBe('dagon.warnings.revealCost');
  });

  it('a withdraw burn warns the amount becomes public', () => {
    const display = reviewDisplay('unwrapBurn', { envelope: {}, sides: ['USDC'], amount: 500n });
    expect(display.warning?.title).toBe('dagon.warnings.withdrawPublic');
  });

  it('every receipt says submitted, Encrypt is processing, never done', () => {
    for (const action of ['setup', 'wrap', 'reveal', 'send', 'swap', 'unwrapComplete'] as const) {
      const display = reviewDisplay(action, { envelope: {}, sides: ['USDC', 'DOGE'], amount: 1n });
      expect(display.receipt?.title).toBe('dagon.receipt.submitted');
    }
  });
});
