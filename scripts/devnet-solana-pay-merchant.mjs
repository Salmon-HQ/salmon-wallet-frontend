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

/** The user's payment, fee paid and signed by the sponsor, user slot empty. */
async function sponsoredTransaction(account, version) {
  const user = createNoopSigner(address(account));
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const message = pipe(
    createTransactionMessage({ version }),
    (m) => setTransactionMessageFeePayerSigner(sponsor.signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) =>
      appendTransactionMessageInstructions(
        [
          getTransferSolInstruction({
            source: user,
            destination: MERCHANT,
            amount: AMOUNT_LAMPORTS,
          }),
          getAddMemoInstruction({ memo: `salmon-devnet-${Date.now()}` }),
        ],
        m
      )
  );
  const transaction = await partiallySignTransactionMessageWithSigners(message);
  const wire = getBase64EncodedWireTransaction(transaction);
  if (!KORA_RPC_URL) return wire;
  // ponytail: field name from Kora's docs (signTransaction → signed_transaction); check it on a live node.
  const { signed_transaction: signed } = await kora('signTransaction', { transaction: wire });
  return signed;
}

const ROUTES = {
  '/pay/sponsored': { version: 'legacy', message: 'Thanks for testing Salmon' },
  '/pay/sponsored-v0': { version: 0, message: 'Thanks for testing Salmon (v0)' },
};

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Content-Type': type,
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
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

  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (path === '/icon.svg') return send(res, 200, ICON_SVG, 'image/svg+xml');

  const route = ROUTES[path];
  if (!route) return send(res, 404, { message: 'No such route' });
  if (req.method === 'GET') return send(res, 200, { label: LABEL, icon: `${PUBLIC_URL}/icon.svg` });
  if (req.method !== 'POST') return send(res, 405, { message: 'GET or POST' });

  let account;
  try {
    account = JSON.parse(body).account;
    address(account);
  } catch {
    return send(res, 400, { message: 'Send {"account": "<address>"}' });
  }
  try {
    const transaction = await sponsoredTransaction(account, route.version);
    return send(res, 200, { transaction, message: route.message });
  } catch (error) {
    console.error(`  ${path}: ${error.message}`);
    return send(res, 500, { message: 'The test merchant could not build the payment' });
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
});
