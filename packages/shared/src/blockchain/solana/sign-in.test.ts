import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { describe, expect, it } from 'vitest';
import { Keypair } from '@solana/web3.js';
import { createKeyPairSignerFromPrivateKeyBytes } from '@solana/kit';
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

async function makeAccount() {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const signer = await createKeyPairSignerFromPrivateKeyBytes(seed, false);
  return {
    // Independent of kit, so nacl can cross-check what kit signed.
    publicKeyBytes: bs58.decode(signer.address),
    address: signer.address as string,
    account: {
      signer,
      getReceiveAddress: () => signer.address as string,
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
  /**
   * INTENTIONAL byte change (Fix C): a truthy empty `resources` array now emits
   * a bare `Resources:` header with no bullet lines, matching
   * `createSignInMessageText`'s `if (input.resources)` gate. Previously this
   * repo gated on `.length` and emitted nothing, diverging from upstream — see
   * the differential suite below, which no longer pins that divergence.
   */
  const GOLDEN_SIWS_EMPTY_RESOURCES =
    'YXBwLmV4YW1wbGUuY29tIHdhbnRzIHlvdSB0byBzaWduIGluIHdpdGggeW91ciBTb2xhbmEgYWNjb3VudDoKOWhTUjZTN1dQdHhtVG9qZ282R0czazR5RFBlY2dKWTI5Mmo3eHJzVUdXQnUKClJlc291cmNlczo=';

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

  // A truthy empty `resources` array still emits the `Resources:` header, with
  // no bullet lines under it (Fix C — see GOLDEN_SIWS_EMPTY_RESOURCES above).
  it('pins that an empty resources array emits a bare Resources header', () => {
    const text = buildSiwsMessageText({ domain, address, resources: [] });

    expect(toBase64(text)).toBe(GOLDEN_SIWS_EMPTY_RESOURCES);
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
    ['empty resources array', { domain, address, resources: [] }],
  ];

  it.each(cases)('matches createSignInMessageText byte-for-byte (%s)', (_name, fields) => {
    expect(buildSiwsMessageText(fields)).toBe(createSignInMessageText(fields));
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
  it('signs the raw UTF-8 SIWS text and the signature verifies', async () => {
    const { publicKeyBytes, address, account } = await makeAccount();

    const result = await signSiwsMessage(account as never, { statement: 'Hello' }, ORIGIN);

    expect(result.signedMessageFormat).toBeUndefined();
    expect(new TextDecoder().decode(result.signedMessage)).toBe(result.message);
    expect(result.message).toContain(`app.example.com wants you to sign in`);
    expect(result.message).toContain(address);
    expect(
      nacl.sign.detached.verify(result.signedMessage, result.signature, publicKeyBytes),
    ).toBe(true);
  });

  it('refuses to sign when the dApp claims a different domain (spoof rejection)', async () => {
    const { account } = await makeAccount();
    await expect(
      signSiwsMessage(account as never, { domain: 'evil.example' }, ORIGIN),
    ).rejects.toThrow(SiwsDomainMismatchError);
  });

  it('refuses to sign for an address other than the active account', async () => {
    const { account } = await makeAccount();
    const other = Keypair.generate().publicKey.toBase58();
    await expect(signSiwsMessage(account as never, { address: other }, ORIGIN)).rejects.toThrow(
      /not the active account/,
    );
  });

  it('wraps the message in an OCMS v1 envelope when useOffchainMessage is set (PR#93)', async () => {
    const { address, account } = await makeAccount();

    const result = await signSiwsMessage(
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
    await expect(
      verifyOffchainMessage(result.signedMessage, result.signature, address as Address),
    ).resolves.toBe(true);
  });

  it('rejects unsupported off-chain message versions', async () => {
    const { account } = await makeAccount();
    await expect(
      signSiwsMessage(
        account as never,
        { useOffchainMessage: { messageVersion: 2 as never } },
        ORIGIN,
      ),
    ).rejects.toThrow(/Unsupported off-chain message version/);
  });
});

describe('approveSolanaSignIn', () => {
  it('returns the Wallet-Standard-shaped payload with bs58-encoded bytes', async () => {
    const { publicKeyBytes, address, account } = await makeAccount();

    const payload = await approveSolanaSignIn(account as never, { nonce: 'abcd1234' }, ORIGIN);

    expect(payload.address).toBe(address);
    expect(payload.signatureType).toBe('ed25519');
    expect(payload.signedMessageFormat).toBeUndefined();
    const signedMessage = bs58.decode(payload.signedMessage);
    expect(new TextDecoder().decode(signedMessage)).toContain('Nonce: abcd1234');
    expect(
      nacl.sign.detached.verify(signedMessage, bs58.decode(payload.signature), publicKeyBytes),
    ).toBe(true);
  });

  it('marks the OCMS-envelope path with signedMessageFormat', async () => {
    const { account } = await makeAccount();

    const payload = await approveSolanaSignIn(
      account as never,
      { useOffchainMessage: { messageVersion: 1 } },
      ORIGIN,
    );

    expect(payload.signedMessageFormat).toEqual({ kind: 'offchainMessage', messageVersion: 1 });
    expect(() => parseOffchainMessageV1(bs58.decode(payload.signedMessage))).not.toThrow();
  });
});
