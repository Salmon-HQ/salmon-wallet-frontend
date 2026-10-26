// The fictional account every store screenshot shows (Apple 2.3.9). One
// portfolio, one history and one collection for every staged wallet, on every
// platform, so two listings never disagree. Prices are not here: the proxy
// takes them from the live API and replays them from its cache.
import { createHash } from 'node:crypto';

export const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const JUP = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';
const MSOL = 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So';
const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

const TOKENS = {
  [SOL]: { symbol: 'SOL', name: 'Solana', decimals: 9, type: 'native' },
  [USDC]: { symbol: 'USDC', name: 'USDC', decimals: 6, type: 'token' },
  [JUP]: { symbol: 'JUP', name: 'Jupiter', decimals: 6, type: 'token' },
  [MSOL]: { symbol: 'MSOL', name: 'Marinade Staked SOL', decimals: 9, type: 'token' },
  [BONK]: { symbol: 'Bonk', name: 'Bonk', decimals: 5, type: 'token' },
};

export const PORTFOLIO = [
  { mint: SOL, uiAmount: '18.42' },
  { mint: USDC, uiAmount: '1240.5' },
  { mint: JUP, uiAmount: '3150' },
  { mint: MSOL, uiAmount: '4.8' },
  { mint: BONK, uiAmount: '12500000' },
].map((entry) => ({ ...entry, ...TOKENS[entry.mint] }));

/** A decimal string in base units, exactly: no float ever touches an amount. */
export function toBase(uiAmount, decimals) {
  const [whole, frac = ''] = uiAmount.split('.');
  return (whole + frac.padEnd(decimals, '0').slice(0, decimals)).replace(/^0+(?=\d)/, '');
}

// Fixed, so the Activity dates read the same whichever day the deck is shot.
const ANCHOR = Date.parse('2026-10-26T15:00:00Z') / 1000;
const HOUR = 3600;

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(bytes) {
  let n = BigInt('0x' + Buffer.from(bytes).toString('hex'));
  let out = '';
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    out = '1' + out;
  }
  return out;
}

/** A well-formed key or signature derived from a label, so it decodes like a real one. */
const fake = (label, algorithm = 'sha256') => base58(createHash(algorithm).update(label).digest());

// Fictional counterparties.
const ALICE = fake('store-staging:alice');
const MERCHANT = fake('store-staging:merchant');
const FRIEND = fake('store-staging:friend');

const leg = (mint, uiAmount, extra = {}) => ({
  amount: toBase(uiAmount, TOKENS[mint].decimals),
  decimals: TOKENS[mint].decimals,
  symbol: TOKENS[mint].symbol,
  name: TOKENS[mint].name,
  contract: mint,
  ...extra,
});

/** Same shape as `/account/{address}/transactions`, newest first. */
export function history(owner) {
  const rows = [
    { hoursAgo: 3, type: 'receive', inputs: [leg(USDC, '250', { source: MERCHANT })], memo: 'pr_store01' },
    {
      hoursAgo: 20,
      type: 'interaction',
      action: 'swap',
      app: 'Jupiter',
      inputs: [leg(USDC, '150')],
      outputs: [leg(SOL, '1.48')],
    },
    { hoursAgo: 46, type: 'send', outputs: [leg(SOL, '0.75', { destination: FRIEND })] },
    { hoursAgo: 70, type: 'receive', inputs: [leg(SOL, '5', { source: ALICE })] },
    { hoursAgo: 118, type: 'receive', inputs: [leg(JUP, '3150', { source: ALICE })] },
    { hoursAgo: 166, type: 'send', outputs: [leg(USDC, '60', { destination: MERCHANT })] },
  ];
  return rows.map(({ hoursAgo, ...row }, i) => {
    const signature = fake(`store-staging:tx-${i}`, 'sha512');
    const timestamp = ANCHOR - hoursAgo * HOUR;
    return {
      address: owner,
      signature,
      id: signature,
      timestamp,
      status: 'completed',
      ...(row.type === 'receive' ? {} : { fee: { amount: 5000, decimals: 9, symbol: 'SOL' } }),
      inputs: [],
      outputs: [],
      memo: null,
      description: null,
      events: {},
      feePayer: row.type === 'receive' ? (row.inputs[0].source ?? owner) : owner,
      blockTime: timestamp,
      ...row,
    };
  });
}

// The app fetches NFT media over https only, so the artwork is served from
// this repository on GitHub. STAGING_MEDIA_BASE points it at a branch before
// the files reach main.
const MEDIA =
  process.env.STAGING_MEDIA_BASE ??
  'https://raw.githubusercontent.com/Salmon-HQ/salmon-wallet-frontend/main/store-assets/staging/assets/nft';

/** Same shape as `/nft?publicKey=`: Salmon's own artwork. */
export function nfts(owner) {
  const items = [1, 2, 3, 4].map((n) => ({
    mint: fake(`store-staging:nft-${n}`),
    owner,
    name: `Salmon Run #${n}`,
    symbol: 'SRUN',
    uri: `${MEDIA}/salmon-run-${n}.png`,
    description: 'Salmon Run, a collection drawn from the Salmon mark.',
    collection: { name: 'Salmon Run' },
    media: `${MEDIA}/salmon-run-${n}.png`,
    animation: null,
    frozen: false,
    extras: { creators: [], attributes: [], properties: { category: 'image' } },
    spamScore: 0,
    spamReasons: [],
    blacklisted: false,
  }));
  return {
    data: items,
    pagination: {
      total: items.length,
      limit: 50,
      offset: 0,
      hasMore: false,
      nextOffset: null,
      hidden: { spam: 0, fungible: 0 },
    },
  };
}

/** An SKR staking position for `/skr/stake`, over the live share price and APY. */
export function skrStake(live) {
  const day = 86_400_000;
  const anchorMs = ANCHOR * 1000;
  const units = (ui) => toBase(ui, live.decimals);
  return {
    ...live,
    liquid: units('1250'),
    positions: [
      {
        address: fake('store-staging:skr-position'),
        staked: units('25000'),
        earned: units('412.5'),
        guardian: { pool: fake('store-staging:skr-guardian'), name: null, commissionBps: 500, active: true },
        unstaking: null,
        stakedSince: anchorMs - 48 * day,
        history: [2, 9, 16, 23, 30, 37].map((d, i) => ({ at: anchorMs - d * day, earned: units(String(71 - i * 2)) })),
      },
    ],
  };
}
