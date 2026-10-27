#!/usr/bin/env node
/**
 * Staging proxy for store screenshots: the app talks to it instead of the
 * production API, and it answers the staged wallets' balance, history and NFTs
 * (and, for the Seeker deck, an SKR stake) from `staged.mjs` (Apple 2.3.9 wants fictional account data). Everything else
 * passes through, so prices, charts, token lists and Swap quotes are real.
 *
 * Pass-through GETs are recorded in `cache/` the first time and replayed after,
 * so every run, on every platform and day, shows the same figures. Swap and
 * Powerup builds and the availability switch always go live. Delete `cache/`
 * to record fresh prices.
 *
 *   SALMON_TEST_WALLET_A_ADDR=… [SALMON_SEED_VAULT_ADDR=…] node proxy.mjs
 *   STAGING_REGION=uk …    # Swap switched off for the region (App Store U.K. set)
 *   STAGING_REGION=seeker … # an SKR stake on the staged wallets (dApp Store set)
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
import { PORTFOLIO, SOL, USDC, history, nfts, skrStake, toBase } from './staged.mjs';

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
        // The logo prod's `?include=logo` gives native SOL; CoinGecko's is a different mark.
        ...(t.type === 'native'
          ? { logo: 'https://assets-cdn.trustwallet.com/blockchains/solana/info/logo.png' }
          : { mint: t.mint, tags: ['verified'], logo: coin.image }),
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
  // SKR is staged for the Seeker deck only: on the other decks a stake would add
  // a Staking row and change Home's total.
  if (REGION === 'seeker' && url.pathname === '/v1/solana-mainnet/skr/stake' && WALLETS.includes(url.searchParams.get('owner'))) {
    return skrStake(await getJson(url.pathname + url.search));
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

// Printed at start so a capture run begins knowing what the shots will show:
// a token without a logo renders as text, and a live Swap quote that does not
// simulate leaves the Swap shot on an error banner.
async function preflight() {
  const rows = await stagedBalance(WALLETS[0]);
  const noLogo = rows.filter((r) => !r.logo).map((r) => r.symbol);
  const total = rows.reduce((sum, r) => sum + r.usdBalance, 0).toFixed(2);
  console.log(`check    ${rows.length} tokens, $${total}, ${noLogo.length ? `NO LOGO: ${noLogo.join(', ')}` : 'every token with a logo'}`);
  console.log(`check    SKR stake ${REGION === 'seeker' ? 'on' : 'off'}, Swap ${REGION === 'uk' ? 'off for the region' : 'on'}`);
  if (REGION === 'uk' || !process.env.SALMON_TEST_WALLET_A_ADDR) return;
  const q = new URLSearchParams({ inputMint: SOL, outputMint: USDC, publicKey: process.env.SALMON_TEST_WALLET_A_ADDR, uiAmount: '0.01' });
  const out = await upstream('GET', `/v1/solana-mainnet/ft/swap/build?${q}`, { accept: 'application/json' });
  console.log(
    out.status === 200
      ? 'check    a 0.01 SOL Swap quote builds and simulates'
      : `check    SWAP FAILS NOW (${JSON.parse(out.body).error_description ?? out.status}): the Swap shot fails until the router recovers; retake it alone with flows/store/capture-swap.yaml`
  );
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
}).listen(PORT, () => {
  console.log(`staging proxy on http://localhost:${PORT} (region: ${REGION})`);
  preflight().catch((error) => console.error(`check    failed: ${mask(error.message)}`));
});
