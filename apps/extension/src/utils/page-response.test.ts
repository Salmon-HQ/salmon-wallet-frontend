import { describe, it, expect } from 'vitest';

import { toPageResponse } from './page-response';

describe('toPageResponse', () => {
  it('passes a rejection through as its id and error text', () => {
    expect(toPageResponse({ id: 'r1', error: 'User rejected the request.' })).toEqual({
      id: 'r1',
      error: 'User rejected the request.',
    });
  });

  it('passes a connection through as its method and public key only', () => {
    const response = toPageResponse({
      id: 'r2',
      method: 'connected',
      params: { publicKey: 'Addr1111', extra: 'dropped' },
    });

    expect(response).toEqual({ id: 'r2', method: 'connected', params: { publicKey: 'Addr1111' } });
  });

  it('passes every field a signing result carries', () => {
    const result = {
      signature: 'sig',
      signatures: ['sig1', 'sig2'],
      publicKey: 'Addr1111',
      address: 'Addr1111',
      signedMessage: 'msg',
      signedMessageFormat: 'offchain',
      signedOffchainMessage: 'envelope',
      signatureType: 'ed25519',
    };

    expect(toPageResponse({ id: 'r3', result })).toEqual({ id: 'r3', result });
  });

  it('drops anything else a result carries, so an account object never reaches the page', () => {
    const account = { id: 'a', secret: { kind: 'mnemonic', mnemonic: 'abandon abandon about' } };

    const response = toPageResponse({
      id: 'r4',
      result: { signature: 'sig', account, signatures: [account], publicKey: { nested: true } },
      account,
    });

    expect(response).toEqual({ id: 'r4', result: { signature: 'sig' } });
    expect(JSON.stringify(response)).not.toContain('abandon');
  });
});
