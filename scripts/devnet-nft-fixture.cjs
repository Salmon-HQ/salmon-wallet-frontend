#!/usr/bin/env node
/**
 * Devnet NFT fixture for the end-to-end suites: makes sure Wallet A holds a
 * test NFT on Solana devnet, minting one (paid by Wallet B) when it does not.
 *
 * Every e2e flow that views, sends or burns an NFT runs on devnet against this
 * fixture, never against a mainnet collectible. A transfer moves it to Wallet
 * B, so the next run finds none in A and mints another; flows never depend on
 * getting one back.
 *
 *   node scripts/devnet-nft-fixture.cjs            # mint only if A has none
 *   node scripts/devnet-nft-fixture.cjs --force    # mint one regardless
 *
 * Reads SALMON_TEST_SEED_B, SALMON_TEST_WALLET_A_ADDR and
 * SALMON_TEST_WALLET_B_ADDR from the environment — each suite's runner loads
 * its own .env.test. Metaplex is not a frontend dependency, so it is loaded
 * from a salmon-wallet-backend checkout: SALMON_BACKEND_DIR, defaulting to a
 * sibling of this repository. Devnet only; prints mint addresses, never a
 * seed or a key.
 */
const path = require('node:path');
const crypto = require('node:crypto');

const RPC = 'https://api.devnet.solana.com';
/** How the suites recognise the fixture: its on-chain name and symbol. */
const FIXTURE_NAME = 'Salmon Test NFT';
const FIXTURE_SYMBOL = 'STEST';

/** BIP39 mnemonic → SLIP-0010 ed25519 seed at m/44'/501'/0'/0' (the wallet's first account). */
function derive(mnemonic) {
  const seed = crypto.pbkdf2Sync(Buffer.from(mnemonic.normalize('NFKD')), 'mnemonic', 2048, 64, 'sha512');
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
  return key;
}

async function main() {
  const force = process.argv.includes('--force');
  const backend = path.resolve(
    process.env.SALMON_BACKEND_DIR ?? path.join(__dirname, '..', '..', 'salmon-wallet-backend')
  );
  const {
    SALMON_TEST_SEED_B: seedB,
    SALMON_TEST_WALLET_A_ADDR: addrA,
    SALMON_TEST_WALLET_B_ADDR: addrB,
  } = process.env;
  if (!seedB || !addrA || !addrB) {
    throw new Error('SALMON_TEST_SEED_B, SALMON_TEST_WALLET_A_ADDR and SALMON_TEST_WALLET_B_ADDR are required');
  }

  const load = (m) => {
    try {
      return require(require.resolve(m, { paths: [backend] }));
    } catch {
      throw new Error(`${m} not found under ${backend} — set SALMON_BACKEND_DIR to a salmon-wallet-backend checkout`);
    }
  };
  const { createUmi } = load('@metaplex-foundation/umi-bundle-defaults');
  const { generateSigner, keypairIdentity, percentAmount, publicKey } = load('@metaplex-foundation/umi');
  const { mplTokenMetadata, createNft, fetchAllDigitalAsset } = load('@metaplex-foundation/mpl-token-metadata');

  const umi = createUmi(RPC).use(mplTokenMetadata());
  const owner = publicKey(addrA);

  if (!force) {
    const { value } = await umi.rpc.call('getTokenAccountsByOwner', [
      addrA,
      { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
      // `confirmed`, the commitment a mint here is sent with: the default
      // (finalized) misses one minted seconds ago and mints a second.
      { encoding: 'jsonParsed', commitment: 'confirmed' },
    ]);
    const held = value
      .map((a) => a.account.data.parsed.info)
      .filter((info) => info.tokenAmount.decimals === 0 && info.tokenAmount.amount === '1')
      .map((info) => publicKey(info.mint));
    const assets = held.length ? await fetchAllDigitalAsset(umi, held) : [];
    const fixture = assets.find((a) => a.metadata.symbol === FIXTURE_SYMBOL);
    if (fixture) {
      console.log(`Wallet A already holds the devnet fixture: ${fixture.publicKey.toString()}`);
      return;
    }
  }

  const payer = umi.eddsa.createKeypairFromSeed(derive(seedB));
  if (payer.publicKey.toString() !== addrB) {
    throw new Error('the seed does not derive Wallet B — nothing was signed');
  }
  umi.use(keypairIdentity(payer));
  const mint = generateSigner(umi);
  await createNft(umi, {
    mint,
    name: FIXTURE_NAME,
    symbol: FIXTURE_SYMBOL,
    uri: 'https://arweave.net/salmon-devnet-test-nft.json',
    sellerFeeBasisPoints: percentAmount(0),
    tokenOwner: owner,
  }).sendAndConfirm(umi);
  console.log(`minted the devnet fixture to Wallet A: ${mint.publicKey.toString()}`);
}

main().catch((error) => {
  console.error(`devnet NFT fixture FAILED: ${String(error.message).split('\n')[0]}`);
  process.exit(1);
});
