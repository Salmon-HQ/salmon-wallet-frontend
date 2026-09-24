#!/usr/bin/env node
/**
 * Fixture: mint one regular NFT to Wallet A on Solana devnet, paid by Wallet B.
 *
 * The on-chain specs move an NFT A → B → A on devnet. A burn or a stranded
 * transfer during manual testing can leave Wallet A with none; this puts one
 * back. Devnet only — it refuses any other RPC — and it prints only the new
 * mint address, never a seed or a key.
 *
 * Metaplex is not a frontend dependency, so it is loaded from a checkout of
 * salmon-wallet-backend, named by SALMON_BACKEND_DIR:
 *
 *   SALMON_BACKEND_DIR=../salmon-wallet-backend \
 *     node apps/extension/.playwright/scripts/mint-devnet-nft.cjs
 *
 * Reads SALMON_TEST_SEED_B, SALMON_TEST_WALLET_A_ADDR and
 * SALMON_TEST_WALLET_B_ADDR from the suite's .env.test.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RPC = 'https://api.devnet.solana.com';

function loadEnv() {
  const file = path.join(__dirname, '..', '.env.test');
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

/** BIP39 mnemonic → SLIP-0010 ed25519 seed at m/44'/501'/0'/0' (the wallet's first account). */
function derive(mnemonic) {
  const seed = crypto.pbkdf2Sync(Buffer.from(mnemonic.normalize('NFKD')), 'mnemonic', 2048, 64, 'sha512');
  let I = crypto.createHmac('sha512', 'ed25519 seed').update(seed).digest();
  let key = I.subarray(0, 32);
  let chain = I.subarray(32);
  for (const index of [44, 501, 0, 0]) {
    const hardened = (index | 0x80000000) >>> 0;
    const data = Buffer.concat([Buffer.alloc(1), key, Buffer.alloc(4)]);
    data.writeUInt32BE(hardened, 33);
    I = crypto.createHmac('sha512', chain).update(data).digest();
    key = I.subarray(0, 32);
    chain = I.subarray(32);
  }
  return key;
}

async function main() {
  loadEnv();
  const backend = process.env.SALMON_BACKEND_DIR;
  const { SALMON_TEST_SEED_B: seedB, SALMON_TEST_WALLET_A_ADDR: addrA, SALMON_TEST_WALLET_B_ADDR: addrB } =
    process.env;
  if (!backend) throw new Error('SALMON_BACKEND_DIR is not set (a salmon-wallet-backend checkout)');
  if (!seedB || !addrA || !addrB) throw new Error('.env.test is missing SEED_B or a wallet address');

  const load = (m) => require(require.resolve(m, { paths: [path.resolve(backend)] }));
  const { createUmi } = load('@metaplex-foundation/umi-bundle-defaults');
  const { generateSigner, keypairIdentity, percentAmount, publicKey } = load('@metaplex-foundation/umi');
  const { mplTokenMetadata, createNft } = load('@metaplex-foundation/mpl-token-metadata');

  const umi = createUmi(RPC).use(mplTokenMetadata());
  const payer = umi.eddsa.createKeypairFromSeed(derive(seedB));
  if (payer.publicKey.toString() !== addrB) {
    throw new Error('the seed does not derive Wallet B — nothing was signed');
  }
  umi.use(keypairIdentity(payer));

  const mint = generateSigner(umi);
  await createNft(umi, {
    mint,
    name: 'Salmon Test NFT',
    symbol: 'STEST',
    uri: 'https://arweave.net/salmon-devnet-test-nft.json',
    sellerFeeBasisPoints: percentAmount(0),
    tokenOwner: publicKey(addrA),
  }).sendAndConfirm(umi);
  console.log(`minted to Wallet A on devnet: ${mint.publicKey.toString()}`);
}

main().catch((error) => {
  console.error(`FAILED: ${String(error.message).split('\n')[0]}`);
  process.exit(1);
});
