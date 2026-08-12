jest.mock('@salmon/shared', () => ({
  SolanaAccount: {
    isValidAddress: (address: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address),
  },
  BitcoinAccount: {
    isValidAddress: (address: string) =>
      /^(bc1[a-z0-9]{20,}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(address),
  },
  ethereum: {
    EthereumAccount: {
      isValidAddress: (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address),
    },
  },
}));

import { classifyScanPayload } from './scan-payload';

const SOLANA_ADDRESS = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const BITCOIN_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const ETHEREUM_ADDRESS = '0x323b5d4c32345ced77393b3530b1eed0f346429d';

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

  it('parses a payment URI and extracts the amount', () => {
    expect(classifyScanPayload(`solana:${SOLANA_ADDRESS}?amount=1.5`, 'solana')).toEqual({
      kind: 'valid',
      address: SOLANA_ADDRESS,
      amount: '1.5',
    });
    expect(classifyScanPayload(`bitcoin:${BITCOIN_ADDRESS}?amount=0.01`, 'bitcoin')).toEqual({
      kind: 'valid',
      address: BITCOIN_ADDRESS,
      amount: '0.01',
    });
  });

  it('drops the amount when the URI targets an SPL token', () => {
    expect(
      classifyScanPayload(
        `solana:${SOLANA_ADDRESS}?amount=5&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
        'solana'
      )
    ).toEqual({ kind: 'valid', address: SOLANA_ADDRESS, amount: undefined });
  });

  it('ignores a malformed amount', () => {
    expect(classifyScanPayload(`solana:${SOLANA_ADDRESS}?amount=abc`, 'solana')).toEqual({
      kind: 'valid',
      address: SOLANA_ADDRESS,
      amount: undefined,
    });
  });

  it('rejects an address for a different chain as wrongChain', () => {
    expect(classifyScanPayload(BITCOIN_ADDRESS, 'solana')).toEqual({
      kind: 'wrongChain',
    });
    expect(classifyScanPayload(ETHEREUM_ADDRESS, 'solana')).toEqual({
      kind: 'wrongChain',
    });
    expect(classifyScanPayload(SOLANA_ADDRESS, 'bitcoin')).toEqual({
      kind: 'wrongChain',
    });
  });

  it('rejects a payment URI for a different chain as wrongChain', () => {
    expect(classifyScanPayload(`bitcoin:${BITCOIN_ADDRESS}?amount=1`, 'solana')).toEqual({
      kind: 'wrongChain',
    });
  });

  it('rejects non-address payloads as notAddress', () => {
    expect(classifyScanPayload('https://example.com', 'solana')).toEqual({
      kind: 'notAddress',
    });
    expect(classifyScanPayload('WIFI:T:WPA;S:network;P:password;;', 'solana')).toEqual({
      kind: 'notAddress',
    });
    expect(classifyScanPayload('hello world', 'solana')).toEqual({
      kind: 'notAddress',
    });
    expect(classifyScanPayload('', 'solana')).toEqual({ kind: 'notAddress' });
  });

  it('rejects a URI whose address fails validation for its own chain', () => {
    expect(classifyScanPayload('solana:not-a-real-address', 'solana')).toEqual({
      kind: 'notAddress',
    });
  });
});
