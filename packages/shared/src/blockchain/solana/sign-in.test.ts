import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { describe, expect, it } from 'vitest';
import { Keypair } from '@solana/web3.js';
import type { Address } from '@solana/addresses';
import { createSignInMessageText } from '@solana/wallet-standard-util';
import type { ResolvedSiwsFields } from './sign-in';
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

/**
 * GOLDEN VECTORS — migration acceptance gate.
 *
 * These constants pin the exact bytes produced by the @solana/web3.js
 * implementation as of commit 9e2e4bb. They are the acceptance criterion for the
 * @solana/kit migration: the ported code is correct iff these still pass.
 *
 * To regenerate (only ever when the wire format itself is intentionally
 * changed — NEVER to make a migration diff go green): replace the expected
 * constant with an empty string, run the suite, and paste the reported
 * `actual` value. A migration that changes these bytes is a bug, not a
 * vector that needs updating.
 */
describe('buildSiwsMessageText golden vectors', () => {
  // TEST-ONLY deterministic keypair. The seed is a constant so golden vectors are
  // reproducible; this key holds no funds and must never be used outside tests.
  const address = Keypair.fromSeed(new Uint8Array(32).fill(2)).publicKey.toBase58();
  const domain = 'app.example.com';

  /** Header + address only: the smallest message a backend must reconstruct. */
  const GOLDEN_SIWS_MINIMAL =
    'YXBwLmV4YW1wbGUuY29tIHdhbnRzIHlvdSB0byBzaWduIGluIHdpdGggeW91ciBTb2xhbmEgYWNjb3VudDoKOWhTUjZTN1dQdHhtVG9qZ282R0czazR5RFBlY2dKWTI5Mmo3eHJzVUdXQnU=';
  /** Every optional field plus two resources: the full ABNF layout and line order. */
  const GOLDEN_SIWS_MAXIMAL =
    'YXBwLmV4YW1wbGUuY29tIHdhbnRzIHlvdSB0byBzaWduIGluIHdpdGggeW91ciBTb2xhbmEgYWNjb3VudDoKOWhTUjZTN1dQdHhtVG9qZ282R0czazR5RFBlY2dKWTI5Mmo3eHJzVUdXQnUKClNpZ24gaW4gdG8gRXhhbXBsZS4KClVSSTogaHR0cHM6Ly9hcHAuZXhhbXBsZS5jb20vbG9naW4KVmVyc2lvbjogMQpDaGFpbiBJRDogbWFpbm5ldApOb25jZTogUk1UTUM2ZjUKSXNzdWVkIEF0OiAyMDI2LTA3LTI5VDAwOjAwOjAwWgpFeHBpcmF0aW9uIFRpbWU6IDIwMjYtMDctMjlUMDA6MTA6MDBaCk5vdCBCZWZvcmU6IDIwMjYtMDctMjhUMDA6MDA6MDBaClJlcXVlc3QgSUQ6IHJlcS0xClJlc291cmNlczoKLSBodHRwczovL2FwcC5leGFtcGxlLmNvbS90b3MKLSBodHRwczovL2FwcC5leGFtcGxlLmNvbS9wcml2YWN5';
  /** Non-ASCII statement, pinning the UTF-8 encoding of free-text fields. */
  const GOLDEN_SIWS_UNICODE_STATEMENT =
    'YXBwLmV4YW1wbGUuY29tIHdhbnRzIHlvdSB0byBzaWduIGluIHdpdGggeW91ciBTb2xhbmEgYWNjb3VudDoKOWhTUjZTN1dQdHhtVG9qZ282R0czazR5RFBlY2dKWTI5Mmo3eHJzVUdXQnUKCsOcbsOvY8O2ZMOpIOKckyDml6XmnKzoqp4=';

  const toBase64 = (text: string) => Buffer.from(new TextEncoder().encode(text)).toString('base64');

  it('pins the minimal message bytes', () => {
    expect(toBase64(buildSiwsMessageText({ domain, address }))).toBe(GOLDEN_SIWS_MINIMAL);
  });

  it('pins the maximal message bytes', () => {
    const text = buildSiwsMessageText({
      domain,
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

    expect(toBase64(text)).toBe(GOLDEN_SIWS_MAXIMAL);
  });

  it('pins the message bytes for a non-ASCII statement', () => {
    const text = buildSiwsMessageText({ domain, address, statement: 'Ünïcödé ✓ 日本語' });

    expect(toBase64(text)).toBe(GOLDEN_SIWS_UNICODE_STATEMENT);
  });

  // An empty `resources` array emits no `Resources:` line at all, so the bytes are
  // identical to the minimal message.
  it('pins that an empty resources array adds no Resources block', () => {
    const text = buildSiwsMessageText({ domain, address, resources: [] });

    expect(toBase64(text)).toBe(GOLDEN_SIWS_MINIMAL);
  });
});

/**
 * Differential against the upstream reference implementation, verifying the
 * byte-parity claim in `buildSiwsMessageText`'s doc comment. Backends verify
 * sign-ins with `verifySignIn`, which rebuilds the text with
 * `createSignInMessageText`, so any divergence breaks verification.
 *
 * `@solana/wallet-standard-util` is a devDependency and is never bundled.
 */
describe('buildSiwsMessageText vs createSignInMessageText', () => {
  const address = Keypair.fromSeed(new Uint8Array(32).fill(2)).publicKey.toBase58();
  const domain = 'app.example.com';

  const cases: [string, ResolvedSiwsFields][] = [
    ['minimal', { domain, address }],
    [
      'maximal',
      {
        domain,
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
      },
    ],
    ['non-ASCII statement', { domain, address, statement: 'Ünïcödé ✓ 日本語' }],
    ['single resource', { domain, address, resources: ['https://app.example.com/tos'] }],
    ['statement only', { domain, address, statement: 'Sign in to Example.' }],
    ['fields without statement', { domain, address, nonce: 'RMTMC6f5', version: '1' }],
  ];

  it.each(cases)('matches createSignInMessageText byte-for-byte (%s)', (_name, fields) => {
    expect(buildSiwsMessageText(fields)).toBe(createSignInMessageText(fields));
  });

  // KNOWN DIVERGENCE, deliberately not fixed here: upstream gates the resources
  // block on `if (input.resources)`, so a truthy empty array emits a bare
  // `Resources:` line; this repo gates it on `fields.resources?.length` and emits
  // nothing. Changing `buildSiwsMessageText` is a behavior change outside this
  // commit's scope, so the delta is pinned below and the parity case stays skipped
  // pending a separate decision.
  it.skip('matches createSignInMessageText byte-for-byte (empty resources array)', () => {
    expect(buildSiwsMessageText({ domain, address, resources: [] })).toBe(
      createSignInMessageText({ domain, address, resources: [] }),
    );
  });

  it('pins the exact delta for an empty resources array', () => {
    const fields: ResolvedSiwsFields = { domain, address, resources: [] };

    expect(createSignInMessageText(fields)).toBe(`${buildSiwsMessageText(fields)}\n\nResources:`);
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
      verifyOffchainMessage(result.signedMessage, result.signature, keyPair.publicKey.toBase58() as Address),
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
