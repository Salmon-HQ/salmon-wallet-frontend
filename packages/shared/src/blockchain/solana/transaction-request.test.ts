import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchMerchantDetails,
  fetchMerchantTransaction,
  parseTransactionRequestLink,
  TransactionRequestError,
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
  vi.useRealTimers();
});

/** The refusal a call ends in: its reason and the merchant's words, if any. */
async function refusal(call: Promise<unknown>) {
  try {
    await call;
  } catch (error) {
    expect(error).toBeInstanceOf(TransactionRequestError);
    const { reason, merchantMessage } = error as TransactionRequestError;
    return merchantMessage === undefined ? { reason } : { reason, merchantMessage };
  }
  throw new Error('expected a refusal');
}

function textResponse(body: string | ReadableStream<Uint8Array>, init: ResponseInit = {}) {
  return new Response(body, { status: 200, ...init });
}

/** A response the platform reached after following a redirect to `url`. */
function redirectedTo(url: string, response: Response) {
  Object.defineProperty(response, 'url', { value: url });
  return response;
}

const DETAILS_BODY = { label: 'Corner Café', icon: 'https://merchant.example/logo.svg' };
const OVER_CAP = 64 * 1024 + 1;

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

describe('merchant answers the wallet refuses', () => {
  it('a GET error status is the merchant failing', async () => {
    mockFetch(textResponse('not here', { status: 404 }));
    expect(await refusal(fetchMerchantDetails(LINK))).toEqual({ reason: 'merchantError' });
  });

  it('a GET answer that is not JSON is unreadable', async () => {
    mockFetch(textResponse('<html>hello</html>'));
    expect(await refusal(fetchMerchantDetails(LINK))).toEqual({ reason: 'unreadable' });
  });

  it('an empty label is unreadable', async () => {
    mockFetch(jsonResponse({ label: '  ', icon: 'https://merchant.example/logo.svg' }));
    expect(await refusal(fetchMerchantDetails(LINK))).toEqual({ reason: 'unreadable' });
  });

  it.each([
    ['relative', '/logo.svg'],
    ['a gif', 'https://merchant.example/logo.gif'],
    ['a data address', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],
  ])('a %s icon is malformed, and asking stops there', async (_, icon) => {
    const fetchMock = mockFetch(jsonResponse({ label: 'Corner Café', icon }));
    expect(await refusal(fetchMerchantDetails(LINK))).toEqual({ reason: 'malformedIcon' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a body announced as larger than 64 KiB is unreadable', async () => {
    mockFetch(
      textResponse(JSON.stringify(DETAILS_BODY), {
        headers: { 'Content-Length': String(OVER_CAP) },
      })
    );
    expect(await refusal(fetchMerchantDetails(LINK))).toEqual({ reason: 'unreadable' });
  });

  it('a streamed body that grows past 64 KiB is unreadable', async () => {
    const chunk = new Uint8Array(16 * 1024).fill(0x20);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        // Never ends on its own: only the cap stops the read.
        sent += chunk.length;
        controller.enqueue(chunk);
      },
    });
    mockFetch(textResponse(stream));
    expect(await refusal(fetchMerchantDetails(LINK))).toEqual({ reason: 'unreadable' });
    expect(sent).toBeLessThan(OVER_CAP + 2 * chunk.length);
  });

  it('a merchant that does not answer within 10 seconds is unreachable', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const call = refusal(fetchMerchantDetails(LINK));
    await vi.advanceTimersByTimeAsync(9_999);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(await call).toEqual({ reason: 'unreachable' });
  });

  it('a network error or a CORS refusal (the page cannot tell them apart) is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );
    expect(await refusal(fetchMerchantDetails(LINK))).toEqual({ reason: 'unreachable' });
  });

  it.each([
    ['off https', 'http://merchant.example/pay?order=42'],
    ['to another host', 'https://elsewhere.example/pay'],
  ])('an answer that arrived through a redirect %s is unreachable', async (_, url) => {
    mockFetch(redirectedTo(url, jsonResponse(DETAILS_BODY)));
    expect(await refusal(fetchMerchantDetails(LINK))).toEqual({ reason: 'unreachable' });
  });

  it('a redirect that stays on the same https host is followed', async () => {
    mockFetch(redirectedTo('https://merchant.example/pay/v2', jsonResponse(DETAILS_BODY)));
    expect((await fetchMerchantDetails(LINK)).label).toBe('Corner Café');
  });

  it("a POST error keeps the first 80 characters of the merchant's message", async () => {
    const message = 'x'.repeat(120);
    mockFetch(jsonResponse({ message }, { status: 500 }));
    expect(await refusal(fetchMerchantTransaction(LINK, ACCOUNT))).toEqual({
      reason: 'merchantError',
      merchantMessage: 'x'.repeat(80),
    });
  });

  it('a POST error without a message is the merchant failing, nothing more', async () => {
    mockFetch(textResponse('Internal Server Error', { status: 500 }));
    expect(await refusal(fetchMerchantTransaction(LINK, ACCOUNT))).toEqual({
      reason: 'merchantError',
    });
  });

  it.each([
    ['without a transaction', { message: 'hi' }],
    ['with a transaction that is not text', { transaction: 42 }],
  ])('a POST answer %s is unreadable', async (_, body) => {
    mockFetch(jsonResponse(body));
    expect(await refusal(fetchMerchantTransaction(LINK, ACCOUNT))).toEqual({
      reason: 'unreadable',
    });
  });

  it('every refusal carries its own copy key', () => {
    expect(new TransactionRequestError('missingSignature').message).toBe(
      'solanaPay.errors.missingSignature'
    );
  });
});

describe('on React Native', () => {
  // RN's fetch (whatwg-fetch) turns `cache: 'no-store'` on a GET into an
  // added `_=<time>` query parameter: the merchant must get its link as given.
  it('a GET asks without a cache mode, so the address reaches the merchant unchanged', async () => {
    vi.stubGlobal('navigator', { product: 'ReactNative' });
    const fetchMock = mockFetch(jsonResponse(DETAILS_BODY));

    await fetchMerchantDetails(LINK);

    expect(fetchMock.mock.calls[0][0]).toBe(LINK.url);
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('cache');
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
