import { describe, expect, it } from 'vitest';
import { parseTransferRequest } from '../../blockchain/solana/transfer-request';
import { formatAtomic, remaining, requestIdFor, stateOf, uriFor, validateAmount } from './requests';
import type { PaymentRequest } from './types';

const request: PaymentRequest = {
  id: 'pr_EPjFWdd5Aufq',
  accountId: 'acc',
  networkId: 'solana-devnet',
  recipient: 'mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN',
  mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  decimals: 6,
  symbol: 'USDC',
  amountAtomic: '12500000',
  note: 'Table 4',
  reference: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  createdAt: 1_000,
  expiresAt: 1_000 + 3_600_000,
  status: 'pending',
};

describe('validateAmount', () => {
  it('accepts dot and comma decimals up to six places', () => {
    expect(validateAmount('12.5', 6)).toEqual({ ok: true, atomic: '12500000', display: '12.50' });
    expect(validateAmount('0,000001', 6)).toEqual({ ok: true, atomic: '1', display: '0.000001' });
  });
  it.each([
    ['', 'invalid'],
    ['abc', 'invalid'],
    ['.5', 'invalid'],
    ['1e3', 'invalid'],
    ['-1', 'invalid'],
    ['0', 'zero'],
    ['0.0000001', 'tooManyDecimals'],
  ])('refuses %s as %s', (input, reason) => {
    expect(validateAmount(input, 6)).toEqual({ ok: false, reason });
  });
});

describe('formatAtomic', () => {
  it('keeps at least two decimals and drops trailing zeros beyond them', () => {
    expect(formatAtomic('12500000', 6)).toBe('12.50');
    expect(formatAtomic('1', 6)).toBe('0.000001');
    expect(formatAtomic('5000000', 6)).toBe('5.00');
  });
});

describe('uriFor', () => {
  it('writes a transfer request the parser reads back', () => {
    const uri = uriFor(request, 'Main account');
    const parsed = parseTransferRequest(uri);
    expect(parsed.ok && parsed.request).toEqual({
      recipient: request.recipient,
      amount: '12.50',
      splToken: request.mint,
      references: [request.reference],
      label: 'Main account',
      message: 'Table 4',
      memo: request.id,
    });
  });
  it('omits the message when the note is empty', () => {
    expect(uriFor({ ...request, note: '' }, 'A')).not.toContain('message=');
  });
});

describe('stateOf', () => {
  it('is pending before expiry, expired after, and paid stays paid', () => {
    expect(stateOf(request, request.expiresAt - 1)).toBe('pending');
    expect(stateOf(request, request.expiresAt + 1)).toBe('expired');
    expect(stateOf({ ...request, status: 'paid' }, request.expiresAt + 1)).toBe('paid');
  });
});

describe('remaining', () => {
  it('splits what is left into days, hours and minutes and never goes negative', () => {
    const now = 0;
    expect(remaining(26 * 3_600_000 + 5 * 60_000, now)).toEqual({ days: 1, hours: 2, minutes: 5 });
    expect(remaining(-1, now)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });
});

describe('requestIdFor', () => {
  it('takes the first twelve characters of the reference', () => {
    expect(requestIdFor('Ref111111111ZZZ')).toBe('pr_Ref111111111');
  });
});
