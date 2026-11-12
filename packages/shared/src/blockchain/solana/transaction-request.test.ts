import { describe, expect, it } from 'vitest';
import { parseTransactionRequestLink } from './transaction-request';

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
