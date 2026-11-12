import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchMerchantDetails,
  fetchMerchantTransaction,
  parseTransactionRequestLink,
  type TransactionRequestLink,
} from './transaction-request';

const LINK: TransactionRequestLink = {
  url: 'https://merchant.example/pay?order=42',
  host: 'merchant.example',
};
const ACCOUNT = 'mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN';

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchMerchantDetails', () => {
  it('asks for JSON with nothing that identifies the user or the wallet', async () => {
    const fetchMock = mockFetch(
      jsonResponse({ label: 'Corner Café', icon: 'https://merchant.example/logo.svg' })
    );

    await fetchMerchantDetails(LINK);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(LINK.url);
    expect(init).toMatchObject({
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      redirect: 'error',
    });
    expect(Object.keys(init?.headers ?? {})).toEqual(['Accept']);
    expect(init?.body).toBeUndefined();
  });

  it('reads the label and icon, and names the domain the link points at', async () => {
    mockFetch(jsonResponse({ label: 'Corner Café', icon: 'https://merchant.example/logo.svg' }));

    expect(await fetchMerchantDetails(LINK)).toEqual({
      label: 'Corner Café',
      icon: 'https://merchant.example/logo.svg',
      iconToRender: 'https://merchant.example/logo.svg',
      domain: 'merchant.example',
    });
  });

  it('accepts an http icon but never renders it', async () => {
    mockFetch(jsonResponse({ label: 'Corner Café', icon: 'http://merchant.example/logo.PNG' }));

    const details = await fetchMerchantDetails(LINK);

    expect(details.icon).toBe('http://merchant.example/logo.PNG');
    expect(details.iconToRender).toBeNull();
  });
});

describe('fetchMerchantTransaction', () => {
  it('posts the account alone to the same address, query kept', async () => {
    const fetchMock = mockFetch(jsonResponse({ transaction: 'AQID' }));

    await fetchMerchantTransaction(LINK, ACCOUNT);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://merchant.example/pay?order=42');
    expect(init).toMatchObject({
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      redirect: 'error',
    });
    expect(init?.body).toBe(`{"account":"${ACCOUNT}"}`);
  });

  it('passes the message through and ignores every other field, redirect included', async () => {
    mockFetch(
      jsonResponse({
        transaction: 'AQID',
        message: 'Thanks for your order #42',
        redirect: 'https://merchant.example/thanks',
        extra: true,
      })
    );

    expect(await fetchMerchantTransaction(LINK, ACCOUNT)).toEqual({
      transaction: 'AQID',
      message: 'Thanks for your order #42',
    });
  });
});

describe('parseTransactionRequestLink', () => {
  it('reads an unencoded link', () => {
    expect(parseTransactionRequestLink('solana:https://merchant.example/pay')).toEqual({
      ok: true,
      link: { url: 'https://merchant.example/pay', host: 'merchant.example' },
    });
  });

  it('decodes a percent-encoded link once and keeps its query string verbatim', () => {
    expect(
      parseTransactionRequestLink(
        'solana:https%3A%2F%2Fmerchant.example%2Fpay%3Forder%3D42%26note%3Da%2520b'
      )
    ).toEqual({
      ok: true,
      link: { url: 'https://merchant.example/pay?order=42&note=a%20b', host: 'merchant.example' },
    });
  });

  it('decodes only once', () => {
    const parsed = parseTransactionRequestLink('solana:https%3A%2F%2Fm.example%2Fpay%3Fx%3D%2541');
    expect(parsed).toEqual({
      ok: true,
      link: { url: 'https://m.example/pay?x=%41', host: 'm.example' },
    });
  });

  it.each([
    ['plain http', 'solana:http://merchant.example/pay'],
    ['encoded http', 'solana:http%3A%2F%2Fmerchant.example%2Fpay'],
    ['an IPv4 literal', 'solana:https://192.168.1.10/pay'],
    ['a numeric IPv4 form', 'solana:https://0x7f.1/pay'],
    ['an IPv6 literal', 'solana:https://[::1]/pay'],
    ['localhost', 'solana:https://localhost/pay'],
    ['a localhost subdomain', 'solana:https://shop.localhost/pay'],
    ['an undecodable percent sequence', 'solana:https%3A%2F%2Fmerchant.example%2Fpay%E0%A4%A'],
    ['no web address at all', 'solana:https%3A'],
    ['not a solana link', 'https://merchant.example/pay'],
  ])('refuses %s as a malformed link', (_, raw) => {
    expect(parseTransactionRequestLink(raw)).toEqual({ ok: false, reason: 'malformedLink' });
  });

  it('shows an international domain as punycode, so a look-alike cannot pass as the real name', () => {
    const parsed = parseTransactionRequestLink('solana:https://bücher.example/pay');
    expect(parsed).toEqual({
      ok: true,
      link: { url: 'https://xn--bcher-kva.example/pay', host: 'xn--bcher-kva.example' },
    });
  });
});
