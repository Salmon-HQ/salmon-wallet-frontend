/**
 * Hoisted from apps/mobile/src/components/QRScanner with the same cases, plus
 * the Solana Pay transfer request the scanner used to read only partially.
 */
import { describe, expect, it } from 'vitest';
import { classifyScanPayload } from './scan-payload';

const SOLANA_ADDRESS = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const BITCOIN_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const ETHEREUM_ADDRESS = '0x323b5d4c32345ced77393b3530b1eed0f346429d';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const REFERENCE = '82ZJ7nbGpixjeDCmEhUcmwXYfvurzAgGdtSMuHnUgyny';

describe('classifyScanPayload', () => {
  it('accepts a bare address for the active chain', () => {
    expect(classifyScanPayload(SOLANA_ADDRESS, 'solana')).toEqual({
      kind: 'valid',
      address: SOLANA_ADDRESS,
      amount: undefined,
    });
    expect(classifyScanPayload(BITCOIN_ADDRESS, 'bitcoin')).toEqual({
      kind: 'valid',
      address: BITCOIN_ADDRESS,
      amount: undefined,
    });
  });

  it('trims whitespace around the payload', () => {
    expect(classifyScanPayload(`  ${SOLANA_ADDRESS}\n`, 'solana')).toEqual({
      kind: 'valid',
      address: SOLANA_ADDRESS,
      amount: undefined,
    });
  });

  it('reads a bare solana: URI as an address, not a request', () => {
    expect(classifyScanPayload(`solana:${SOLANA_ADDRESS}`, 'solana')).toEqual({
      kind: 'valid',
      address: SOLANA_ADDRESS,
      amount: undefined,
    });
  });

  it('reads a transfer request in full, amount and token together', () => {
    expect(
      classifyScanPayload(
        `solana:${SOLANA_ADDRESS}?amount=5&spl-token=${USDC}&reference=${REFERENCE}&label=Cafe&memo=pr_1`,
        'solana'
      )
    ).toEqual({
      kind: 'valid',
      address: SOLANA_ADDRESS,
      amount: '5',
      request: {
        recipient: SOLANA_ADDRESS,
        amount: '5',
        splToken: USDC,
        references: [REFERENCE],
        label: 'Cafe',
        memo: 'pr_1',
      },
    });
  });

  it('parses a bitcoin payment URI and extracts the amount', () => {
    expect(classifyScanPayload(`bitcoin:${BITCOIN_ADDRESS}?amount=0.01`, 'bitcoin')).toEqual({
      kind: 'valid',
      address: BITCOIN_ADDRESS,
      amount: '0.01',
    });
  });

  it('refuses a request it cannot read, naming the part', () => {
    expect(classifyScanPayload(`solana:${SOLANA_ADDRESS}?amount=abc`, 'solana')).toEqual({
      kind: 'invalidRequest',
      reason: 'amount',
    });
    expect(classifyScanPayload('solana:https%3A%2F%2Fexample.com%2Fpay', 'solana')).toEqual({
      kind: 'invalidRequest',
      reason: 'transactionRequest',
    });
  });

  it('rejects an address for a different chain as wrongChain', () => {
    expect(classifyScanPayload(BITCOIN_ADDRESS, 'solana')).toEqual({ kind: 'wrongChain' });
    expect(classifyScanPayload(ETHEREUM_ADDRESS, 'solana')).toEqual({ kind: 'wrongChain' });
    expect(classifyScanPayload(SOLANA_ADDRESS, 'bitcoin')).toEqual({ kind: 'wrongChain' });
  });

  it('rejects a payment URI for a different chain as wrongChain', () => {
    expect(classifyScanPayload(`bitcoin:${BITCOIN_ADDRESS}?amount=1`, 'solana')).toEqual({
      kind: 'wrongChain',
    });
    expect(classifyScanPayload(`solana:${SOLANA_ADDRESS}?amount=1`, 'bitcoin')).toEqual({
      kind: 'wrongChain',
    });
  });

  // This runs inside the camera's frame callback, where a thrown URIError is
  // caught by nothing. A QR is attacker-supplied by definition.
  it('survives a malformed percent-escape instead of throwing at the camera', () => {
    expect(() => classifyScanPayload('bitcoin:%', 'solana')).not.toThrow();
    expect(classifyScanPayload('bitcoin:%', 'solana')).toEqual({ kind: 'notAddress' });
    expect(classifyScanPayload('bitcoin:%E0%A4%A', 'bitcoin')).toEqual({ kind: 'notAddress' });
  });

  it('rejects non-address payloads as notAddress', () => {
    expect(classifyScanPayload('https://example.com', 'solana')).toEqual({ kind: 'notAddress' });
    expect(classifyScanPayload('WIFI:T:WPA;S:network;P:password;;', 'solana')).toEqual({
      kind: 'notAddress',
    });
    expect(classifyScanPayload('hello world', 'solana')).toEqual({ kind: 'notAddress' });
    expect(classifyScanPayload('', 'solana')).toEqual({ kind: 'notAddress' });
  });

  it('rejects a URI whose address fails validation for its own chain', () => {
    expect(classifyScanPayload('solana:not-a-real-address', 'solana')).toEqual({
      kind: 'notAddress',
    });
    expect(classifyScanPayload(`solana:${BITCOIN_ADDRESS}?amount=1`, 'solana')).toEqual({
      kind: 'wrongChain',
    });
  });
});
