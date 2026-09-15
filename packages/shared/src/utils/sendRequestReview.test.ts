import { describe, expect, it } from 'vitest';
import type { SendRequest } from '../types/ui/send-sheet';
import { isSendRequestUnderfunded, sendRequestReviewRows } from './sendRequestReview';

const token = { address: 'usdc', symbol: 'USDC', name: 'USD Coin', decimals: 6, uiAmount: 1 };
const request = (fields: { label?: string; message?: string; amount?: string }): SendRequest => ({
  request: { recipient: 'Dest', references: [], splToken: 'usdc', ...fields },
  token,
  locked: { recipient: true, token: true, amount: fields.amount !== undefined },
});

describe('sendRequestReviewRows', () => {
  it('is empty without a request', () => {
    expect(sendRequestReviewRows(null)).toEqual([]);
  });
  it('names who asked and what for, only when the request said', () => {
    expect(
      sendRequestReviewRows(request({ label: 'Café', message: 'Table 4' })).map((r) => r.key)
    ).toEqual(['requestedBy', 'for']);
    expect(sendRequestReviewRows(request({ message: 'Table 4' })).map((r) => r.key)).toEqual([
      'for',
    ]);
  });
});

describe('isSendRequestUnderfunded', () => {
  it('blocks only a locked amount the balance does not reach', () => {
    expect(isSendRequestUnderfunded(request({ amount: '1' }), '1', 0.5)).toBe(true);
    expect(isSendRequestUnderfunded(request({ amount: '1' }), '1', 1)).toBe(false);
    expect(isSendRequestUnderfunded(request({}), '1', 0.5)).toBe(false);
    expect(isSendRequestUnderfunded(null, '1', 0)).toBe(false);
  });
});
