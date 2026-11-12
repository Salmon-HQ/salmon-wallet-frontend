#!/usr/bin/env node
/**
 * A devnet test merchant for Solana Pay transaction requests (spec 043).
 * Dev-only: imported by nothing, shipped in nothing.
 *
 * Each route answers the two calls a wallet makes: GET → the merchant's label
 * and icon, POST {"account"} → a base64 transaction for that account. The
 * transaction moves a little devnet SOL from the user to MERCHANT_ADDR with a
 * memo, and a sponsor pays the network fee and signs first; the user's slot is
 * left empty for the wallet.
 *
 *   SALMON_TEST_SEED_B="…" MERCHANT_ADDR=<devnet address> \
 *     PUBLIC_URL=https://<tunnel> [KORA_RPC_URL=http://localhost:8080/] \
 *     node scripts/devnet-solana-pay-merchant.mjs
 *   cloudflared tunnel --url http://localhost:8787   # the wallet takes https only
 *
 * Sponsor: a Kora node when KORA_RPC_URL is set (its `getPayerSigner` address
 * is the fee payer and its `signTransaction` signs), else wallet B, derived
 * from SALMON_TEST_SEED_B the way `devnet-fixtures.cjs` does. Every response
 * carries `Access-Control-Allow-Origin: *`, because the extension fetches from
 * its own origin. Logs each request; prints addresses and links, never a key.
 */
import crypto from 'node:crypto';
import http from 'node:http';
import {
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromPrivateKeyBytes,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase64EncodedWireTransaction,
  partiallySignTransactionMessageWithSigners,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { getAddMemoInstruction } from '@solana-program/memo';
import QRCode from 'qrcode';

const RPC_URL = 'https://api.devnet.solana.com';
const PORT = Number(process.env.PORT ?? 8787);
const PUBLIC_URL = (process.env.PUBLIC_URL ?? `http://localhost:${PORT}`).replace(/\/$/, '');
const KORA_RPC_URL = process.env.KORA_RPC_URL;
const AMOUNT_LAMPORTS = 1_000_000n; // 0.001 SOL
const LABEL = 'Salmon devnet merchant';
const MAX_BODY_BYTES = 4096;

const ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#FF5C45"/><text x="32" y="41" font-size="26" text-anchor="middle" fill="#fff" font-family="sans-serif">SP</text></svg>';

/** BIP39 mnemonic → ed25519 seed at m/44'/501'/0'/0', as `devnet-fixtures.cjs`. */
function derive(mnemonic) {
  const seed = crypto.pbkdf2Sync(
    Buffer.from(mnemonic.normalize('NFKD')),
    'mnemonic',
    2048,
    64,
    'sha512'
  );
  let I = crypto.createHmac('sha512', 'ed25519 seed').update(seed).digest();
  let key = I.subarray(0, 32);
  let chain = I.subarray(32);
  for (const index of [44, 501, 0, 0]) {
    const data = Buffer.concat([Buffer.alloc(1), key, Buffer.alloc(4)]);
    data.writeUInt32BE((index | 0x80000000) >>> 0, 33);
    I = crypto.createHmac('sha512', chain).update(data).digest();
    key = I.subarray(0, 32);
    chain = I.subarray(32);
  }
  return new Uint8Array(key);
}

async function kora(method, params) {
  const response = await fetch(KORA_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const body = await response.json();
  if (body.error) throw new Error(`kora ${method}: ${JSON.stringify(body.error)}`);
  return body.result;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!process.env.MERCHANT_ADDR) fail('Set MERCHANT_ADDR to a devnet address that receives.');
const MERCHANT = address(process.env.MERCHANT_ADDR);

let sponsor;
if (KORA_RPC_URL) {
  // ponytail: field name from Kora's docs (getPayerSigner → signer_address); check it on a live node.
  const { signer_address: signerAddress } = await kora('getPayerSigner', {});
  sponsor = { address: address(signerAddress), signer: createNoopSigner(address(signerAddress)) };
} else {
  if (!process.env.SALMON_TEST_SEED_B) fail('Set SALMON_TEST_SEED_B, or KORA_RPC_URL.');
  const signer = await createKeyPairSignerFromPrivateKeyBytes(
    derive(process.env.SALMON_TEST_SEED_B)
  );
  sponsor = { address: signer.address, signer };
}

const rpc = createSolanaRpc(RPC_URL);
// The blockhash at start: on /pay/stale's first POST it is old (wait two
// minutes after starting), so the wallet must ask again before it signs.
const startBlockhash = (await rpc.getLatestBlockhash().send()).value;
const staleServed = new Set();

/**
 * The user's payment to MERCHANT_ADDR with a memo. By default the sponsor pays
 * the fee and signs first, the user's slot left empty. `payer` replaces the
 * fee payer (a noop signer never signs), `from` replaces who pays the amount,
 * `cosign` adds the sponsor as a memo signer.
 */
async function merchantTransaction(
  account,
  {
    version = 0,
    lamports = AMOUNT_LAMPORTS,
    payer = sponsor.signer,
    from,
    cosign = false,
    blockhash,
  } = {}
) {
  const user = createNoopSigner(address(from ?? account));
  const latestBlockhash = blockhash ?? (await rpc.getLatestBlockhash().send()).value;
  const message = pipe(
    createTransactionMessage({ version }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) =>
      appendTransactionMessageInstructions(
        [
          getTransferSolInstruction({ source: user, destination: MERCHANT, amount: lamports }),
          getAddMemoInstruction(
            {
              memo: `salmon-devnet-${Date.now()}`,
              signers: cosign ? [sponsor.signer] : [],
            },
            // The package defaults to Memo v4, which Salmon's preview does not
            // read; real merchants use SPL Memo v3, so the review stays clean.
            { programAddress: address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') }
          ),
        ],
        m
      )
  );
  const transaction = await partiallySignTransactionMessageWithSigners(message);
  const wire = getBase64EncodedWireTransaction(transaction);
  if (!KORA_RPC_URL || payer !== sponsor.signer) return wire;
  // ponytail: field name from Kora's docs (signTransaction → signed_transaction); check it on a live node.
  const { signed_transaction: signed } = await kora('signTransaction', { transaction: wire });
  return signed;
}

/** A throwaway address: an account nobody will sign for. */
async function stranger() {
  return createNoopSigner((await generateKeyPairSigner()).address);
}

/** The fee payer's signature (the first, after the count byte) with one byte changed. */
function tamper(wire) {
  const bytes = Buffer.from(wire, 'base64');
  bytes[1] ^= 0xff;
  return bytes.toString('base64');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MESSAGE = 'Thanks for testing Salmon';

/**
 * Each route: `get` answers the wallet's GET (default: label and icon),
 * `post` its POST (default: a sponsored payment). `cors: false` answers with
 * no CORS headers at all, as a merchant that never thought of the extension.
 */
const ROUTES = {
  '/pay/sponsored': { post: (account) => merchantTransaction(account, { version: 'legacy' }) },
  '/pay/sponsored-v0': {},
  // Spec 043 US2: each answer the wallet must refuse, nothing signed.
  '/pay/http-error': {
    post: () => ({ status: 500, body: { message: 'Out of stock — test merchant error' } }),
  },
  '/pay/not-json': {
    get: () => ({ status: 200, body: '<html>not json</html>', type: 'text/html' }),
  },
  '/pay/bad-icon': {
    get: () => ({ status: 200, body: { label: LABEL, icon: `${PUBLIC_URL}/icon.gif` } }),
  },
  '/pay/bad-signature': { post: async (account) => tamper(await merchantTransaction(account)) },
  '/pay/missing-sponsor': {
    post: async (account) =>
      merchantTransaction(account, { payer: await stranger(), cosign: true }),
  },
  '/pay/not-for-you': {
    post: async (account) => merchantTransaction(account, { from: (await stranger()).address }),
  },
  // Would fail on chain (more SOL than a test wallet holds): the review opens, held.
  '/pay/fails': {
    post: (account) => merchantTransaction(account, { lamports: 1_000_000_000_000_000n }),
  },
  '/pay/slow': {
    post: async (account) => {
      await sleep(15_000);
      return merchantTransaction(account);
    },
  },
  '/pay/redirect-http': {
    get: () => ({
      status: 302,
      headers: { Location: `http://${new URL(PUBLIC_URL).host}/pay/sponsored` },
    }),
  },
  '/pay/huge': {
    get: () => ({
      status: 200,
      body: { label: LABEL, icon: `${PUBLIC_URL}/icon.svg`, pad: 'x'.repeat(100 * 1024) },
    }),
  },
  '/pay/no-cors': { cors: false },
  // Spec 043 US4: the first POST per account carries the start blockhash;
  // every later POST (the wallet's refresh) a fresh one.
  '/pay/stale': {
    post: (account) => {
      const first = !staleServed.has(account);
      staleServed.add(account);
      return merchantTransaction(account, first ? { blockhash: startBlockhash } : {});
    },
  },
  // Spec 043 US3: no sponsor. The merchant names itself fee payer and signs
  // nothing; the wallet makes the user pay and sets a fresh blockhash.
  '/pay/unsigned': {
    post: (account) => merchantTransaction(account, { payer: createNoopSigner(MERCHANT) }),
  },
  // More SOL than a test wallet holds: confirm stays disabled, "not enough SOL".
  '/pay/unsigned-broke': {
    post: (account) =>
      merchantTransaction(account, {
        payer: createNoopSigner(MERCHANT),
        lamports: 1_000_000_000_000_000n,
      }),
  },
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

function send(res, status, body, { type = 'application/json', cors = true, headers = {} } = {}) {
  res.writeHead(status, { ...(cors ? CORS : {}), 'Content-Type': type, ...headers });
  res.end(typeof body === 'string' ? body : JSON.stringify(body ?? ''));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) reject(new Error('body too large'));
      else chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const body = req.method === 'POST' ? await readBody(req).catch(() => '') : '';
  console.log(
    `${new Date().toISOString()} ${req.method} ${path} origin=${req.headers.origin ?? '-'} ua=${req.headers['user-agent'] ?? '-'}${body ? ` body=${body}` : ''}`
  );

  const route = ROUTES[path];
  const cors = route?.cors !== false;
  if (req.method === 'OPTIONS') return cors ? send(res, 204, '') : send(res, 405, '', { cors });
  if (path === '/icon.svg') return send(res, 200, ICON_SVG, { type: 'image/svg+xml' });
  if (!route) return send(res, 404, { message: 'No such route' });

  if (req.method === 'GET') {
    const answer = route.get?.() ?? {
      status: 200,
      body: { label: LABEL, icon: `${PUBLIC_URL}/icon.svg` },
    };
    return send(res, answer.status, answer.body, {
      type: answer.type,
      headers: answer.headers,
      cors,
    });
  }
  if (req.method !== 'POST') return send(res, 405, { message: 'GET or POST' }, { cors });

  let account;
  try {
    account = JSON.parse(body).account;
    address(account);
  } catch {
    return send(res, 400, { message: 'Send {"account": "<address>"}' }, { cors });
  }
  try {
    const answer = await (route.post ?? merchantTransaction)(account);
    if (typeof answer === 'string') {
      return send(res, 200, { transaction: answer, message: MESSAGE }, { cors });
    }
    return send(res, answer.status, answer.body, { cors });
  } catch (error) {
    console.error(`  ${path}: ${error.message}`);
    return send(res, 500, { message: 'The test merchant could not build the payment' }, { cors });
  }
});

server.listen(PORT, async () => {
  console.log(`Devnet merchant on :${PORT}, public ${PUBLIC_URL}`);
  console.log(
    `Sponsor ${sponsor.address} (${KORA_RPC_URL ? 'Kora' : 'wallet B'}), merchant ${MERCHANT}`
  );
  for (const path of Object.keys(ROUTES)) {
    const link = `solana:${encodeURIComponent(`${PUBLIC_URL}${path}`)}`;
    console.log(`\n${path}\n${link}`);
    console.log(await QRCode.toString(link, { type: 'terminal', small: true }));
  }
  // Refused as malformed before any request: nothing reaches this server.
  console.log(
    `\nhttp link (printed only)\nsolana:http://${new URL(PUBLIC_URL).host}/pay/sponsored`
  );
});
