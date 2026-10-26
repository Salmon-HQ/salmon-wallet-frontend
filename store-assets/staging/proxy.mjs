#!/usr/bin/env node
/**
 * Staging proxy for store screenshots: the app talks to it instead of the
 * production API, and it answers the staged wallets' balance, history and NFTs
 * from `staged.mjs` (Apple 2.3.9 wants fictional account data). Everything else
 * passes through, so prices, charts, token lists and Swap quotes are real.
 *
 * Pass-through GETs are recorded in `cache/` the first time and replayed after,
 * so every run, on every platform and day, shows the same figures. Swap and
 * Powerup builds and the availability switch always go live. Delete `cache/`
 * to record fresh prices.
 *
 *   SALMON_TEST_WALLET_A_ADDR=… [SALMON_SEED_VAULT_ADDR=…] node proxy.mjs
 *   STAGING_REGION=uk …    # Swap switched off for the region (App Store U.K. set)
 *   STAGING_PORT=3900 …    # default
 *
 * The runner in `store-assets/README.md` loads the addresses from the e2e env
 * files; nothing here prints them.
 */
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTFOLIO, SOL, history, nfts, toBase } from './staged.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.STAGING_PORT ?? 3900);
const UPSTREAM =
  process.env.STAGING_UPSTREAM ?? 'https://te4x28v8e0.execute-api.us-east-1.amazonaws.com/prod';
const REGION = process.env.STAGING_REGION ?? 'global';
const WALLETS = [process.env.SALMON_TEST_WALLET_A_ADDR, process.env.SALMON_SEED_VAULT_ADDR].filter(
  Boolean
);
const CACHE = path.join(here, 'cache');
const LIVE = /\/(ft\/swap\/build|powerups\/[^/]+\/build|powerups\/availability)$/;
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

if (WALLETS.length === 0) {
  console.error('Set SALMON_TEST_WALLET_A_ADDR (and SALMON_SEED_VAULT_ADDR for the Seeker set).');
  process.exit(1);
}
mkdirSync(CACHE, { recursive: true });

const mask = (text) => WALLETS.reduce((out, w) => out.replaceAll(w, '<wallet>'), text);

async function upstream(method, pathAndQuery, headers, body) {
  const cacheable = method === 'GET' && !LIVE.test(pathAndQuery.split('?')[0]);
  const file = path.join(CACHE, createHash('sha1').update(pathAndQuery).digest('hex') + '.json');
  if (cacheable && existsSync(file)) return { ...JSON.parse(readFileSync(file, 'utf8')), from: 'cache' };
  const res = await fetch(UPSTREAM + pathAndQuery, { method, headers, body });
  const out = {
    status: res.status,
    type: res.headers.get('content-type') ?? 'application/json',
    body: await res.text(),
  };
  if (cacheable && res.ok) writeFileSync(file, JSON.stringify(out));
  return { ...out, from: cacheable ? 'recorded' : 'live' };
}

const getJson = async (p) => JSON.parse((await upstream('GET', p, { accept: 'application/json' })).body);

async function stagedBalance(owner) {
  return Promise.all(
    PORTFOLIO.map(async (t) => {
      const coin = await getJson(t.mint === SOL ? '/v1/coin/solana' : `/v1/coin/solana/contract/${t.mint}`);
      const price = coin.marketData.currentPrice;
      return {
        owner,
        blockchain: 'solana',
        amount: toBase(t.uiAmount, t.decimals),
        decimals: t.decimals,
        symbol: t.symbol,
        name: t.name,
        type: t.type,
        ...(t.type === 'native' ? {} : { mint: t.mint, tags: ['verified'], logo: coin.image }),
        address: t.mint,
        coingeckoId: coin.id,
        price,
        usdBalance: Number(t.uiAmount) * price,
        priceChange24h: coin.marketData.priceChangePercentage24h,
      };
    })
  );
}

async function staged(method, url) {
  if (method !== 'GET') return null;
  const account = url.pathname.match(/^\/v1\/solana-mainnet\/account\/([^/]+)\/(balance|transactions|stakes)$/);
  if (account && WALLETS.includes(account[1])) {
    const [, owner, what] = account;
    if (what === 'balance') return stagedBalance(owner);
    if (what === 'transactions') return { data: history(owner), meta: { nextPageToken: null, hidden: 0 } };
    // No stake accounts: Home's total is then exactly the sum of the token rows.
    return { ...(await getJson(url.pathname)), data: [] };
  }
  if (url.pathname === '/v1/solana-mainnet/nft' && WALLETS.includes(url.searchParams.get('publicKey'))) {
    return nfts(url.searchParams.get('publicKey'));
  }
  if (REGION === 'uk' && /^\/v1\/solana-mainnet\/powerups\/availability$/.test(url.pathname)) {
    const live = await getJson(url.pathname + url.search);
    live.data = live.data.map((p) => (p.id === 'swap' ? { id: 'swap', enabled: false, reason: 'region' } : p));
    return live;
  }
  return null;
}

function send(res, status, type, body) {
  res.writeHead(status, { ...CORS, 'content-type': type });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, 'text/plain', '');
    // A build that declares SALMON_ENV=local prefixes every route with /local.
    const url = new URL(req.url.replace(/^\/local(?=\/)/, ''), 'http://staging');

    const body = await staged(req.method, url);
    if (body) {
      console.log(`staged   ${req.method} ${mask(url.pathname + url.search)}`);
      return send(res, 200, 'application/json', JSON.stringify(body));
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const headers = Object.fromEntries(
      Object.entries(req.headers).filter(([k]) => !['host', 'connection', 'accept-encoding', 'content-length', 'origin'].includes(k))
    );
    const out = await upstream(req.method, url.pathname + url.search, headers, chunks.length ? Buffer.concat(chunks) : undefined);
    console.log(`${out.from.padEnd(8)} ${req.method} ${mask(url.pathname + url.search)} ${out.status}`);
    send(res, out.status, out.type, out.body);
  } catch (error) {
    console.error(`error    ${req.method} ${mask(req.url)}: ${error.message}`);
    send(res, 502, 'application/json', JSON.stringify({ error: 'staging_proxy', message: error.message }));
  }
}).listen(PORT, () => console.log(`staging proxy on http://localhost:${PORT} (region: ${REGION})`));
