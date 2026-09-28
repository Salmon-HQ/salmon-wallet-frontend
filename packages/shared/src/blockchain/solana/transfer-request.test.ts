import { describe, expect, it } from 'vitest';
import {
  TRANSFER_REQUEST_MEMO_MAX_BYTES,
  encodeTransferRequest,
  isTransferRequestUri,
  parseTransferRequest,
} from './transfer-request';

const RECIPIENT = 'mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const REF_A = '82ZJ7nbGpixjeDCmEhUcmwXYfvurzAgGdtSMuHnUgyny';
const REF_B = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

describe('parseTransferRequest', () => {
  it("reads the standard's own example in full", () => {
    const result = parseTransferRequest(
      `solana:${RECIPIENT}?amount=1&label=Michael&message=Thanks%20for%20all%20the%20fish&memo=OrderId12345`
    );
    expect(result).toEqual({
      ok: true,
      request: {
        recipient: RECIPIENT,
        amount: '1',
        references: [],
        label: 'Michael',
        message: 'Thanks for all the fish',
        memo: 'OrderId12345',
      },
    });
  });

  it('reads a USDC request with one reference', () => {
    const result = parseTransferRequest(
      `solana:${RECIPIENT}?amount=0.01&spl-token=${USDC}&reference=${REF_A}`
    );
    expect(result).toEqual({
      ok: true,
      request: { recipient: RECIPIENT, amount: '0.01', splToken: USDC, references: [REF_A] },
    });
  });

  it('keeps several references in order', () => {
    const result = parseTransferRequest(
      `solana:${RECIPIENT}?reference=${REF_B}&reference=${REF_A}`
    );
    expect(result.ok && result.request.references).toEqual([REF_B, REF_A]);
  });

  it.each(['1e3', '.5', '-1', '01', 'abc'])('refuses the amount %s', (amount) => {
    expect(parseTransferRequest(`solana:${RECIPIENT}?amount=${amount}`)).toEqual({
      ok: false,
      reason: 'amount',
    });
  });

  it('refuses a transaction request in v1', () => {
    expect(parseTransferRequest('solana:https%3A%2F%2Fexample.com%2Fpay')).toEqual({
      ok: false,
      reason: 'transactionRequest',
    });
  });

  it('names the part it could not read', () => {
    expect(parseTransferRequest('solana:not-an-address')).toEqual({
      ok: false,
      reason: 'recipient',
    });
    expect(parseTransferRequest(`solana:${RECIPIENT}?spl-token=nope`)).toEqual({
      ok: false,
      reason: 'splToken',
    });
    expect(parseTransferRequest(`solana:${RECIPIENT}?reference=nope`)).toEqual({
      ok: false,
      reason: 'reference',
    });
    const longMemo = 'x'.repeat(TRANSFER_REQUEST_MEMO_MAX_BYTES + 1);
    expect(parseTransferRequest(`solana:${RECIPIENT}?memo=${longMemo}`)).toEqual({
      ok: false,
      reason: 'memoTooLong',
    });
    expect(parseTransferRequest(`bitcoin:${RECIPIENT}`)).toEqual({
      ok: false,
      reason: 'notSolanaPay',
    });
    expect(parseTransferRequest(RECIPIENT)).toEqual({ ok: false, reason: 'notSolanaPay' });
  });

  it('ignores keys the standard does not define, and trims whitespace', () => {
    const result = parseTransferRequest(`  solana:${RECIPIENT}?foo=bar&label=%20Cafe%20 \n`);
    expect(result).toEqual({
      ok: true,
      request: { recipient: RECIPIENT, references: [], label: 'Cafe' },
    });
  });
});

describe('encodeTransferRequest', () => {
  it.each([
    `solana:${RECIPIENT}?amount=1&label=Michael&message=Thanks%20for%20all%20the%20fish&memo=OrderId12345`,
    `solana:${RECIPIENT}?amount=0.01&spl-token=${USDC}&reference=${REF_A}`,
    `solana:${RECIPIENT}?reference=${REF_B}&reference=${REF_A}`,
  ])('round-trips %s', (uri) => {
    const parsed = parseTransferRequest(uri);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(encodeTransferRequest(parsed.request)).toBe(uri);
  });

  it('omits empty fields and percent-encodes the rest', () => {
    expect(
      encodeTransferRequest({
        recipient: RECIPIENT,
        amount: '12.5',
        splToken: USDC,
        references: [REF_A],
        label: 'Luca & Co',
        message: '',
        memo: 'pr_1',
      })
    ).toBe(
      `solana:${RECIPIENT}?amount=12.5&spl-token=${USDC}&reference=${REF_A}&label=Luca%20%26%20Co&memo=pr_1`
    );
  });
});

describe('isTransferRequestUri', () => {
  it('tells the standard from a bare address', () => {
    expect(isTransferRequestUri(`solana:${RECIPIENT}`)).toBe(true);
    expect(isTransferRequestUri(RECIPIENT)).toBe(false);
  });
});

describe('interoperability with what other producers emit', () => {
  it('reads the `solana://` form, which the standard does not write but producers do', () => {
    expect(parseTransferRequest(`solana://${RECIPIENT}?amount=1`)).toEqual({
      ok: true,
      request: { recipient: RECIPIENT, amount: '1', references: [] },
    });
  });

  it('accepts a memo the memo program can still carry in one instruction', () => {
    const memo = 'x'.repeat(400);
    const parsed = parseTransferRequest(`solana:${RECIPIENT}?memo=${memo}`);
    expect(parsed).toEqual({
      ok: true,
      request: { recipient: RECIPIENT, references: [], memo },
    });
  });
});
