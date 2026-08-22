// Throwaway: re-shoot 04-transactions.png at 430x800 with the staged NFT row
// showing Mindfolk Founder #5154 instead of Mad Lads #8420. Do not commit.
//
// Same harness as store-shots-settings-narrow.mjs: static apps/web/dist on :4173,
// SEED_A recovery, mocks via context.route(), avatar pinned by DOM patch.
// Difference: tx timestamps are rebased onto the wall clock at run time, because
// the mock stores absolute epochs and the relative labels ("2h ago") would
// otherwise drift with every re-shoot.
import fs from 'node:fs';
import path from 'node:path';
import { sleep, SECRETS } from './lib.mjs';
import { chromium } from 'playwright';

const BASE = process.env.SALMON_WEB_URL ?? 'http://localhost:4173';
const MOCK_DIR = process.env.MOCK_DIR;
const OUT_DIR = process.env.OUT_DIR;
const W = 430;
fs.mkdirSync(OUT_DIR, { recursive: true });

const mock = (f) => fs.readFileSync(path.join(MOCK_DIR, f), 'utf8');
const balanceBody = mock('mock-balance.json');
const nftBody = mock('mock-nfts.json');

// Rebase tx timestamps so the rendered labels are 2h / 1d / 2d / 4d / 6d ago,
// padded past each boundary so floor- and round-based formatters agree.
const OFFSETS = [2 * 3600 + 1200, 30 * 3600, 54 * 3600, 102 * 3600, 150 * 3600];
const txJson = JSON.parse(mock('mock-transactions.json'));
const now = Math.floor(Date.now() / 1000);
txJson.data.forEach((tx, i) => {
  tx.timestamp = now - OFFSETS[i];
});
const txBody = JSON.stringify(txJson);
console.log(
  'staged rows:',
  txJson.data.map((t) => `${t.type}:${(t.inputs[0] ?? t.outputs[0])?.symbol}`).join(' ')
);

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({
  viewport: { width: W, height: 800 },
  deviceScaleFactor: 1,
  locale: 'en-US',
});
await ctx.route(/\/v1\/solana-mainnet\/account\/[^/]+\/balance/, (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: balanceBody })
);
await ctx.route(/\/v1\/solana-mainnet\/account\/[^/]+\/transactions(\?|$)/, (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: txBody })
);
await ctx.route(/\/v1\/solana-mainnet\/nft\?/, (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: nftBody })
);

const page = await ctx.newPage();

// onboarding: recover with SEED_A — same identity as 01-home.png
await page.goto(BASE);
await sleep(3000);
const recoverBtn = page.getByTestId('select-recover-button');
if (await recoverBtn.count()) {
  await recoverBtn.click();
  await sleep(1500);
  await page.getByTestId('recover-word-input-1').fill(SECRETS.SALMON_TEST_SEED_A);
  await sleep(500);
  await page.getByTestId('recover-next-button').click({ timeout: 30000 });
  await sleep(1500);
  await page.getByTestId('password-input').fill(SECRETS.SALMON_TEST_PASSWORD);
  await page.getByTestId('password-confirm-input').fill(SECRETS.SALMON_TEST_PASSWORD);
  await page.getByTestId('password-submit-button').click();
  await page
    .getByTestId('analytics-consent-decline')
    .click({ timeout: 60000 })
    .catch(() => {});
  await page
    .getByTestId('success-go-to-wallet-button')
    .click({ timeout: 60000 })
    .catch(() => {});
}
await page.getByTestId('home-screen').waitFor({ state: 'visible', timeout: 30000 });
await sleep(10000);

// activity screen
await page.getByTestId('home-activity-button').click({ timeout: 10000 });
await sleep(6000);

// Recovery assigns a random avatar; pin it to the one 01-home.png uses.
const AVATAR = 'https://static.salmonwallet.io/avatar/08.png';
const stageAvatar = () =>
  page.evaluate((avatar) => {
    let img = 0,
      bg = 0;
    document.querySelectorAll('img').forEach((el) => {
      if (/\/avatar\/\d\d\.png/.test(el.src) && el.src !== avatar) {
        el.src = avatar;
        img++;
      }
    });
    document.querySelectorAll('div').forEach((el) => {
      const b = el.style.backgroundImage || '';
      if (/\/avatar\/\d\d\.png/.test(b) && !b.includes(avatar)) {
        el.style.backgroundImage = `url("${avatar}")`;
        bg++;
      }
    });
    return { img, bg };
  }, AVATAR);
console.log('avatar pass 1:', JSON.stringify(await stageAvatar()));
await sleep(2500);
console.log('avatar pass 2:', JSON.stringify(await stageAvatar()));

// Block on artwork actually being decoded — a pending arweave thumbnail ships as
// a grey placeholder with no other symptom.
await page.waitForFunction(
  () => {
    const imgs = [...document.querySelectorAll('img')];
    return imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0);
  },
  null,
  { timeout: 60000 }
);
console.log(
  'images decoded:',
  await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .map((i) => `${i.naturalWidth}x${i.naturalHeight}`)
      .join(' ')
  )
);
await sleep(2000);

await page.screenshot({ path: path.join(OUT_DIR, '04-transactions.png'), fullPage: false });
console.log('shot 04-transactions.png');

await browser.close();
process.exit(0);
