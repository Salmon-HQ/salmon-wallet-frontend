import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { describe, expect, it } from 'vitest';
import { Keypair } from '@solana/web3.js';
import {
  buildSiwsMessageText,
  getSiwsDomain,
  parseOffchainMessageV1,
  prepareSignInMessage,
  signSiwsMessage,
  SiwsDomainMismatchError,
  verifyOffchainMessage,
} from './index';
import { approveSolanaSignIn } from '../../utils/dapp-approval';

const ORIGIN = 'https://app.example.com';

function makeAccount() {
  const keyPair = Keypair.generate();
  return {
    keyPair,
    address: keyPair.publicKey.toBase58(),
    account: {
      keyPair,
      getReceiveAddress: () => keyPair.publicKey.toBase58(),
    },
  };
}

describe('getSiwsDomain', () => {
  it('extracts the host (including port) from the origin', () => {
    expect(getSiwsDomain('https://app.example.com')).toBe('app.example.com');
    expect(getSiwsDomain('http://localhost:5173')).toBe('localhost:5173');
  });

  it('throws on an invalid origin', () => {
    expect(() => getSiwsDomain('not-an-origin')).toThrow();
  });
});

describe('buildSiwsMessageText', () => {
  const address = '9mpJyg7iEse9rPMP1tdiSdSAYbLJX6nJyGbNkbT3SAd3';

  it('builds the minimal message (header + address only)', () => {
    expect(buildSiwsMessageText({ domain: 'app.example.com', address })).toBe(
      `app.example.com wants you to sign in with your Solana account:\n${address}`,
    );
  });

  it('builds the maximal ABNF layout with statement, fields, and resources', () => {
    const text = buildSiwsMessageText({
      domain: 'app.example.com',
      address,
      statement: 'Sign in to Example.',
      uri: 'https://app.example.com/login',
      version: '1',
      chainId: 'mainnet',
      nonce: 'RMTMC6f5',
      issuedAt: '2026-07-29T00:00:00Z',
      expirationTime: '2026-07-29T00:10:00Z',
      notBefore: '2026-07-28T00:00:00Z',
      requestId: 'req-1',
      resources: ['https://app.example.com/tos', 'https://app.example.com/privacy'],
    });

    expect(text).toBe(
      [
        `app.example.com wants you to sign in with your Solana account:`,
        address,
        '',
        'Sign in to Example.',
        '',
        'URI: https://app.example.com/login',
        'Version: 1',
        'Chain ID: mainnet',
        'Nonce: RMTMC6f5',
        'Issued At: 2026-07-29T00:00:00Z',
        'Expiration Time: 2026-07-29T00:10:00Z',
        'Not Before: 2026-07-28T00:00:00Z',
        'Request ID: req-1',
        'Resources:',
        '- https://app.example.com/tos',
        '- https://app.example.com/privacy',
      ].join('\n'),
    );
  });
});

describe('prepareSignInMessage', () => {
  const address = '9mpJyg7iEse9rPMP1tdiSdSAYbLJX6nJyGbNkbT3SAd3';

  it('binds the message domain to the real origin, ignoring the dApp claim', () => {
    const prepared = prepareSignInMessage({ domain: 'evil.example' }, ORIGIN, address);
    expect(prepared.fields.domain).toBe('app.example.com');
    expect(prepared.message.startsWith('app.example.com wants you to sign in')).toBe(true);
    expect(prepared.domainMismatch).toBe(true);
    expect(prepared.requestedDomain).toBe('evil.example');
  });

  it('reports no mismatch when the dApp claim matches or is absent', () => {
    expect(prepareSignInMessage({}, ORIGIN, address).domainMismatch).toBe(false);
    expect(
      prepareSignInMessage({ domain: 'app.example.com' }, ORIGIN, address).domainMismatch,
    ).toBe(false);
  });

  it('binds the address to the wallet account and flags a dApp-requested other address', () => {
    const prepared = prepareSignInMessage({ address: 'SomeOtherAddress111' }, ORIGIN, address);
    expect(prepared.fields.address).toBe(address);
    expect(prepared.addressMismatch).toBe(true);
  });

  it('rejects line breaks in any input field (message-line forgery)', () => {
    expect(() =>
      prepareSignInMessage({ statement: 'hi\nURI: https://evil.example' }, ORIGIN, address),
    ).toThrow(/line breaks/);
    expect(() =>
      prepareSignInMessage({ nonce: 'abc\r\nNonce: forged' }, ORIGIN, address),
    ).toThrow(/line breaks/);
    expect(() =>
      prepareSignInMessage({ resources: ['https://ok.example', 'x\ny'] }, ORIGIN, address),
    ).toThrow(/line breaks/);
  });

  it('throws on an invalid origin', () => {
    expect(() => prepareSignInMessage({}, 'garbage', address)).toThrow();
  });
});

describe('signSiwsMessage', () => {
  it('signs the raw UTF-8 SIWS text and the signature verifies', () => {
    const { keyPair, address, account } = makeAccount();

    const result = signSiwsMessage(account as never, { statement: 'Hello' }, ORIGIN);

    expect(result.signedMessageFormat).toBeUndefined();
    expect(new TextDecoder().decode(result.signedMessage)).toBe(result.message);
    expect(result.message).toContain(`app.example.com wants you to sign in`);
    expect(result.message).toContain(address);
    expect(
      nacl.sign.detached.verify(result.signedMessage, result.signature, keyPair.publicKey.toBytes()),
    ).toBe(true);
  });

  it('refuses to sign when the dApp claims a different domain (spoof rejection)', () => {
    const { account } = makeAccount();
    expect(() => signSiwsMessage(account as never, { domain: 'evil.example' }, ORIGIN)).toThrow(
      SiwsDomainMismatchError,
    );
  });

  it('refuses to sign for an address other than the active account', () => {
    const { account } = makeAccount();
    const other = Keypair.generate().publicKey.toBase58();
    expect(() => signSiwsMessage(account as never, { address: other }, ORIGIN)).toThrow(
      /not the active account/,
    );
  });

  it('wraps the message in an OCMS v1 envelope when useOffchainMessage is set (PR#93)', () => {
    const { keyPair, address, account } = makeAccount();

    const result = signSiwsMessage(
      account as never,
      { statement: 'Hello', useOffchainMessage: { messageVersion: 1 } },
      ORIGIN,
    );

    expect(result.signedMessageFormat).toEqual({ kind: 'offchainMessage', messageVersion: 1 });
    // The envelope decodes as OCMS v1 with the SIWS text as content and the
    // account as the sole required signatory.
    const decoded = parseOffchainMessageV1(result.signedMessage);
    expect(decoded.content).toBe(result.message);
    expect(decoded.requiredSignatories.map((s) => s.address)).toEqual([address]);
    expect(
      verifyOffchainMessage(result.signedMessage, result.signature, keyPair.publicKey),
    ).toBe(true);
  });

  it('rejects unsupported off-chain message versions', () => {
    const { account } = makeAccount();
    expect(() =>
      signSiwsMessage(
        account as never,
        { useOffchainMessage: { messageVersion: 2 as never } },
        ORIGIN,
      ),
    ).toThrow(/Unsupported off-chain message version/);
  });
});

describe('approveSolanaSignIn', () => {
  it('returns the Wallet-Standard-shaped payload with bs58-encoded bytes', () => {
    const { keyPair, address, account } = makeAccount();

    const payload = approveSolanaSignIn(account as never, { nonce: 'abcd1234' }, ORIGIN);

    expect(payload.address).toBe(address);
    expect(payload.signatureType).toBe('ed25519');
    expect(payload.signedMessageFormat).toBeUndefined();
    const signedMessage = bs58.decode(payload.signedMessage);
    expect(new TextDecoder().decode(signedMessage)).toContain('Nonce: abcd1234');
    expect(
      nacl.sign.detached.verify(
        signedMessage,
        bs58.decode(payload.signature),
        keyPair.publicKey.toBytes(),
      ),
    ).toBe(true);
  });

  it('marks the OCMS-envelope path with signedMessageFormat', () => {
    const { account } = makeAccount();

    const payload = approveSolanaSignIn(
      account as never,
      { useOffchainMessage: { messageVersion: 1 } },
      ORIGIN,
    );

    expect(payload.signedMessageFormat).toEqual({ kind: 'offchainMessage', messageVersion: 1 });
    expect(() => parseOffchainMessageV1(bs58.decode(payload.signedMessage))).not.toThrow();
  });
});
